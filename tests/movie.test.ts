import { expect, it } from "vitest";
import { MOVIE_MAX_LENGTH, parseMovie } from "../lib/movie";

it("trims a valid title and preserves its spelling", () => {
  expect(parseMovie("  Kiki’s Delivery Service  ")).toBe("Kiki’s Delivery Service");
});

it("rejects blank, oversized, non-text and multiline values", () => {
  expect(parseMovie("  ")).toBeNull();
  expect(parseMovie("x".repeat(MOVIE_MAX_LENGTH + 1))).toBeNull();
  expect(parseMovie(new File([], "movie.txt"))).toBeNull();
  expect(parseMovie("Part One\nPart Two")).toBeNull();
  expect(parseMovie("x".repeat(MOVIE_MAX_LENGTH))).toHaveLength(MOVIE_MAX_LENGTH);
});
