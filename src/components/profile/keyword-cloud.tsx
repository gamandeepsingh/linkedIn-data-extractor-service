import { Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProfileResponse } from "@/types/profile";

const SOURCE_STYLES: Record<string, string> = {
  skill: "border-neon/45 bg-neon-soft text-neon",
  role: "border-foreground/25 bg-foreground/[0.06] text-foreground",
  company: "border-foreground/15 bg-transparent text-foreground/80",
  text: "border-border bg-muted/50 text-muted-foreground",
};

export function KeywordCloud({ keywords }: { keywords: ProfileResponse["keywords"] }) {
  if (!keywords.length) return null;

  const max = keywords[0]?.weight ?? 1;

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Hash className="h-4 w-4 text-neon" />
          Keywords
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            weighted by skills, roles and profile text
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => {
            const scale = keyword.weight / max;
            return (
              <span
                key={keyword.term}
                title={`${keyword.source} · weight ${keyword.weight}`}
                style={{
                  animationDelay: `${index * 22}ms`,
                  fontSize: `${0.72 + scale * 0.34}rem`,
                  opacity: 0.62 + scale * 0.38,
                }}
                className={cn(
                  "animate-fade-up cursor-default rounded-md border px-2.5 py-1 font-medium leading-none transition-transform hover:scale-105",
                  SOURCE_STYLES[keyword.source] ?? SOURCE_STYLES.text,
                )}
              >
                {keyword.term}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
