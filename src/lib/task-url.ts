/** `?task=MOB-12` → { key: "MOB", number: 12 } */
export function parseTaskParam(value: string | null | undefined) {
  const match = value?.match(/^([A-Za-z][A-Za-z0-9]{1,4})-(\d{1,9})$/);
  return match ? { key: match[1].toUpperCase(), number: Number(match[2]) } : null;
}

/** Same URL with `task` set (or removed when null), keeping other params like filters. */
export function withTaskParam(pathname: string, params: URLSearchParams, task: string | null) {
  const next = new URLSearchParams(params);
  if (task) next.set("task", task);
  else next.delete("task");
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

type Router = { push(href: string, options?: { scroll?: boolean }): void; replace(href: string, options?: { scroll?: boolean }): void; back(): void };

// True when the open panel was opened by an in-app push, so closing can go Back.
let openedInApp = false;

/** For navigations that land on a task in another page: closing must not go Back. */
export function forgetTaskPanelHistory() {
  openedInApp = false;
}

/** Opens a task panel: push, so Back closes it. */
export function openTaskPanel(router: Router, pathname: string, params: URLSearchParams, task: string) {
  openedInApp = true;
  router.push(withTaskParam(pathname, params, task), { scroll: false });
}

/**
 * Closes the panel. Goes Back when we opened it (keeps history tidy); for a
 * shared link opened directly, removes the param instead of leaving the app.
 */
export function closeTaskPanel(router: Router, pathname: string, params: URLSearchParams) {
  if (openedInApp) {
    openedInApp = false;
    router.back();
  } else {
    router.replace(withTaskParam(pathname, params, null), { scroll: false });
  }
}
