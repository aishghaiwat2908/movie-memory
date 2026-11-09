export type FactResult =
  | { status: "fresh" | "cached" | "stale"; fact: { text: string; createdAt: Date } }
  | { status: "unavailable" | "missing-user" | "missing-movie" };

export type FactResponse =
  | { source: "fresh" | "cached" | "stale"; text: string }
  | { error: string };
