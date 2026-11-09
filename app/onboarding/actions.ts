"use server";

import { redirect } from "next/navigation";
import { getSession } from "../../lib/auth";
import { db } from "../../lib/db";
import { MOVIE_MAX_LENGTH, parseMovie } from "../../lib/movie";

export async function saveFavoriteMovie(_previousError: string, form: FormData) {
  const userId = (await getSession())?.user?.id;
  if (!userId) redirect("/");

  const title = parseMovie(form.get("movie"));
  if (!title) return `Enter a movie title from 1 to ${MOVIE_MAX_LENGTH} characters on one line.`;

  try {
    // The first successful submission wins across multiple onboarding tabs.
    await db.user.updateMany({
      where: { id: userId, favoriteMovie: null },
      data: { favoriteMovie: title },
    });
  } catch {
    console.error("Favorite movie save failed");
    return "Your movie couldn’t be saved. Try again.";
  }

  redirect("/dashboard");
}
