import { prisma, type Role } from "@/lib/prisma";

/**
 * Checks if an IP is allowed for a specific role.
 *
 * Rules:
 * 1. STUDENT, TEACHER, OUTSIDER can access from anywhere (assuming public internet access is allowed for general users).
 * 2. ADMIN and HEAD (Management roles) might be restricted to specific IPs (e.g., campus network or VPN).
 *
 * This logic is based on the requirement: "IP White list verification".
 * If the requirement implies *everyone* needs to be whitelisted, the logic should be adjusted.
 * Based on 5.2 in the plan, it says "Borrowers can access via internet", so restricted roles are checked against whitelist.
 */
export async function isAllowedIP(ip: string, role: Role): Promise<boolean> {
  // Allow common users to access from anywhere
  if (role === "STUDENT" || role === "TEACHER" || role === "OUTSIDER") {
    return true;
  }

  // Examples: Localhost is always allowed for dev/debug (optional, but good for dev)
  if (ip === "::1" || ip === "127.0.0.1") {
    return true;
  }

  // Fetch whitelist from DB
  const whitelist = await prisma.ipWhitelist.findMany();

  // Check if IP is in whitelist (exact match or prefix/subnet match if implemented)
  // Simple implementation: exact match or startsWith
  return whitelist.some(
    (w: { ipAddress: string }) =>
      w.ipAddress === ip || ip.startsWith(w.ipAddress)
  );
}
