import {
  Award,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Languages,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { LinkedInProfile } from "@/types/profile";

export function StatTiles({ profile }: { profile: LinkedInProfile }) {
  const tiles = [
    { label: "Positions", value: profile.experience.length, icon: Briefcase },
    { label: "Education", value: profile.education.length, icon: GraduationCap },
    { label: "Skills", value: profile.skills.length, icon: Sparkles },
    { label: "Certifications", value: profile.certifications.length, icon: Award },
    { label: "Languages", value: profile.languages.length, icon: Languages },
    { label: "Projects", value: profile.projects.length, icon: FolderGit2 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile, index) => (
        <Card
          key={tile.label}
          style={{ animationDelay: `${index * 45}ms` }}
          className="group animate-fade-up p-4 transition-colors hover:border-neon/50"
        >
          <tile.icon className="mb-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-neon" />
          <div className="text-2xl font-semibold tabular-nums tracking-tight">{tile.value}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {tile.label}
          </div>
        </Card>
      ))}
    </div>
  );
}
