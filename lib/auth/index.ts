import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { authConfig } from "./config";

/**
 * Full auth config with DB-dependent providers and callbacks.
 * Only imported from server-side code (API routes, server components).
 * The middleware uses the edge-compatible config from ./config.ts instead.
 */
export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "github" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          const created = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? undefined,
              role: "editor",
            },
          });
          user.id = created.id;
          (user as { role?: string }).role = created.role;
        } else {
          user.id = existingUser.id;
          (user as { role?: string }).role = existingUser.role;
        }
      }
      return true;
    },
  },
});
