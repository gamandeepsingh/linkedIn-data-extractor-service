import { emptyProfile, type LinkedInProfile, type ProfileImage } from "@/types/profile";
import { profileUrlFor } from "@/lib/url";
import {
  companyUrlFromUrn,
  describeDuration,
  int,
  parseDatePart,
  parseDateRange,
  parseVectorImage,
  schoolUrlFromUrn,
  str,
  unwrapUnion,
  urnId,
} from "./helpers";

type Any = Record<string, any>;

export function parseDashProfile(body: Any, publicId: string): LinkedInProfile {
  const included: Any[] = Array.isArray(body.included) ? body.included : [];

  const byUrn = new Map<string, Any>();
  const byType = new Map<string, Any[]>();

  for (const entity of included) {
    const urn = str(entity.entityUrn);
    if (urn) byUrn.set(urn, entity);

    const type = shortType(entity.$type);
    if (!type) continue;
    const bucket = byType.get(type);
    if (bucket) bucket.push(entity);
    else byType.set(type, [entity]);
  }

  const profiles = byType.get("Profile") ?? [];
  const profile =
    profiles.find((p) => str(p.publicIdentifier)?.toLowerCase() === publicId.toLowerCase()) ??
    profiles[0] ??
    {};

  const resolvedPublicId = str(profile.publicIdentifier) ?? publicId;
  const out = emptyProfile(resolvedPublicId, profileUrlFor(resolvedPublicId));

  out.urn = str(profile.entityUrn);
  out.memberId = urnId(str(profile.objectUrn));
  out.firstName = str(profile.firstName);
  out.lastName = str(profile.lastName);
  out.fullName = [out.firstName, out.lastName].filter(Boolean).join(" ") || null;
  out.headline = str(profile.headline);
  out.about = str(profile.summary);

  out.location = {
    text:
      str(profile.geoLocationName) ??
      str(profile.locationName) ??
      resolveGeo(profile.geoLocation, byUrn),
    country: str(profile.geoCountryName) ?? null,
  };
  out.industry = resolveIndustry(profile, byUrn);

  out.profilePicture = pickImage(profile.profilePicture);
  out.backgroundImage = pickImage(profile.backgroundPicture ?? profile.backgroundImage);

  out.isPremium = boolOrNull(profile.premium);
  out.isInfluencer = boolOrNull(profile.influencer);
  out.isOpenToWork = boolOrNull(profile.openToWork);
  out.isHiring = boolOrNull(profile.hiring);

  const ownUrn = out.urn;
  const mine = (entity: Any) => !ownUrn || !entity["*profile"] || entity["*profile"] === ownUrn;

  out.experience = (byType.get("Position") ?? []).filter(mine).map((el) => {
    const company = resolveRef(el["*company"] ?? el.companyUrn, byUrn);
    const dates = parseDateRange(el.dateRange ?? el.timePeriod);
    return {
      title: str(el.title),
      employmentType: str(el.employmentType) ?? prettyEnum(str(el.employmentTypeUrn)),
      company: {
        name: str(el.companyName) ?? str(company?.name),
        urn: str(el["*company"]) ?? str(el.companyUrn) ?? str(company?.entityUrn),
        linkedinUrl: companyUrlFromUrn(
          str(el["*company"]) ?? str(el.companyUrn),
          str(company?.universalName),
        ),
        logo: pickImage(company?.logo),
        industry: null,
        staffCountRange: null,
      },
      location: str(el.locationName) ?? str(el.geoLocationName),
      description: str(el.description),
      dates,
      duration: str(el.duration) ?? describeDuration(dates),
      skills: [],
    };
  });

  out.education = (byType.get("Education") ?? []).filter(mine).map((el) => {
    const school = resolveRef(el["*school"] ?? el.schoolUrn, byUrn);
    return {
      schoolName: str(el.schoolName) ?? str(school?.name),
      schoolUrn: str(el["*school"]) ?? str(el.schoolUrn) ?? str(school?.entityUrn),
      schoolLinkedinUrl: schoolUrlFromUrn(
        str(el["*school"]) ?? str(el.schoolUrn),
        str(school?.universalName),
      ),
      logo: pickImage(school?.logo),
      degree: str(el.degreeName),
      fieldOfStudy: str(el.fieldOfStudy),
      grade: str(el.grade),
      activities: str(el.activities),
      description: str(el.description),
      dates: parseDateRange(el.dateRange ?? el.timePeriod),
    };
  });

  out.skills = (byType.get("Skill") ?? [])
    .filter(mine)
    .map((el) => ({ name: str(el.name) ?? "", endorsementCount: int(el.endorsementCount) }))
    .filter((s) => s.name.length > 0);

  out.certifications = (byType.get("Certification") ?? []).filter(mine).map((el) => ({
    name: str(el.name),
    authority: str(el.authority) ?? str(resolveRef(el["*company"], byUrn)?.name),
    licenseNumber: str(el.licenseNumber),
    url: str(el.url),
    dates: parseDateRange(el.dateRange ?? el.timePeriod),
  }));

  out.languages = (byType.get("Language") ?? []).filter(mine).map((el) => ({
    name: str(el.name),
    proficiency: prettyEnum(str(el.proficiency)),
  }));

  out.projects = (byType.get("Project") ?? []).filter(mine).map((el) => ({
    title: str(el.title),
    description: str(el.description),
    url: str(el.url),
    dates: parseDateRange(el.dateRange ?? el.timePeriod),
  }));

  out.publications = (byType.get("Publication") ?? []).filter(mine).map((el) => ({
    name: str(el.name),
    publisher: str(el.publisher),
    description: str(el.description),
    url: str(el.url),
    date: parseDatePart(el.publishedOn ?? el.date),
  }));

  out.honors = (byType.get("Honor") ?? []).filter(mine).map((el) => ({
    title: str(el.title),
    issuer: str(el.issuer),
    description: str(el.description),
    date: parseDatePart(el.issuedOn ?? el.issueDate),
  }));

  out.volunteering = (byType.get("VolunteerExperience") ?? []).filter(mine).map((el) => ({
    role: str(el.role),
    organization: str(el.companyName) ?? str(resolveRef(el["*company"], byUrn)?.name),
    cause: prettyEnum(str(el.cause)),
    description: str(el.description),
    dates: parseDateRange(el.dateRange ?? el.timePeriod),
  }));

  out.courses = (byType.get("Course") ?? []).filter(mine).map((el) => ({
    name: str(el.name),
    number: str(el.number),
  }));

  out.organizations = (byType.get("Organization") ?? []).filter(mine).map((el) => ({
    name: str(el.name),
    position: str(el.position),
    description: str(el.description),
    dates: parseDateRange(el.dateRange ?? el.timePeriod),
  }));

  out.patents = (byType.get("Patent") ?? []).filter(mine).map((el) => ({
    title: str(el.title),
    number: str(el.number),
    description: str(el.description),
    url: str(el.url),
    date: parseDatePart(el.issuedOn ?? el.filedOn),
  }));

  out.testScores = (byType.get("TestScore") ?? []).filter(mine).map((el) => ({
    name: str(el.name),
    score: str(el.score),
    description: str(el.description),
    date: parseDatePart(el.dateOn ?? el.date),
  }));

  return out;
}

function shortType(type: unknown): string | null {
  const value = str(type);
  if (!value) return null;
  return value.split(".").pop() ?? null;
}

function resolveRef(urn: unknown, byUrn: Map<string, Any>): Any | null {
  const key = str(urn);
  if (!key) return null;
  return byUrn.get(key) ?? null;
}

function resolveGeo(geo: unknown, byUrn: Map<string, Any>): string | null {
  const direct = unwrapUnion<Any>(geo);
  if (direct?.defaultLocalizedName) return str(direct.defaultLocalizedName);

  const ref = resolveRef(direct?.["*geo"] ?? geo, byUrn);
  return str(ref?.defaultLocalizedName) ?? null;
}

function resolveIndustry(profile: Any, byUrn: Map<string, Any>): string | null {
  if (Array.isArray(profile["*industry"]) && profile["*industry"].length) {
    return str(resolveRef(profile["*industry"][0], byUrn)?.name);
  }
  return str(profile.industryName) ?? str(resolveRef(profile["*industry"], byUrn)?.name);
}

function pickImage(input: unknown): ProfileImage | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Any;

  return (
    parseVectorImage(obj) ??
    parseVectorImage(obj.displayImageReference) ??
    parseVectorImage(obj.displayImageReference?.vectorImage) ??
    parseVectorImage(obj.vectorImage) ??
    parseVectorImage(obj.image) ??
    null
  );
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function prettyEnum(value: string | null): string | null {
  if (!value) return null;
  const last = value.includes(":") ? value.split(":").pop()! : value;
  if (!/^[A-Z0-9_]+$/.test(last)) return last;
  const words = last.toLowerCase().split("_").filter(Boolean);
  if (!words.length) return null;
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? ` ${words.slice(1).join(" ")}` : "");
}
