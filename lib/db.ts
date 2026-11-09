import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalDb = globalThis as typeof globalThis & { movieMemoryDb?: PrismaClient };

export const db = globalDb.movieMemoryDb ?? new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2_000,
    max: 10,
  }),
});

if (process.env.NODE_ENV !== "production") globalDb.movieMemoryDb = db;
