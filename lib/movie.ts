export const MOVIE_MAX_LENGTH = 120;

export function parseMovie(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim();
  if (title.length < 1 || title.length > MOVIE_MAX_LENGTH || /[\u0000-\u001f\u007f]/u.test(title)) {
    return null;
  }
  return title;
}
