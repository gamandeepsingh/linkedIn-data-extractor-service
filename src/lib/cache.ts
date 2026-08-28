import { getDb } from "./mongo";
import { env } from "./env";
import type { LinkedInProfile } from "@/types/profile";

const COLLECTION = "profiles";

interface CachedDoc {
  _id: string;
  profile: LinkedInProfile;
  source: string;
  fetchedAt: Date;
  expiresAt: Date;
}

let indexReady = false;

async function ensureIndexes() {
  if (indexReady) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.collection(COLLECTION).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    indexReady = true;
  } catch (err) {
    console.error("[cache] could not create TTL index:", (err as Error).message);
  }
}

export async function readCache(publicId: string) {
  const db = await getDb();
  if (!db) return null;

  await ensureIndexes();
  try {
    const doc = await db.collection<CachedDoc>(COLLECTION).findOne({ _id: publicId });
    if (!doc) return null;
    if (doc.expiresAt.getTime() < Date.now()) return null;
    return doc;
  } catch (err) {
    console.error("[cache] read failed:", (err as Error).message);
    return null;
  }
}

export async function writeCache(publicId: string, profile: LinkedInProfile, source: string) {
  const db = await getDb();
  if (!db) return;

  await ensureIndexes();
  const now = new Date();
  try {
    await db.collection<CachedDoc>(COLLECTION).updateOne(
      { _id: publicId },
      {
        $set: {
          profile,
          source,
          fetchedAt: now,
          expiresAt: new Date(now.getTime() + env.cacheTtlSeconds * 1000),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[cache] write failed:", (err as Error).message);
  }
}
