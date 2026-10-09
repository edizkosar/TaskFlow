import type { TaskStatus } from "@/lib/task-status";

export type SearchResult = {
  id: string;
  key: string;
  number: number;
  title: string;
  status: TaskStatus;
  projectName: string;
};

/**
 * Turkish-aware fold for case-insensitive search. The DB collation (C.UTF-8)
 * matches İ↔i but not I↔ı, so both sides fold every i-variant to "i".
 * The SQL side mirrors this: translate(lower(title), 'ı', 'i').
 */
export function foldForSearch(value: string) {
  return value.toLocaleLowerCase("tr").replace(/ı/g, "i");
}

/** Escapes LIKE wildcards in user input. */
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
