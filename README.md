This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## データベース構成

このアプリはSupabase（PostgreSQL）をバックエンドとして使用しています。

### 認証

会員ID・パスワードでのログインですが、実体はSupabase Authです。会員IDを`{会員ID}@members.yochiyochi.local`という合成メールアドレスに変換してメール/パスワード認証として扱っています。新規登録は[app/api/auth/register/route.ts](app/api/auth/register/route.ts)がService Role Keyを使ってAuthユーザー・`gardens`・`garden_members`を作成します。

### テーブル構成

| テーブル | 役割 |
| --- | --- |
| `gardens` | 保育園（テナント）本体。`member_code`が旧・会員IDに相当 |
| `garden_members` | `auth.users`と`gardens`の紐付け |
| `foods` | 食材マスタ。`garden_id`が`null`なら全園共通、値があれば園独自 |
| `food_aliases` | 食材名の表記揺れ（別名 → `foods.id`） |
| `cooking_methods` | 離乳段階別（phase1〜5）の調理方法。共通/園独自は`foods`と同様に`garden_id`で判定 |
| `children` | 園児 |
| `child_food_restrictions` | 園児ごとの食材制限（食べられない食材・メモ） |
| `accidents` | ヒヤリハット・事故情報。`garden_id`/`child_id`が`null`かつ`is_public=true`の行は全園共通の一般事例 |

### アクセス制御

各テーブルにRLS（Row Level Security）を設定しており、ログインユーザーは自分が所属する園（`garden_members`経由）のデータのみ読み書きできます。共通マスタ（`garden_id`が`null`の食材・調理方法）と、`is_public=true`のヒヤリハットは未ログインでも閲覧可能です。

### 環境変数

`.env.local`に以下を設定してください。

```
NEXT_PUBLIC_SUPABASE_URL=<SupabaseプロジェクトのURL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

`SUPABASE_SERVICE_ROLE_KEY`はサーバー専用（会員登録APIでのみ使用）。`NEXT_PUBLIC_`を付けず、クライアントに公開しないこと。

### 関連コード

- [lib/supabaseClient.ts](lib/supabaseClient.ts) — ブラウザ用Supabaseクライアント
- [lib/supabaseAdmin.ts](lib/supabaseAdmin.ts) — Service Role Key使用のサーバー専用クライアント
- [lib/apiAuth.ts](lib/apiAuth.ts) — APIルートでのログインユーザー・所属園の解決
- [lib/currentGarden.ts](lib/currentGarden.ts) — クライアント側での所属園ID解決
- [types/database.ts](types/database.ts) — テーブルの型定義

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
