import { Prisma } from "../generated/prisma/client";
import { db } from "./db";
import type { FactResult } from "./fact-contract";
import { generateFact } from "./openai";

const CACHE_MS = 60_000;

export async function getMovieFact(userId: string): Promise<FactResult> {
  return db.$transaction(async (tx) => {
    // Leave time for the provider request after a waiter acquires the row.
    await tx.$executeRaw`SET LOCAL lock_timeout = '8s'`;
    // Lock before the cache read so a waiter sees the preceding transaction's insert.
    const [user] = await tx.$queryRaw<{ favoriteMovie: string | null }[]>`
      SELECT "favoriteMovie" FROM "User" WHERE "id" = ${userId} FOR UPDATE
    `;
    if (!user) return { status: "missing-user" };
    if (!user.favoriteMovie) return { status: "missing-movie" };
    const movie = user.favoriteMovie;

    const latest = await tx.fact.findFirst({
      where: { userId, movie },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { text: true, createdAt: true },
    });
    if (latest) {
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
      if (clock.now.getTime() - latest.createdAt.getTime() < CACHE_MS) {
        return { status: "cached", fact: latest };
      }
    }

    let text: string;
    try {
      text = await generateFact(movie);
    } catch {
      console.warn("Movie fact provider failed");
      return latest ? { status: "stale", fact: latest } : { status: "unavailable" };
    }

    const fact = await tx.fact.create({
      data: { userId, movie, text },
      select: { text: true, createdAt: true },
    });
    return { status: "fresh", fact };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 2_000,
    timeout: 20_000,
  });
}


