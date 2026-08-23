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

## Database structure

This app uses Supabase (PostgreSQL) as its backend.

### Authentication

Members log in with a member ID and password, but under the hood this is Supabase Auth. The member ID is converted into a synthetic email address of the form `{memberId}@members.yochiyochi.local` and handled as email/password authentication. Sign-up is handled by [app/api/auth/register/route.ts](app/api/auth/register/route.ts), which uses the Service Role Key to create an Auth user along with `gardens` and `garden_members` rows.

### Tables

| Table | Purpose |
| --- | --- |
| `gardens` | The nursery (tenant) itself. `member_code` corresponds to the legacy member ID |
| `garden_members` | Links `auth.users` to a `gardens` row |
| `foods` | Food master data. A `null` `garden_id` means it's shared across all nurseries; a value means it's nursery-specific |
| `food_aliases` | Alternate spellings/names for foods (alias -> `foods.id`) |
| `cooking_methods` | Cooking methods by weaning stage (phase1-5). Shared vs. nursery-specific is determined by `garden_id`, same as `foods` |
| `children` | Children enrolled at a nursery |
| `child_food_restrictions` | Per-child food restrictions (foods they can't eat, notes) |
| `accidents` | Near-miss / choking incident reports. Rows where `garden_id`/`child_id` are `null` and `is_public=true` are shared, general-purpose incidents visible across all nurseries |

### Access control

Row Level Security (RLS) is configured on every table, so a logged-in user can only read/write data belonging to the nursery they're a member of (via `garden_members`). Shared master data (foods/cooking methods with a `null` `garden_id`) and incidents with `is_public=true` are visible even when logged out.

### Environment variables

Set the following in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only (used solely by the member registration API). Never prefix it with `NEXT_PUBLIC_` or expose it to the client.

### Related code

- [lib/supabaseClient.ts](lib/supabaseClient.ts) — Supabase client for the browser
- [lib/supabaseAdmin.ts](lib/supabaseAdmin.ts) — server-only client using the Service Role Key
- [lib/apiAuth.ts](lib/apiAuth.ts) — resolves the logged-in user and their nursery in API routes
- [lib/currentGarden.ts](lib/currentGarden.ts) — resolves the current nursery ID on the client
- [types/database.ts](types/database.ts) — table type definitions

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
