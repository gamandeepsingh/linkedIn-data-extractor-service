"use client";

import { useState } from "react";
import {
  AlertCircle,
  Award,
  Braces,
  Briefcase,
  Check,
  ChevronDown,
  Clipboard,
  Clock,
  Database,
  FolderGit2,
  GraduationCap,
  Info,
  Languages as LanguagesIcon,
  Layers,
  Network,
  Loader2,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeywordCloud } from "@/components/profile/keyword-cloud";
import { ProfileHeader } from "@/components/profile/profile-header";
import { StatTiles } from "@/components/profile/stat-tiles";
import {
  CertificationList,
  EducationList,
  ExperienceList,
  LanguageList,
  MoreSections,
  ProjectList,
  SkillsList,
} from "@/components/profile/sections";
import type { ProfileResponse } from "@/types/profile";

const SAMPLES = ["gamandeep-singh-344001256"];

export default function Home() {
  const [url, setUrl] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run(target: string) {
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowJson(false);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target, refresh }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? `Request failed with ${res.status}`);
        return;
      }
      setResult(json as ProfileResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyJson(payload: ProfileResponse) {
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const profile = result?.profile;
  const moreCount = profile
    ? profile.honors.length +
      profile.publications.length +
      profile.volunteering.length +
      profile.courses.length
    : 0;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] grid-bg" />

      <main className="container relative max-w-5xl py-12 sm:py-16">
        <header className="mb-8 space-y-3">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            LinkedIn Profile <span className="neon-text">API</span>
          </h1>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            Paste a profile URL and get the whole page back as structured JSON experience,
            education, skills, certifications, languages and more, straight from LinkedIn&apos;s
            internal endpoints. No browser, no HTML scraping.
          </p>
        </header>

        <Card className="mb-6 animate-fade-up p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(url);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/williamhgates/"
                spellCheck={false}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading || !url.trim()} className="sm:w-40">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Fetch profile
                </>
              )}
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={refresh}
                onChange={(e) => setRefresh(e.target.checked)}
                className="h-3.5 w-3.5 accent-black dark:accent-white"
              />
              Bypass cache
            </label>
            <span className="inline-flex flex-wrap items-center gap-1.5">
              Try:
              {SAMPLES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setUrl(sample);
                    run(sample);
                  }}
                  className="rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors hover:border-neon/50 hover:text-neon"
                >
                  {sample}
                </button>
              ))}
            </span>
          </div>
        </Card>

        {error && (
          <Card className="mb-6 animate-fade-up border-destructive/40 bg-destructive/5">
            <CardContent className="flex gap-3 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Request failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {result && profile && !loading && (
          <div className="space-y-5">
            <ProfileHeader profile={profile} />


            <Card className="animate-fade-up">
              <div className="flex items-center gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setShowJson((v) => !v)}
                  className="flex flex-1 items-center gap-2 text-left text-sm font-medium transition-colors hover:text-neon"
                >
                  <Braces className="h-4 w-4 text-neon" />
                  Raw JSON response
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showJson ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyJson(result)}
                  className={copied ? "border-neon/50 text-neon" : ""}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              {showJson && (
                <div className="border-t">
                  <pre className="scrollbar-thin max-h-[520px] overflow-auto p-4 text-xs leading-relaxed">
                    <code>{JSON.stringify(result, null, 2)}</code>
                  </pre>
                </div>
              )}
            </Card>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={result.cached ? "secondary" : "neon"} className="gap-1">
                <Database className="h-3 w-3" />
                {result.cached ? "cached" : "live"}
              </Badge>
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <code className="font-mono">{result.source}</code>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {result.meta.durationMs} ms
              </span>
            </div>


            <StatTiles profile={profile} />

            <KeywordCloud keywords={result.keywords} />

            <Card className="animate-fade-up">
              <CardContent className="p-4">
                <Tabs defaultValue="experience" className="space-y-4">
                  <TabsList>
                    <TabsTrigger
                      value="experience"
                      icon={Briefcase}
                      count={profile.experience.length}
                    >
                      Experience
                    </TabsTrigger>
                    <TabsTrigger
                      value="education"
                      icon={GraduationCap}
                      count={profile.education.length}
                    >
                      Education
                    </TabsTrigger>
                    <TabsTrigger value="skills" icon={Sparkles} count={profile.skills.length}>
                      Skills
                    </TabsTrigger>
                    <TabsTrigger
                      value="certifications"
                      icon={Award}
                      count={profile.certifications.length}
                    >
                      Certifications
                    </TabsTrigger>
                    <TabsTrigger
                      value="languages"
                      icon={LanguagesIcon}
                      count={profile.languages.length}
                    >
                      Languages
                    </TabsTrigger>
                    <TabsTrigger value="projects" icon={FolderGit2} count={profile.projects.length}>
                      Projects
                    </TabsTrigger>
                    <TabsTrigger value="more" icon={Layers} count={moreCount}>
                      More
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="experience">
                    <ExperienceList items={profile.experience} />
                  </TabsContent>
                  <TabsContent value="education">
                    <EducationList items={profile.education} />
                  </TabsContent>
                  <TabsContent value="skills">
                    <SkillsList items={profile.skills} />
                  </TabsContent>
                  <TabsContent value="certifications">
                    <CertificationList items={profile.certifications} />
                  </TabsContent>
                  <TabsContent value="languages">
                    <LanguageList items={profile.languages} />
                  </TabsContent>
                  <TabsContent value="projects">
                    <ProjectList items={profile.projects} />
                  </TabsContent>
                  <TabsContent value="more">
                    <MoreSections
                      honors={profile.honors}
                      publications={profile.publications}
                      volunteering={profile.volunteering}
                      courses={profile.courses}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {result.meta.warnings.length > 0 && (
              <Card className="animate-fade-up">
                <CardContent className="flex gap-3 p-4">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Notes
                    </p>
                    {result.meta.warnings.map((warning, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        {warning}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!result && !loading && !error && (
          <Card className="animate-fade-up border-dashed">
            <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
              <Network className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No profile loaded yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Paste any linkedin.com/in/ URL above, or pick one of the samples to see the full
                structured breakdown.
              </p>
            </CardContent>
          </Card>
        )}

        <footer className="mt-10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <code className="rounded border bg-muted px-1.5 py-0.5">GET /api/profile?url=…</code>
          </span>
          <span>
            <code className="rounded border bg-muted px-1.5 py-0.5">POST /api/profile</code>
          </span>
          <span>
            <code className="rounded border bg-muted px-1.5 py-0.5">GET /api/health</code>
          </span>
        </footer>
      </main>
    </div>
  );
}
