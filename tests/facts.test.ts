import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/fact/route";
import { getMovieFact } from "../lib/facts";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  query: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  generate: vi.fn(),
  session: vi.fn(),
}));

vi.mock("../lib/db", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("../lib/openai", () => ({ generateFact: mocks.generate }));
vi.mock("../lib/auth", () => ({ getSession: mocks.session }));

const origin = "http://localhost:3000";
const movie = "The Princess Bride";
const now = Date.UTC(2026, 0, 1);
const fresh = { text: "A freshly generated fact.", createdAt: new Date(now) };

function priorFact(ageMs: number) {
  return { text: "A previously saved fact.", createdAt: new Date(now - ageMs) };
}

function request(url = `${origin}/api/fact`, payload?: unknown, requestOrigin = origin) {
  return new Request(url, {
    method: "POST",
    headers: { origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.NEXTAUTH_URL = origin;
  mocks.transaction.mockImplementation((run) => run({
    $queryRaw: mocks.query,
    $executeRaw: vi.fn().mockResolvedValue(0),
    fact: { findFirst: mocks.findFirst, create: mocks.create },
  }));
  mocks.query.mockResolvedValueOnce([{ favoriteMovie: movie }]).mockResolvedValue([{ now: new Date(now) }]);
  mocks.generate.mockResolvedValue(fresh.text);
  mocks.create.mockResolvedValue(fresh);
});

describe("fact cache", () => {
  it("reuses the latest fact at 59,999 ms", async () => {
    const fact = priorFact(59_999);
    mocks.findFirst.mockResolvedValue(fact);

    expect(await getMovieFact("viewer")).toEqual({ status: "cached", fact });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([60_000, 61_000])("generates and stores a new fact at %i ms", async (age) => {
    mocks.findFirst.mockResolvedValue(priorFact(age));

    expect(await getMovieFact("viewer")).toEqual({ status: "fresh", fact: fresh });
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(movie);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { userId: "viewer", movie, text: fresh.text },
    }));
  });

  it("returns the last saved fact when the provider fails", async () => {
    const fact = priorFact(60_001);
    mocks.findFirst.mockResolvedValue(fact);
    mocks.generate.mockRejectedValue(new Error("timeout"));

    expect(await getMovieFact("viewer")).toEqual({ status: "stale", fact });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns a friendly error when generation fails without a saved fact", async () => {
    mocks.session.mockResolvedValue({ user: { id: "viewer" } });
    mocks.findFirst.mockResolvedValue(null);
    mocks.generate.mockRejectedValue(new Error("private provider diagnostic"));

    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "A movie fact is unavailable right now. Try again in a moment.",
    });
  });
});

describe("fact authorization", () => {
  it("rejects requests without an authenticated session before touching the database", async () => {
    mocks.session.mockResolvedValue(null);

    expect((await POST(request())).status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("looks up only the signed-in user's fact when the caller submits another user's ID", async () => {
    mocks.session.mockResolvedValue({ user: { id: "alice" } });
    const alice = { ...priorFact(5_000), text: "Alice’s fact" };
    const bob = { ...priorFact(4_000), text: "Bob’s fact" };
    mocks.findFirst.mockImplementation(({ where }) => {
      const records = [{ userId: "bob", movie, ...bob }, { userId: "alice", movie, ...alice }];
      return records.find((fact) => fact.userId === where.userId && fact.movie === where.movie);
    });

    const response = await POST(request(`${origin}/api/fact?userId=bob`, { userId: "bob", movie }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ source: "cached", text: alice.text });
    expect(mocks.query.mock.calls[0][1]).toBe("alice");
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "alice", movie } }));
  });

  it("rejects cross-origin generation attempts", async () => {
    const response = await POST(request(undefined, undefined, "https://another.example"));
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

