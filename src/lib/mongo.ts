import { Db, MongoClient } from "mongodb";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;
let warnedOnce = false;

function connect(): Promise<MongoClient> | null {
  if (!env.mongoUri) {
    if (!warnedOnce) {
      console.warn("[mongo] MONGODB_URI not set - caching is disabled");
      warnedOnce = true;
    }
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(env.mongoUri, {
        serverSelectionTimeoutMS: 5000,
      }).connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    }).connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db | null> {
  const promise = connect();
  if (!promise) return null;

  try {
    const client = await promise;
    return client.db(env.mongoDb);
  } catch (err) {
    console.error("[mongo] connection failed:", (err as Error).message);
    clientPromise = null;
    global._mongoClientPromise = undefined;
    return null;
  }
}
