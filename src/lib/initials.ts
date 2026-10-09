/** "Ayşe Yılmaz" → "AY", "taskflow" → "T" */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0]?.[0] ?? "?");
  return letters.toLocaleUpperCase("tr");
}
