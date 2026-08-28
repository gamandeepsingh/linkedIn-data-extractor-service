"use client";

import * as React from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { proxyImage } from "@/lib/image";

export function Avatar({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const resolved = proxyImage(src);

  React.useEffect(() => {
    setFailed(false);
  }, [resolved]);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 animate-pulse-ring rounded-full ring-2 ring-neon/40" />
      {resolved && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <User className="h-1/2 w-1/2 text-muted-foreground" />
      )}
    </div>
  );
}
