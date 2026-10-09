/** App-wide UI events, so shortcuts and the command palette stay decoupled from the board. */
export const OPEN_PALETTE_EVENT = "taskflow:open-palette";
export const NEW_TASK_EVENT = "taskflow:new-task";

/** True when a keypress is meant for a text field, menu or dialog, not a global shortcut. */
export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [role=combobox], [role=listbox], [role=menu]") !== null
  );
}

/** An open (not closing) dialog, e.g. the task panel or the palette. Base UI marks open popups with data-open. */
export function isDialogOpen() {
  return document.querySelector("[role=dialog][data-open], [role=alertdialog][data-open]") !== null;
}

/** Ctrl+K on Windows/Linux, Cmd+K on macOS. */
export function isPaletteShortcut(event: KeyboardEvent) {
  return event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
}
