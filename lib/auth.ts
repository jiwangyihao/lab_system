import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "./auth.config";

const signInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const { username, password } = await signInSchema.parseAsync(
            credentials
          );

          const user = await prisma.user.findUnique({
            where: { username },
          });

          if (!user) {
            throw new Error("Invalid credentials");
          }

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (!passwordsMatch) {
            throw new Error("Invalid credentials");
          }

          return user;
        } catch (error) {
          return null;
        }
      },
    }),
  ],
});
