import { spawnSync } from "node:child_process";

const failedMigration = "20260715120000_gemini_tryon_prescriptions";
const command = process.platform === "win32" ? "npx.cmd" : "npx";

function prisma(args) {
  const result = spawnSync(command, ["prisma", ...args], {
    encoding: "utf8",
    env: process.env
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;
  return { status: result.status ?? 1, output };
}

const firstDeploy = prisma(["migrate", "deploy"]);
if (firstDeploy.status === 0) process.exit(0);

// Prisma/PostgreSQL rolls this migration back as one transaction. Recover only
// the exact P3009 record caused by the now-corrected enum-cast statement; every
// other migration failure remains a hard startup failure for investigation.
const isKnownFailure = firstDeploy.output.includes("P3009") && firstDeploy.output.includes(failedMigration);
if (!isKnownFailure) process.exit(firstDeploy.status);

console.warn(`Recovering the known failed Prisma migration: ${failedMigration}`);
const resolved = prisma(["migrate", "resolve", "--rolled-back", failedMigration]);
if (resolved.status !== 0) process.exit(resolved.status);

const retry = prisma(["migrate", "deploy"]);
process.exit(retry.status);
