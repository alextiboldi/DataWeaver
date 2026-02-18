import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - auth routes (login/signup pages)
     * - api/auth routes (NextAuth.js API)
     * - public assets
     * - root landing page (/)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|auth|api/auth).*)",
  ],
};
