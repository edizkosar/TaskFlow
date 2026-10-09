/** 2-5 characters, starts with a letter: "MOB", "WEB2". */
export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,4}$/;

const TR_MAP: Record<string, string> = { Ç: "C", Ğ: "G", İ: "I", I: "I", Ö: "O", Ş: "S", Ü: "U" };

function toAscii(value: string) {
  return value
    .toLocaleUpperCase("tr")
    .replace(/[ÇĞİÖŞÜ]/g, (ch) => TR_MAP[ch])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

/** Normalizes user input as they type: uppercase ASCII letters/digits, max 5. */
export function cleanProjectKey(value: string) {
  return toAscii(value).replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

/**
 * Suggests a key from a project name.
 * "Mobil Uygulama" → "MU", "Pazarlama Kampanyası 2027" → "PK2", "Web" → "WEB"
 */
export function suggestProjectKey(name: string) {
  const words = toAscii(name).split(/[^A-Z0-9]+/).filter(Boolean);
  if (words.length === 0) return "";
  const key = words.length === 1 ? words[0].slice(0, 3) : words.map((w) => w[0]).join("").slice(0, 4);
  // Must start with a letter.
  return key.replace(/^[0-9]+/, "").padEnd(2, "X").slice(0, 5);
}
