import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Edge-compatible auth config. No DB/Node.js imports here — this is used
 * by the middleware which runs in Edge Runtime.
 *
 * The Credentials provider and DB-dependent callbacks live in index.ts,
 * which is only imported from server-side code (API routes, server components).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: string }).role ?? "editor";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/auth");
      const isLandingPage = nextUrl.pathname === "/";
      if (isAuthPage || isLandingPage) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
