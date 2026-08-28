import {
  BadgeCheck,
  Building2,
  ExternalLink,
  MapPin,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { proxyImage } from "@/lib/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { LinkedInProfile } from "@/types/profile";

function formatCount(value: number | null) {
  if (value === null) return null;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function ProfileHeader({ profile }: { profile: LinkedInProfile }) {
  const followers = formatCount(profile.followers);
  const connections = formatCount(profile.connections);

  return (
    <Card className="relative overflow-hidden animate-fade-up">
      {profile.backgroundImage && (
        <div className="relative h-28 w-full overflow-hidden border-b sm:h-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxyImage(profile.backgroundImage.url)}
            alt=""
            referrerPolicy="no-referrer"
            decoding="async"
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      )}

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
        <Avatar
          src={profile.profilePicture?.url}
          alt={profile.fullName ?? profile.publicIdentifier}
          className={
            profile.backgroundImage
              ? "-mt-16 h-24 w-24 border-4 border-card sm:-mt-20 sm:h-28 sm:w-28"
              : "h-24 w-24 sm:h-28 sm:w-28"
          }
        />

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {profile.fullName ?? profile.publicIdentifier}
              </h2>
              {profile.isInfluencer && (
                <Badge variant="neon" className="gap-1">
                  <Star className="h-3 w-3" />
                  Influencer
                </Badge>
              )}
              {profile.isPremium && (
                <Badge variant="secondary" className="gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Premium
                </Badge>
              )}
              {profile.isOpenToWork && (
                <Badge variant="neon" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Open to work
                </Badge>
              )}
            </div>

            {profile.headline && (
              <p className="text-pretty text-sm leading-relaxed text-foreground/80">
                {profile.headline}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {profile.location.text && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location.text}
              </span>
            )}
            {profile.industry && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {profile.industry}
              </span>
            )}
            {followers && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{followers}</span> followers
              </span>
            )}
            {connections && (
              <span className="inline-flex items-center gap-1.5">
                <span className="font-medium text-foreground">{connections}</span> connections
              </span>
            )}
            <a
              href={profile.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-neon transition-opacity hover:opacity-70"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {profile.publicIdentifier}
            </a>
          </div>

          {profile.about && (
            <p className="max-h-40 overflow-y-auto whitespace-pre-line text-pretty border-l-2 border-neon/40 pl-3 text-sm leading-relaxed text-muted-foreground">
              {profile.about}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
