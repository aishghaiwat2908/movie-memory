CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleSubject" TEXT NOT NULL,
    "favoriteMovie" VARCHAR(120),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Fact" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "movie" VARCHAR(120) NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT "Fact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");
CREATE INDEX "Fact_userId_movie_createdAt_id_idx" ON "Fact"("userId", "movie", "createdAt" DESC, "id" DESC);
ALTER TABLE "Fact" ADD CONSTRAINT "Fact_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
