// Shared logic for converting a member ID (memberId) into a Supabase Auth email.
// This holds no secrets since it is referenced from both client and server.

const sanitizeForEmailLocalPart = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9.-]/g, "_");

export const MEMBER_EMAIL_DOMAIN = "members.yochiyochi.local";

export const toAuthEmail = (memberId: string): string =>
  `${sanitizeForEmailLocalPart(memberId)}@${MEMBER_EMAIL_DOMAIN}`;
