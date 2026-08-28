import type { LinkedInProfile } from "@/types/profile";

export interface Keyword {
  term: string;
  weight: number;
  source: "skill" | "role" | "company" | "text";
}

const STOPWORDS = new Set([
  "at", "in", "on", "of", "to", "by", "as", "is", "it", "or", "an", "be", "we", "do", "if", "so",
  "up", "no", "my", "me", "us", "he", "am", "re", "vs", "et", "la", "de",
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "had", "was", "were", "are",
  "our", "their", "his", "her", "its", "you", "your", "they", "them", "she", "him", "not", "but",
  "all", "any", "can", "will", "would", "should", "could", "into", "over", "under", "more", "most",
  "such", "than", "then", "also", "been", "being", "who", "what", "when", "where", "which", "while",
  "about", "across", "after", "before", "between", "during", "through", "using", "used", "use",
  "work", "working", "worked", "team", "teams", "project", "projects", "company", "companies",
  "experience", "role", "roles", "responsible", "responsibilities", "including", "various", "new",
  "well", "many", "much", "own", "via", "per", "based", "help", "helped", "helping", "build",
  "built", "building", "made", "make", "making", "get", "got", "one", "two", "three", "years",
  "year", "month", "months", "time", "times", "day", "days", "week", "weeks", "high", "low",
  "good", "great", "best", "better", "full", "part", "end", "top", "key", "core", "main", "other",
  "others", "within", "across", "under", "upon", "onto", "out", "off", "how", "why", "may",
  "current", "currently", "present", "ltd", "inc", "llc", "pvt", "private", "limited", "technologies",
  "technology", "solutions", "services", "systems", "software", "india", "remote", "intern",
]);

const CANONICAL: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  node: "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  react: "React",
  reactjs: "React",
  nextjs: "Next.js",
  "next.js": "Next.js",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  aws: "AWS",
  gcp: "GCP",
  devops: "DevOps",
  ci: "CI/CD",
  cd: "CI/CD",
  "ci/cd": "CI/CD",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  docker: "Docker",
  rust: "Rust",
  golang: "Go",
  python: "Python",
  mern: "MERN",
  mean: "MEAN",
  api: "APIs",
  apis: "APIs",
  ml: "Machine Learning",
  ai: "AI",
  llm: "LLMs",
  llms: "LLMs",
  ui: "UI",
  ux: "UX",
  saas: "SaaS",
  sql: "SQL",
  nosql: "NoSQL",
  graphql: "GraphQL",
  rest: "REST",
};

function canonical(token: string) {
  const lower = token.toLowerCase();
  if (CANONICAL[lower]) return CANONICAL[lower];
  if (lower.length <= 3) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/[\s,/]+/)
    .map((t) => t.replace(/^[-.]+|[-.]+$/g, ""))
    .filter((t) => t.length >= 2 && t.length <= 24)
    .filter((t) => !STOPWORDS.has(t))
    .filter((t) => !/^\d+$/.test(t));
}

export function extractKeywords(profile: LinkedInProfile, limit = 24): Keyword[] {
  const scores = new Map<string, { weight: number; source: Keyword["source"] }>();

  const add = (term: string, weight: number, source: Keyword["source"]) => {
    const key = canonical(term);
    const existing = scores.get(key);
    if (existing) {
      existing.weight += weight;
      if (source === "skill") existing.source = "skill";
    } else {
      scores.set(key, { weight, source });
    }
  };

  for (const skill of profile.skills) {
    add(skill.name, 6 + Math.min(skill.endorsementCount ?? 0, 20) / 10, "skill");
  }

  for (const role of profile.experience) {
    if (role.title) for (const token of tokenize(role.title)) add(token, 3, "role");
    if (role.company.name) add(role.company.name, 2.5, "company");
    if (role.description) for (const token of tokenize(role.description)) add(token, 0.5, "text");
  }

  for (const cert of profile.certifications) {
    if (cert.name) for (const token of tokenize(cert.name)) add(token, 2, "text");
  }

  for (const project of profile.projects) {
    if (project.title) for (const token of tokenize(project.title)) add(token, 1.5, "text");
  }

  for (const edu of profile.education) {
    if (edu.fieldOfStudy) for (const token of tokenize(edu.fieldOfStudy)) add(token, 1.5, "text");
  }

  if (profile.headline) for (const token of tokenize(profile.headline)) add(token, 4, "text");
  if (profile.about) for (const token of tokenize(profile.about)) add(token, 0.6, "text");

  return [...scores.entries()]
    .map(([term, { weight, source }]) => ({ term, weight: Math.round(weight * 10) / 10, source }))
    .filter((k) => k.weight >= 1.5)
    .sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term))
    .slice(0, limit);
}
