import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const checkLive = args.has("--live");
const skipNetwork = args.has("--no-network");

if (args.has("--help")) {
  console.log(`Usage: node scripts/production-preflight.mjs [--live] [--strict] [--no-network]

Checks non-secret production configuration, database/Redis connectivity, checked-in
Railway worker manifests, release attestations, and (with --live) HTTPS health headers.
It never prints environment variable values or calls mutating provider endpoints.`);
  process.exit(0);
}

const failures = [];
const warnings = [];
const passes = [];

function pass(message) {
  passes.push(message);
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function configured(name) {
  return Boolean(process.env[name]?.trim());
}

function requireVariables(group, names) {
  const missing = names.filter((name) => !configured(name));
  if (missing.length) fail(`${group}: missing ${missing.join(", ")}`);
  else pass(`${group}: configured`);
}

function validateHttpsUrl(name) {
  const value = process.env[name]?.trim();
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") fail(`${name}: must use an https URL in production`);
    else pass(`${name}: uses HTTPS`);
  } catch {
    fail(`${name}: is not a valid URL`);
  }
}

function validateTimestamp(name, maxAgeDays) {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(`${name}: missing; record the completed operational check before release`);
    return;
  }

  const timestamp = Date.parse(value);
  const ageMs = Date.now() - timestamp;
  if (!Number.isFinite(timestamp) || ageMs < 0 || ageMs > maxAgeDays * 24 * 60 * 60 * 1000) {
    fail(`${name}: must be a non-future ISO timestamp from the last ${maxAgeDays} day(s)`);
    return;
  }
  pass(`${name}: recent`);
}

function checkWorkerManifests() {
  const workers = [
    ["abandoned-carts.json", "npm run worker:abandoned-carts"],
    ["order-followup.json", "npm run worker:order-followup"],
    ["low-stock-alert.json", "npm run worker:low-stock-alert"],
    ["purge-previews.json", "npm run worker:purge-previews"],
    ["retry-shipments.json", "npm run worker:retry-shipments"],
    ["reconcile-payments.json", "npm run worker:reconcile-payments"]
  ];

  for (const [file, startCommand] of workers) {
    const filePath = join(root, "railway.workers", file);
    if (!existsSync(filePath)) {
      fail(`worker manifest: railway.workers/${file} is missing`);
      continue;
    }

    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8"));
      const deploy = parsed?.deploy;
      if (deploy?.startCommand !== startCommand || typeof deploy?.cronSchedule !== "string" || !deploy.cronSchedule.trim()) {
        fail(`worker manifest: railway.workers/${file} has an invalid command or cron schedule`);
      } else if (deploy.restartPolicyType !== "NEVER") {
        fail(`worker manifest: railway.workers/${file} must use restartPolicyType NEVER`);
      } else {
        pass(`worker manifest: ${file}`);
      }
    } catch {
      fail(`worker manifest: railway.workers/${file} is not valid JSON`);
    }
  }
}

async function checkDatabase() {
  if (skipNetwork || !configured("DATABASE_URL")) return;

  const prisma = new PrismaClient({ log: ["error"] });
  try {
    await prisma.$queryRaw`SELECT 1`;
    pass("database: read-only connectivity confirmed");
  } catch {
    fail("database: read-only connectivity check failed");
  } finally {
    await prisma.$disconnect();
  }
}

async function checkRedis() {
  const url = process.env.REDIS_URL?.trim();
  if (skipNetwork || !url) return;

  let redis;

  try {
    redis = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
      retryStrategy: () => null,
      reconnectOnError: () => false
    });
    redis.on("error", () => undefined);
    await redis.connect();
    await redis.ping();
    pass("redis: connectivity confirmed");
  } catch {
    fail("redis: connectivity check failed");
  } finally {
    redis?.disconnect(false);
  }
}

async function checkLiveHealth() {
  if (!checkLive || skipNetwork) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.AUTH_URL?.trim();
  if (!siteUrl) {
    fail("live health: NEXT_PUBLIC_SITE_URL or AUTH_URL is required with --live");
    return;
  }

  let healthUrl;
  try {
    healthUrl = new URL("/api/health", siteUrl);
    if (healthUrl.protocol !== "https:") {
      fail("live health: target must use HTTPS");
      return;
    }
  } catch {
    fail("live health: configured site URL is invalid");
    return;
  }

  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(10_000) });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json().catch(() => null) : null;
    if (!response.ok || !body || body.ok !== true) {
      fail(`live health: /api/health returned ${response.status}`);
    } else {
      pass("live health: application reports ready");
    }

    const requiredHeaders = [
      ["strict-transport-security", "HSTS"],
      ["content-security-policy", "CSP"],
      ["x-content-type-options", "X-Content-Type-Options"]
    ];
    for (const [header, label] of requiredHeaders) {
      if (response.headers.get(header)) pass(`live health: ${label} header present`);
      else fail(`live health: ${label} header missing`);
    }
  } catch {
    fail("live health: request failed or timed out");
  }
}

function printSection(label, values, stream = console.log) {
  if (!values.length) return;
  stream(`${label}:`);
  for (const value of values) stream(`- ${value}`);
}

async function main() {
  if (process.env.NODE_ENV !== "production") {
    fail("NODE_ENV: must be production for this release gate");
  } else {
    pass("NODE_ENV: production");
  }

  requireVariables("core", [
    "DATABASE_URL",
    "AUTH_SECRET",
    "AUTH_URL",
    "NEXT_PUBLIC_SITE_URL",
    "REDIS_URL"
  ]);
  requireVariables("object storage", ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]);
  requireVariables("payments", ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]);
  requireVariables("customer AI try-on", ["GEMINI_API_KEY", "GEMINI_TRY_ON_MODEL"]);
  requireVariables("fulfillment", ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD", "SHIPROCKET_PICKUP_LOCATION"]);
  requireVariables("notifications", ["RESEND_API_KEY", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN", "CLINIC_PHONE"]);

  if (process.env.REQUIRE_REDIS_FOR_RATE_LIMITS?.trim().toLowerCase() !== "true") {
    fail("REQUIRE_REDIS_FOR_RATE_LIMITS: must be true in production so public mutations fail closed during a Redis outage");
  } else {
    pass("rate limiting: Redis is required");
  }

  const authSecret = process.env.AUTH_SECRET?.trim();
  if (authSecret && authSecret.length < 32) fail("AUTH_SECRET: must be at least 32 characters");
  else if (authSecret) pass("AUTH_SECRET: has a production-safe length");

  if (!configured("NEXTAUTH_SECRET")) warn("NEXTAUTH_SECRET: not set; AUTH_SECRET is sufficient for the current configuration");
  validateHttpsUrl("AUTH_URL");
  validateHttpsUrl("NEXT_PUBLIC_SITE_URL");
  checkWorkerManifests();

  validateTimestamp("PRODUCTION_WORKERS_VERIFIED_AT", 8);
  validateTimestamp("PRODUCTION_BACKUP_RESTORE_VERIFIED_AT", 90);
  validateTimestamp("PRODUCTION_PROVIDER_CANARY_VERIFIED_AT", 14);

  await Promise.all([checkDatabase(), checkRedis(), checkLiveHealth()]);

  printSection("Passed", passes);
  printSection("Warnings", warnings, console.warn);
  printSection("Failed", failures, console.error);

  if (failures.length || (strict && warnings.length)) {
    console.error(`Production preflight failed with ${failures.length} error(s)${strict && warnings.length ? ` and ${warnings.length} strict warning(s)` : ""}.`);
    process.exitCode = 1;
  } else {
    console.log("Production preflight passed.");
  }
}

await main();
