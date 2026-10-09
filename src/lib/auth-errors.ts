const FORBIDDEN = "Bu işlem için yetkin yok.";
const LAST_OWNER = "Workspace'te en az bir sahip kalmalı.";
const TAKEN = "Bu adres başka bir workspace tarafından kullanılıyor.";

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-posta veya şifre hatalı.",
  USER_ALREADY_EXISTS: "Bu e-posta ile kayıtlı bir hesap zaten var.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Bu e-posta ile kayıtlı bir hesap zaten var.",
  INVALID_EMAIL: "Geçerli bir e-posta adresi girin.",
  PASSWORD_TOO_SHORT: "Şifre en az 8 karakter olmalı.",
  PASSWORD_TOO_LONG: "Şifre çok uzun.",

  ORGANIZATION_ALREADY_EXISTS: TAKEN,
  ORGANIZATION_SLUG_ALREADY_TAKEN: TAKEN,
  ORGANIZATION_NOT_FOUND: "Workspace bulunamadı.",
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "Bu kişi zaten workspace üyesi.",
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: "Bu e-postaya bekleyen bir davet zaten var.",
  INVITATION_NOT_FOUND: "Davet bulunamadı ya da süresi dolmuş.",
  YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION: "Bu davet başka bir e-posta adresine gönderilmiş.",
  INVITATION_LIMIT_REACHED: "Bekleyen davet sınırına ulaşıldı.",
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED: "Workspace üye sınırına ulaştı.",
  MEMBER_NOT_FOUND: "Üye bulunamadı.",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER: LAST_OWNER,
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER: LAST_OWNER,
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION: FORBIDDEN,
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE: FORBIDDEN,
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: FORBIDDEN,
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: FORBIDDEN,
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION: FORBIDDEN,
  YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION: FORBIDDEN,
  YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS: "Oluşturabileceğin workspace sınırına ulaştın.",
};

export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined) {
  if (error?.status === 429) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  return (error?.code && MESSAGES[error.code]) || "Bir şeyler ters gitti. Lütfen tekrar deneyin.";
}

/** Only allow same-origin relative paths as post-login redirects. */
export function safeNextPath(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
