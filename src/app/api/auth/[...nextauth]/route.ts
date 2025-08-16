import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET as CFG_SECRET } from "@/lib/runtimeConfig";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId:
        (typeof GOOGLE_CLIENT_ID === "string" && GOOGLE_CLIENT_ID.length ? GOOGLE_CLIENT_ID : undefined) ||
        process.env.GOOGLE_CLIENT_ID!,
      clientSecret:
        (typeof GOOGLE_CLIENT_SECRET === "string" && GOOGLE_CLIENT_SECRET.length ? GOOGLE_CLIENT_SECRET : undefined) ||
        process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Ensure production runs have a stable secret; prefer NEXTAUTH_SECRET, fallback to AUTH_SECRET
  secret:
    (typeof CFG_SECRET === "string" && CFG_SECRET.length ? CFG_SECRET : undefined) ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).provider = (token as any).provider;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
