import { ApiError } from "../errors";
import { env } from "../env";
import type { ContactInfo, LinkedInProfile } from "@/types/profile";
import { voyager } from "./client";
import { parseProfileView } from "./parse/profile-view";
import { parseDashProfile } from "./parse/dash";
import { int, parseDatePart, str } from "./parse/helpers";

type Any = Record<string, any>;

export interface FetchResult {
  profile: LinkedInProfile;
  source: string;
  warnings: string[];
}

interface Strategy {
  name: string;
  run: (publicId: string) => Promise<LinkedInProfile | null>;
}

const strategies: Strategy[] = [
  {
    name: "voyager:dash:memberIdentity",
    async run(publicId) {
      const res = await voyager<Any>({
        path: "/identity/dash/profiles",
        query: {
          q: "memberIdentity",
          memberIdentity: publicId,
          decorationId: "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-101",
        },
      });
      if (res.status === 404) return null;
      const parsed = parseDashProfile(res.body, publicId);
      return isUsable(parsed) ? parsed : null;
    },
  },
  {
    name: "voyager:profileView",
    async run(publicId) {
      const res = await voyager<Any>({
        path: `/identity/profiles/${encodeURIComponent(publicId)}/profileView`,
        normalized: false,
      });
      if (res.status === 404) return null;
      if (!res.body?.profile) return null;
      return parseProfileView(res.body, publicId);
    },
  },
  {
    name: "voyager:graphql:vanityName",
    async run(publicId) {
      if (!env.graphqlQueryId) return null;
      const res = await voyager<Any>({
        path: "/graphql",
        rawQuery: `variables=(vanityName:${publicId})&queryId=${env.graphqlQueryId}`,
      });
      if (res.status === 404) return null;
      const parsed = parseDashProfile(res.body, publicId);
      return isUsable(parsed) ? parsed : null;
    },
  },
];

export async function fetchProfile(publicId: string): Promise<FetchResult> {
  const warnings: string[] = [];
  const failures: string[] = [];

  for (const strategy of strategies) {
    try {
      const profile = await strategy.run(publicId);
      if (!profile) {
        failures.push(`${strategy.name}: no data`);
        continue;
      }
      if (!isUsable(profile)) {
        failures.push(`${strategy.name}: empty profile`);
        continue;
      }

      await enrich(publicId, profile, warnings);
      if (failures.length) {
        warnings.push(`Fell back after: ${failures.join("; ")}`);
      }
      return { profile, source: strategy.name, warnings };
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === "LINKEDIN_AUTH_FAILED" ||
          err.code === "LINKEDIN_BLOCKED" ||
          err.code === "NOT_CONFIGURED")
      ) {
        throw err;
      }
      failures.push(`${strategy.name}: ${(err as Error).message}`);
    }
  }

  throw new ApiError(
    "PROFILE_NOT_FOUND",
    `Could not retrieve a profile for "${publicId}". It may not exist, or it may not be visible to the logged-in account.`,
    { attempts: failures },
  );
}

function isUsable(profile: LinkedInProfile) {
  return Boolean(
    profile.fullName ||
      profile.headline ||
      profile.about ||
      profile.experience.length ||
      profile.education.length,
  );
}

async function enrich(publicId: string, profile: LinkedInProfile, warnings: string[]) {
  const results = await Promise.allSettled([
    fetchContactInfo(publicId),
    fetchNetworkInfo(publicId),
    fetchSkills(publicId),
  ]);

  const [contact, network, skills] = results;

  if (contact.status === "fulfilled") {
    if (contact.value) profile.contact = contact.value;
  } else {
    warnings.push(`contact info unavailable: ${reason(contact)}`);
  }

  if (network.status === "fulfilled") {
    if (network.value) {
      profile.connections = network.value.connections;
      profile.followers = network.value.followers;
    }
  } else {
    warnings.push(`network info unavailable: ${reason(network)}`);
  }

  if (skills.status === "fulfilled") {
    if (skills.value?.length) profile.skills = mergeSkills(profile.skills, skills.value);
  } else {
    warnings.push(`skills endpoint unavailable: ${reason(skills)}`);
  }
}

async function fetchContactInfo(publicId: string): Promise<ContactInfo | null> {
  const res = await voyager<Any>({
    path: `/identity/profiles/${encodeURIComponent(publicId)}/profileContactInfo`,
    normalized: false,
  });
  const body = res.body;
  if (!body || typeof body !== "object") return null;

  const websites = Array.isArray(body.websites)
    ? body.websites
        .map((site: Any) => {
          const url = str(site.url);
          if (!url) return null;
          const type = site.type ?? {};
          const category =
            type["com.linkedin.voyager.identity.profile.StandardWebsite"]?.category ??
            type["com.linkedin.voyager.identity.profile.CustomWebsite"]?.label;
          return { url, label: str(category) };
        })
        .filter(Boolean)
    : [];

  const phoneNumbers = Array.isArray(body.phoneNumbers)
    ? body.phoneNumbers
        .map((phone: Any) => {
          const number = str(phone.number);
          if (!number) return null;
          return { number, type: str(phone.type) };
        })
        .filter(Boolean)
    : [];

  const twitterHandles = Array.isArray(body.twitterHandles)
    ? (body.twitterHandles.map((t: Any) => str(t.name)).filter(Boolean) as string[])
    : [];

  return {
    emailAddress: str(body.emailAddress),
    phoneNumbers: phoneNumbers as ContactInfo["phoneNumbers"],
    websites: websites as ContactInfo["websites"],
    twitterHandles,
    birthDate: parseDatePart(body.birthDateOn ?? body.birthDate),
    address: str(body.address),
  };
}

async function fetchNetworkInfo(publicId: string) {
  const res = await voyager<Any>({
    path: `/identity/profiles/${encodeURIComponent(publicId)}/networkinfo`,
    normalized: false,
  });
  const body = res.body;
  if (!body || typeof body !== "object") return null;

  return {
    connections: int(body.connectionsCount),
    followers: int(body.followersCount ?? body.followerCount),
  };
}

async function fetchSkills(publicId: string) {
  const res = await voyager<Any>({
    path: `/identity/profiles/${encodeURIComponent(publicId)}/skills`,
    query: { count: 100, start: 0 },
    normalized: false,
  });

  const elements = Array.isArray(res.body?.elements) ? res.body.elements : [];
  return elements
    .map((el: Any) => ({
      name: str(el.name) ?? "",
      endorsementCount: int(el.endorsementCount ?? el.endorsementCountValue),
    }))
    .filter((s: Any) => s.name.length > 0);
}

function mergeSkills(existing: LinkedInProfile["skills"], fetched: LinkedInProfile["skills"]) {
  const merged = new Map<string, LinkedInProfile["skills"][number]>();
  for (const skill of [...existing, ...fetched]) {
    const key = skill.name.toLowerCase();
    const current = merged.get(key);
    if (!current) {
      merged.set(key, skill);
    } else if (current.endorsementCount === null && skill.endorsementCount !== null) {
      merged.set(key, skill);
    }
  }
  return [...merged.values()];
}

function reason(result: PromiseRejectedResult) {
  return result.reason instanceof Error ? result.reason.message : String(result.reason);
}
