// パスワードポリシー: 8文字以上、かつ英小文字・英大文字・数字・記号のうち2種類以上を含むこと。
export const PASSWORD_POLICY_MESSAGE =
  "パスワードは8文字以上で、英大文字・英小文字・数字・記号のうち2種類以上を組み合わせてください。";

const CHAR_CLASS_PATTERNS = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];

export const isPasswordValid = (password: string): boolean => {
  if (password.length < 8) return false;
  const usedClasses = CHAR_CLASS_PATTERNS.filter((pattern) => pattern.test(password)).length;
  return usedClasses >= 2;
};
