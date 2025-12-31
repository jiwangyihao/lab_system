export async function register() {
  // Only run in Node.js runtime (Vercel Serverless)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Instrumentation] Running bootstrap in Node.js runtime");
    try {
      const { bootstrapDatabase } = await import("@/lib/bootstrap");
      await bootstrapDatabase();
    } catch (error) {
      console.error("[Instrumentation] Bootstrap failed:", error);
    }
  } else {
    console.log(
      `[Instrumentation] Skipping bootstrap, runtime: ${process.env.NEXT_RUNTIME}`
    );
  }
}
