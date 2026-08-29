import { ApiError } from "../errors";
import { env } from "../env";
import type { LinkedInProfile } from "@/types/profile";
import { voyager } from "./client";
import { parseProfileView } from "./parse/profile-view";
import { parseDashProfile } from "./parse/dash";

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

