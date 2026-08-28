"use client";

import {
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  GraduationCap,
  HeartHandshake,
  Languages as LanguagesIcon,
  MapPin,
  Trophy,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { proxyImage } from "@/lib/image";
import type {
  Certification,
  Course,
  DateRange,
  Education,
  Experience,
  Honor,
  Language,
  Project,
  ProfileImage,
  Publication,
  Skill,
  VolunteerExperience,
} from "@/types/profile";

function Logo({ image, fallback }: { image: ProfileImage | null; fallback: React.ReactNode }) {
  const [failed, setFailed] = React.useState(false);
  const src = proxyImage(image?.url);

  if (!src || failed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
        {fallback}
      </div>
    );
  }

  return (
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function Dates({ dates, duration }: { dates: DateRange; duration?: string | null }) {
  if (!dates.text && !duration) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {dates.text && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {dates.text}
        </span>
      )}
      {duration && (
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium tabular-nums">{duration}</span>
      )}
      {dates.isCurrent && (
        <span className="inline-flex items-center gap-1 text-neon">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon" />
          </span>
          Current
        </span>
      )}
    </div>
  );
}

function TimelineItem({
  children,
  last,
  index,
}: {
  children: React.ReactNode;
  last: boolean;
  index: number;
}) {
  return (
    <li
      style={{ animationDelay: `${index * 60}ms` }}
      className="relative flex animate-fade-up gap-4 pb-6 last:pb-0"
    >
      {!last && <span className="absolute left-[21px] top-12 h-[calc(100%-3rem)] w-px bg-border" />}
      {children}
    </li>
  );
}

export function EmptySection({ label }: { label: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-1 border-dashed p-10 text-center">
      <p className="text-sm font-medium">No {label} found</p>
      <p className="text-xs text-muted-foreground">
        Either the member has not listed any, or LinkedIn withheld this section from the session.
      </p>
    </Card>
  );
}

export function ExperienceList({ items }: { items: Experience[] }) {
  if (!items.length) return <EmptySection label="positions" />;

  return (
    <ol className="mt-1">
      {items.map((role, index) => (
        <TimelineItem key={index} index={index} last={index === items.length - 1}>
          <Logo image={role.company.logo} fallback={<Building2 className="h-5 w-5" />} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h4 className="font-medium leading-tight">{role.title ?? "Unknown role"}</h4>
              {role.employmentType && (
                <Badge variant="secondary" className="text-[10px]">
                  {role.employmentType}
                </Badge>
              )}
            </div>

            {role.company.name && (
              <p className="text-sm text-muted-foreground">
                {role.company.linkedinUrl ? (
                  <a
                    href={role.company.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-neon"
                  >
                    {role.company.name}
                  </a>
                ) : (
                  role.company.name
                )}
                {role.company.staffCountRange && (
                  <span className="text-xs"> · {role.company.staffCountRange} employees</span>
                )}
              </p>
            )}

            <Dates dates={role.dates} duration={role.duration} />

            {role.location && (
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {role.location}
              </p>
            )}

            {role.description && (
              <p className="whitespace-pre-line text-pretty text-sm leading-relaxed text-muted-foreground">
                {role.description}
              </p>
            )}
          </div>
        </TimelineItem>
      ))}
    </ol>
  );
}

export function EducationList({ items }: { items: Education[] }) {
  if (!items.length) return <EmptySection label="education" />;

  return (
    <ol className="mt-1">
      {items.map((edu, index) => (
        <TimelineItem key={index} index={index} last={index === items.length - 1}>
          <Logo image={edu.logo} fallback={<GraduationCap className="h-5 w-5" />} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h4 className="font-medium leading-tight">{edu.schoolName ?? "Unknown school"}</h4>
            {(edu.degree || edu.fieldOfStudy) && (
              <p className="text-sm text-muted-foreground">
                {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
              </p>
            )}
            <Dates dates={edu.dates} />
            {edu.grade && (
              <Badge variant="outline" className="text-[10px]">
                Grade: {edu.grade}
              </Badge>
            )}
            {edu.activities && (
              <p className="text-sm text-muted-foreground">{edu.activities}</p>
            )}
            {edu.description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {edu.description}
              </p>
            )}
          </div>
        </TimelineItem>
      ))}
    </ol>
  );
}

export function SkillsList({ items }: { items: Skill[] }) {
  if (!items.length) return <EmptySection label="skills" />;

  const max = Math.max(...items.map((s) => s.endorsementCount ?? 0), 1);
  const hasEndorsements = items.some((s) => s.endorsementCount !== null);

  if (!hasEndorsements) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((skill, index) => (
          <Badge
            key={skill.name}
            variant="outline"
            style={{ animationDelay: `${index * 20}ms` }}
            className="animate-fade-up px-2.5 py-1 text-xs transition-colors hover:border-neon/50 hover:text-neon"
          >
            {skill.name}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {items.map((skill, index) => {
        const count = skill.endorsementCount ?? 0;
        return (
          <div
            key={skill.name}
            style={{ animationDelay: `${index * 25}ms` }}
            className="animate-fade-up space-y-1.5 rounded-lg border p-3 transition-colors hover:border-neon/40"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{skill.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {skill.endorsementCount === null ? "—" : count}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-neon transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max((count / max) * 100, count ? 6 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CertificationList({ items }: { items: Certification[] }) {
  if (!items.length) return <EmptySection label="certifications" />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((cert, index) => (
        <Card
          key={index}
          style={{ animationDelay: `${index * 45}ms` }}
          className="animate-fade-up p-4 transition-colors hover:border-neon/40"
        >
          <div className="flex gap-3">
            <Award className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <h4 className="text-sm font-medium leading-tight">{cert.name ?? "Certification"}</h4>
              {cert.authority && (
                <p className="text-xs text-muted-foreground">{cert.authority}</p>
              )}
              <Dates dates={cert.dates} />
              {cert.licenseNumber && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  ID {cert.licenseNumber}
                </p>
              )}
              {cert.url && (
                <a
                  href={cert.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-neon hover:opacity-70"
                >
                  <ExternalLink className="h-3 w-3" />
                  Credential
                </a>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

const PROFICIENCY_LEVEL: Record<string, number> = {
  "Elementary": 1,
  "Limited working": 2,
  "Professional working": 3,
  "Full professional": 4,
  "Native or bilingual": 5,
};

export function LanguageList({ items }: { items: Language[] }) {
  if (!items.length) return <EmptySection label="languages" />;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((language, index) => {
        const level = PROFICIENCY_LEVEL[language.proficiency ?? ""] ?? 0;
        return (
          <Card
            key={index}
            style={{ animationDelay: `${index * 45}ms` }}
            className="animate-fade-up space-y-2 p-4 transition-colors hover:border-neon/40"
          >
            <div className="flex items-center gap-2">
              <LanguagesIcon className="h-4 w-4 text-neon" />
              <span className="text-sm font-medium">{language.name ?? "Unknown"}</span>
            </div>
            {language.proficiency && (
              <p className="text-xs text-muted-foreground">{language.proficiency}</p>
            )}
            {level > 0 && (
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < level ? "bg-neon" : "bg-muted",
                    )}
                  />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function ProjectList({ items }: { items: Project[] }) {
  if (!items.length) return <EmptySection label="projects" />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((project, index) => (
        <Card
          key={index}
          style={{ animationDelay: `${index * 45}ms` }}
          className="animate-fade-up space-y-2 p-4 transition-colors hover:border-neon/40"
        >
          <h4 className="text-sm font-medium leading-tight">{project.title ?? "Project"}</h4>
          <Dates dates={project.dates} />
          {project.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {project.description}
            </p>
          )}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-neon hover:opacity-70"
            >
              <ExternalLink className="h-3 w-3" />
              View project
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}

export function MoreSections({
  honors,
  publications,
  volunteering,
  courses,
}: {
  honors: Honor[];
  publications: Publication[];
  volunteering: VolunteerExperience[];
  courses: Course[];
}) {
  const groups = [
    {
      label: "Honors & awards",
      icon: Trophy,
      items: honors.map((h) => ({
        title: h.title,
        subtitle: h.issuer,
        body: h.description,
      })),
    },
    {
      label: "Publications",
      icon: FileText,
      items: publications.map((p) => ({
        title: p.name,
        subtitle: p.publisher,
        body: p.description,
      })),
    },
    {
      label: "Volunteering",
      icon: HeartHandshake,
      items: volunteering.map((v) => ({
        title: v.role,
        subtitle: [v.organization, v.cause].filter(Boolean).join(" · ") || null,
        body: v.description,
      })),
    },
    {
      label: "Courses",
      icon: BookOpen,
      items: courses.map((c) => ({ title: c.name, subtitle: c.number, body: null })),
    },
  ].filter((group) => group.items.length > 0);

  if (!groups.length) return <EmptySection label="additional sections" />;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <group.icon className="h-3.5 w-3.5 text-neon" />
            {group.label}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item, index) => (
              <Card
                key={index}
                style={{ animationDelay: `${index * 40}ms` }}
                className="animate-fade-up space-y-1 p-3.5"
              >
                <p className="text-sm font-medium leading-tight">{item.title ?? "Untitled"}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                )}
                {item.body && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
