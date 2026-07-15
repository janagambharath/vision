import { spawnSync } from "node:child_process";

const migration = "20260715120000_gemini_tryon_prescriptions";

if (process.env.CONFIRM_FAILED_PRESCRIPTION_MIGRATION_ROLLBACK !== "yes") {
  throw new Error(
    "Refusing to change migration history. Set CONFIRM_FAILED_PRESCRIPTION_MIGRATION_ROLLBACK=yes only after confirming this exact migration failed and PostgreSQL rolled it back."
  );
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// The failed statement was inside Prisma's PostgreSQL migration transaction.
// Marking it rolled back lets the corrected, checked-in SQL run exactly once.
run(["prisma", "migrate", "resolve", "--rolled-back", migration]);
run(["prisma", "migrate", "deploy"]);
