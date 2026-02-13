import Redis from "ioredis";
import { env } from "../config/env.js";

const CACHE_PREFIX = "qiangchewei";

function normalizeKey(key) {
  return `${CACHE_PREFIX}:${key}`;
}

class MemoryStore {
  constructor() {
    this.map = new Map();
  }

  async set(key, value, ttlSec = 300) {
    const expiresAt = Date.now() + ttlSec * 1000;
    this.map.set(key, { value, expiresAt });
  }

  async get(key) {
    const row = this.map.get(key);
    if (!row) return null;
    if (Date.now() > row.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return row.value;
  }

  async del(key) {
    this.map.delete(key);
  }

  async incr(key, ttlSec = 60) {
    const current = Number((await this.get(key)) || 0) + 1;
    await this.set(key, String(current), ttlSec);
    return current;
  }
}

let redis = null;
let useMemory = false;

export async function initStore() {
  try {
    redis = new Redis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password || undefined,
      keyPrefix: `${CACHE_PREFIX}:`,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
    await redis.ping();
    console.log("[store] redis connected");
  } catch (err) {
    console.warn("[store] redis unavailable, fallback to memory:", err.message);
    useMemory = true;
    redis = new MemoryStore();
  }
}

export async function setCache(key, value, ttlSec) {
  if (useMemory) return redis.set(normalizeKey(key), value, ttlSec);
  await redis.set(key, value, "EX", ttlSec);
}

export async function getCache(key) {
  return redis.get(useMemory ? normalizeKey(key) : key);
}

export async function delCache(key) {
  await redis.del(useMemory ? normalizeKey(key) : key);
}

export async function incrCache(key, ttlSec = 60) {
  if (useMemory) return redis.incr(normalizeKey(key), ttlSec);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSec);
  }
  return count;
}
