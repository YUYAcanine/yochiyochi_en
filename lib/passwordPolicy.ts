// Password policy: at least 8 characters, and must include at least 2 of the
// following character classes: lowercase letters, uppercase letters, digits, symbols.
export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and combine at least 2 of the following: uppercase letters, lowercase letters, digits, and symbols.";

const CHAR_CLASS_PATTERNS = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];

export const isPasswordValid = (password: string): boolean => {
  if (password.length < 8) return false;
  const usedClasses = CHAR_CLASS_PATTERNS.filter((pattern) => pattern.test(password)).length;
  return usedClasses >= 2;
};
