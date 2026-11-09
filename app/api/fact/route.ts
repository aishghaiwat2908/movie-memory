import { getSession } from "../../../lib/auth";
import type { FactResponse } from "../../../lib/fact-contract";
import { getMovieFact } from "../../../lib/facts";

function reply(body: FactResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const expectedOrigin = process.env.NEXTAUTH_URL && new URL(process.env.NEXTAUTH_URL).origin;
  if (!expectedOrigin || request.headers.get("origin") !== expectedOrigin) {
    return reply({ error: "This request must come from Movie Memory." }, 403);
  }

  try {
    const userId = (await getSession())?.user?.id;
    if (!userId) return reply({ error: "Sign in to see your movie fact." }, 401);

    // The session supplies the only user ID. The locked user row supplies the movie.
    const result = await getMovieFact(userId);
    switch (result.status) {
      case "missing-user":
        return reply({ error: "Sign in again to see your movie fact." }, 401);
      case "missing-movie":
        return reply({ error: "Save a favorite movie first." }, 409);
      case "unavailable":
        return reply({ error: "A movie fact is unavailable right now. Try again in a moment." }, 503);
      default:
        return reply({ source: result.status, text: result.fact.text });
    }
  } catch {
    console.error("Movie fact request failed");
    return reply({ error: "Movie facts are temporarily unavailable. Try again in a moment." }, 503);
  }
}
