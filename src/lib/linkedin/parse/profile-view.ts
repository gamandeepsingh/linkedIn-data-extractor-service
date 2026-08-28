import { emptyProfile, type LinkedInProfile } from "@/types/profile";
import { profileUrlFor } from "@/lib/url";
import {
  companyUrlFromUrn,
  describeDuration,
  elementsOf,
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

export function parseProfileView(body: Any, publicId: string): LinkedInProfile {
  const profile = (body.profile ?? {}) as Any;
  const mini = (profile.miniProfile ?? {}) as Any;

  const resolvedPublicId = str(mini.publicIdentifier) ?? publicId;
  const out = emptyProfile(resolvedPublicId, profileUrlFor(resolvedPublicId));

  out.urn = str(mini.entityUrn) ?? str(profile.entityUrn);
  out.memberId = urnId(str(mini.objectUrn));

  out.firstName = str(profile.firstName) ?? str(mini.firstName);
  out.lastName = str(profile.lastName) ?? str(mini.lastName);
  out.fullName = [out.firstName, out.lastName].filter(Boolean).join(" ") || null;

  out.headline = str(profile.headline) ?? str(mini.occupation);
  out.about = str(profile.summary);
  out.industry = str(profile.industryName);

  out.location = {
    text: str(profile.geoLocationName) ?? str(profile.locationName) ?? null,
    country: str(profile.geoCountryName) ?? str(profile.location?.basicLocation?.countryCode),
  };

  out.profilePicture = parseVectorImage(mini.picture);
  out.backgroundImage = parseVectorImage(mini.backgroundImage);

  out.isPremium = typeof mini.premium === "boolean" ? mini.premium : null;
  out.isInfluencer = typeof mini.influencer === "boolean" ? mini.influencer : null;

  out.experience = elementsOf(body.positionView).map(toExperience);
  out.education = elementsOf(body.educationView).map(toEducation);
  out.skills = elementsOf(body.skillView).map(toSkill).filter((s) => s.name.length > 0);
  out.certifications = elementsOf(body.certificationView).map(toCertification);
  out.languages = elementsOf(body.languageView).map((el: Any) => ({
    name: str(el.name),
    proficiency: prettyEnum(str(el.proficiency)),
  }));
  out.projects = elementsOf(body.projectView).map((el: Any) => ({
    title: str(el.title),
    description: str(el.description),
    url: str(el.url),
    dates: parseDateRange(el.timePeriod),
  }));
  out.publications = elementsOf(body.publicationView).map((el: Any) => ({
    name: str(el.name),
    publisher: str(el.publisher),
    description: str(el.description),
    url: str(el.url),
    date: parseDatePart(el.date),
  }));
  out.honors = elementsOf(body.honorView).map((el: Any) => ({
    title: str(el.title),
    issuer: str(el.issuer),
    description: str(el.description),
    date: parseDatePart(el.issueDate),
  }));
  out.volunteering = elementsOf(body.volunteerExperienceView).map((el: Any) => ({
    role: str(el.role),
    organization: str(el.companyName),
    cause: prettyEnum(str(el.cause)),
    description: str(el.description),
    dates: parseDateRange(el.timePeriod),
  }));
  out.courses = elementsOf(body.courseView).map((el: Any) => ({
    name: str(el.name),
    number: str(el.number),
  }));
  out.organizations = elementsOf(body.organizationView).map((el: Any) => ({
    name: str(el.name),
    position: str(el.position),
    description: str(el.description),
    dates: parseDateRange(el.timePeriod),
  }));
  out.patents = elementsOf(body.patentView).map((el: Any) => ({
    title: str(el.title),
    number: str(el.number),
    description: str(el.description),
    url: str(el.url),
    date: parseDatePart(el.issueDate ?? el.filingDate),
  }));
  out.testScores = elementsOf(body.testScoreView).map((el: Any) => ({
    name: str(el.name),
    score: str(el.score),
    description: str(el.description),
    date: parseDatePart(el.date),
  }));

  return out;
}

function toExperience(el: Any) {
  const miniCompany = unwrapUnion<Any>(el.company?.miniCompany) ?? {};
  const dates = parseDateRange(el.timePeriod);

  return {
    title: str(el.title),
    employmentType: prettyEnum(str(el.employmentTypeUrn) ?? str(el.employmentType)),
    company: {
      name: str(el.companyName) ?? str(miniCompany.name),
      urn: str(el.companyUrn) ?? str(miniCompany.entityUrn),
      linkedinUrl: companyUrlFromUrn(
        str(el.companyUrn) ?? str(miniCompany.entityUrn),
        str(miniCompany.universalName),
      ),
      logo: parseVectorImage(miniCompany.logo),
      industry: firstIndustry(el.company),
      staffCountRange: staffRange(el.company?.employeeCountRange),
    },
    location: str(el.locationName) ?? str(el.geoLocationName),
    description: str(el.description),
    dates,
    duration: describeDuration(dates),
    skills: [] as string[],
  };
}

function toEducation(el: Any) {
  const school = unwrapUnion<Any>(el.school) ?? {};
  return {
    schoolName: str(el.schoolName) ?? str(school.schoolName),
    schoolUrn: str(el.schoolUrn) ?? str(school.entityUrn),
    schoolLinkedinUrl: schoolUrlFromUrn(
      str(el.schoolUrn) ?? str(school.entityUrn),
      str(school.universalName),
    ),
    logo: parseVectorImage(school.logo),
    degree: str(el.degreeName),
    fieldOfStudy: str(el.fieldOfStudy),
    grade: str(el.grade),
    activities: str(el.activities),
    description: str(el.description),
    dates: parseDateRange(el.timePeriod),
  };
}

function toSkill(el: Any) {
  return {
    name: str(el.name) ?? "",
    endorsementCount: int(el.endorsementCount),
  };
}

function toCertification(el: Any) {
  return {
    name: str(el.name),
    authority: str(el.authority),
    licenseNumber: str(el.licenseNumber),
    url: str(el.url),
    dates: parseDateRange(el.timePeriod),
  };
}

function firstIndustry(company: Any | undefined) {
  if (!company || !Array.isArray(company.industries)) return null;
  return str(company.industries[0]);
}

function staffRange(range: Any | undefined) {
  if (!range) return null;
  const start = int(range.start);
  const end = int(range.end);
  if (start === null && end === null) return null;
  if (end === null) return `${start}+`;
  return `${start ?? 0}-${end}`;
}

function prettyEnum(value: string | null): string | null {
  if (!value) return null;
  const last = value.includes(":") ? value.split(":").pop()! : value;
  if (!/^[A-Z0-9_]+$/.test(last)) return last;
  const words = last.toLowerCase().split("_").filter(Boolean);
  if (!words.length) return null;
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? ` ${words.slice(1).join(" ")}` : "");
}
