import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // 特定ファイルだけ no-explicit-any を無効化
  {
    files: ["app/page3/page.tsx","app/api/vision-ocr/route.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];



export default eslintConfig;
