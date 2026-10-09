const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-posta veya şifre hatalı.",
  USER_ALREADY_EXISTS: "Bu e-posta ile kayıtlı bir hesap zaten var.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Bu e-posta ile kayıtlı bir hesap zaten var.",
  INVALID_EMAIL: "Geçerli bir e-posta adresi girin.",
  PASSWORD_TOO_SHORT: "Şifre en az 8 karakter olmalı.",
  PASSWORD_TOO_LONG: "Şifre çok uzun.",
};

export function authErrorMessage(error: { code?: string; message?: string } | null | undefined) {
  return (error?.code && MESSAGES[error.code]) || "Bir şeyler ters gitti. Lütfen tekrar deneyin.";
}

/** Only allow same-origin relative paths as post-login redirects. */
export function safeNextPath(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
