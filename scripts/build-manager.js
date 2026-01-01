const { execSync } = require("child_process");

function runCommand(command) {
  try {
    console.log(`> ${command}`);
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    process.exit(1);
  }
}

// 1. Always generate Prisma Client
console.log("Starting build process...");
runCommand("npx prisma generate");

// 2. Conditionally run migrations
// On Vercel, SKIP_MIGRATION is usually undefined.
// In Dockerfile, we will set SKIP_MIGRATION=1 during build.
if (
  process.env.SKIP_MIGRATION === "1" ||
  process.env.SKIP_MIGRATION === "true"
) {
  console.log("Skipping database migration (SKIP_MIGRATION is set).");
} else {
  console.log("Running database migration...");
  // Force deployment of pending migrations
  // Use try-catch for migration specifically - if it fails on Vercel, the build SHOULD fail.
  // But locally/docker without DB, it might be annoying if accidental.
  // However, for consistency, we let it fail if not skipped.
  runCommand("npx prisma migrate deploy");
}

// 3. Build Next.js app
console.log("Building Next.js application...");
runCommand("npx next build");
