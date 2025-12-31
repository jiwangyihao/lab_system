import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Force Node.js runtime (Prisma cannot run in Edge)
export const runtime = "nodejs";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
