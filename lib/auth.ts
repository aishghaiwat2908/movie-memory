import { getServerSession, type DefaultSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/", error: "/" },
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "google") {
        const user = await db.user.upsert({
          where: { googleSubject: account.providerAccountId },
          create: { googleSubject: account.providerAccountId },
          update: { googleSubject: account.providerAccountId },
          select: { id: true },
        });
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}

export async function getViewer() {
  const profile = (await getSession())?.user;
  if (!profile?.id) return null;

  const user = await db.user.findUnique({
    where: { id: profile.id },
    select: { favoriteMovie: true },
  });
  return user ? { ...profile, ...user } : null;
}
