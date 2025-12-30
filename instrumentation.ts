export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import logic dynamically to avoid bundling issues in non-Node environments
    const { bootstrapDatabase } = await import("@/lib/bootstrap");
    await bootstrapDatabase();
  }
}
