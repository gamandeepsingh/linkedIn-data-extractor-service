import { fetchProfile } from "@/lib/linkedin/fetch-profile";
import { writeCache } from "@/lib/cache";
import { extractPublicId } from "@/lib/url";

const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error("usage: npm run warm -- <profile-url-or-vanity> [more...]");
  process.exit(1);
}

let ok = 0;
let failed = 0;

for (const target of targets) {
  let publicId: string;
  try {
    publicId = extractPublicId(target);
  } catch (err) {
    console.error(`skip  ${target} - ${(err as Error).message}`);
    failed++;
    continue;
  }

  try {
    const { profile, source, warnings } = await fetchProfile(publicId);
    await writeCache(publicId, profile, source);
    ok++;
    console.log(
      `warm  ${publicId} - ${profile.fullName ?? "unknown"} via ${source}` +
        (warnings.length ? ` (${warnings.length} warning${warnings.length === 1 ? "" : "s"})` : ""),
    );
  } catch (err) {
    failed++;
    console.error(`fail  ${publicId} - ${(err as Error).message}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 2500));
}

console.log(`\ndone: ${ok} cached, ${failed} failed`);
process.exit(failed && !ok ? 1 : 0);
