// EdgeRuntime is a global variable in Edge environments
declare const EdgeRuntime: string | undefined;

export async function register() {
  // Skip in Edge runtime - Prisma cannot run in Edge
  if (typeof EdgeRuntime !== "undefined") {
    console.log("[Instrumentation] Skipping bootstrap in Edge runtime");
    return;
  }

  // Only run in Node.js runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import logic dynamically to avoid bundling issues in non-Node environments
    const { bootstrapDatabase } = await import("@/lib/bootstrap");
    await bootstrapDatabase();
  }
}
