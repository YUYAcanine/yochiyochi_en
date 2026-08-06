// 会員ID(memberId)をSupabase Authのemailに変換するための共通ロジック。
// クライアント・サーバー両方から参照するため秘密情報は持たない。

const sanitizeForEmailLocalPart = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9.-]/g, "_");

export const MEMBER_EMAIL_DOMAIN = "members.yochiyochi.local";

export const toAuthEmail = (memberId: string): string =>
  `${sanitizeForEmailLocalPart(memberId)}@${MEMBER_EMAIL_DOMAIN}`;
