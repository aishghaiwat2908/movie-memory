"use client";

import { useActionState, useState } from "react";
import { MOVIE_MAX_LENGTH } from "../../lib/movie";
import { saveFavoriteMovie } from "./actions";

export function MovieForm() {
  const [error, submit, pending] = useActionState(saveFavoriteMovie, "");
  const [movie, setMovie] = useState("");

  return (
    <form action={submit} className="movie-form">
      <label htmlFor="movie">Movie title</label>
      <p className="muted text-sm" id="movie-hint">Add the release year if the title is shared by more than one film.</p>
      <input id="movie" name="movie" placeholder="e.g. The Princess Bride (1987)" required
        maxLength={MOVIE_MAX_LENGTH} value={movie} onChange={(event) => setMovie(event.target.value)}
        aria-describedby={error ? "movie-hint movie-error" : "movie-hint"} />
      {error && <p className="error-note" id="movie-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : "Save my movie"} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
