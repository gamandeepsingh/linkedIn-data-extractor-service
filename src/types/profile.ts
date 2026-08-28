export interface DatePart {
  month: number | null;
  year: number | null;
}

export interface DateRange {
  start: DatePart | null;
  end: DatePart | null;
  text: string | null;
  isCurrent: boolean;
}

export interface ImageVariant {
  url: string;
  width: number | null;
  height: number | null;
}

export interface ProfileImage {
  url: string;
  variants: ImageVariant[];
}

export interface Company {
  name: string | null;
  urn: string | null;
  linkedinUrl: string | null;
  logo: ProfileImage | null;
  industry: string | null;
  staffCountRange: string | null;
}

export interface Experience {
  title: string | null;
  employmentType: string | null;
  company: Company;
  location: string | null;
  description: string | null;
  dates: DateRange;
  duration: string | null;
  skills: string[];
}

export interface Education {
  schoolName: string | null;
  schoolUrn: string | null;
  schoolLinkedinUrl: string | null;
  logo: ProfileImage | null;
  degree: string | null;
  fieldOfStudy: string | null;
  grade: string | null;
  activities: string | null;
  description: string | null;
  dates: DateRange;
}

export interface Skill {
  name: string;
  endorsementCount: number | null;
}

export interface Certification {
  name: string | null;
  authority: string | null;
  licenseNumber: string | null;
  url: string | null;
  dates: DateRange;
}

export interface Language {
  name: string | null;
  proficiency: string | null;
}

export interface Project {
  title: string | null;
  description: string | null;
  url: string | null;
  dates: DateRange;
}

export interface Publication {
  name: string | null;
  publisher: string | null;
  description: string | null;
  url: string | null;
  date: DatePart | null;
}

export interface Honor {
  title: string | null;
  issuer: string | null;
  description: string | null;
  date: DatePart | null;
}

export interface VolunteerExperience {
  role: string | null;
  organization: string | null;
  cause: string | null;
  description: string | null;
  dates: DateRange;
}

export interface Course {
  name: string | null;
  number: string | null;
}

export interface Organization {
  name: string | null;
  position: string | null;
  description: string | null;
  dates: DateRange;
}

export interface Patent {
  title: string | null;
  number: string | null;
  description: string | null;
  url: string | null;
  date: DatePart | null;
}

export interface TestScore {
  name: string | null;
  score: string | null;
  description: string | null;
  date: DatePart | null;
}

export interface ContactInfo {
  emailAddress: string | null;
  phoneNumbers: { number: string; type: string | null }[];
  websites: { url: string; label: string | null }[];
  twitterHandles: string[];
  birthDate: DatePart | null;
  address: string | null;
}

export interface LinkedInProfile {
  publicIdentifier: string;
  profileUrl: string;
  urn: string | null;
  memberId: string | null;

  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  headline: string | null;
  about: string | null;

  location: {
    text: string | null;
    country: string | null;
  };
  industry: string | null;
  isPremium: boolean | null;
  isInfluencer: boolean | null;
  isOpenToWork: boolean | null;
  isHiring: boolean | null;

  profilePicture: ProfileImage | null;
  backgroundImage: ProfileImage | null;

  connections: number | null;
  followers: number | null;

  contact: ContactInfo | null;

  experience: Experience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  languages: Language[];
  projects: Project[];
  publications: Publication[];
  honors: Honor[];
  volunteering: VolunteerExperience[];
  courses: Course[];
  organizations: Organization[];
  patents: Patent[];
  testScores: TestScore[];
}

export interface ProfileResponse {
  success: true;
  cached: boolean;
  fetchedAt: string;
  source: string;
  keywords: { term: string; weight: number; source: "skill" | "role" | "company" | "text" }[];
  meta: {
    durationMs: number;
    warnings: string[];
  };
  profile: LinkedInProfile;
}

export function emptyProfile(publicId: string, profileUrl: string): LinkedInProfile {
  return {
    publicIdentifier: publicId,
    profileUrl,
    urn: null,
    memberId: null,
    firstName: null,
    lastName: null,
    fullName: null,
    headline: null,
    about: null,
    location: { text: null, country: null },
    industry: null,
    isPremium: null,
    isInfluencer: null,
    isOpenToWork: null,
    isHiring: null,
    profilePicture: null,
    backgroundImage: null,
    connections: null,
    followers: null,
    contact: null,
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    projects: [],
    publications: [],
    honors: [],
    volunteering: [],
    courses: [],
    organizations: [],
    patents: [],
    testScores: [],
  };
}
