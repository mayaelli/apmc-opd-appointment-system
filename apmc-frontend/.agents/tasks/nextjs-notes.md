# Next.js 16.x Breaking Changes — Agent Reference Notes

Installed version: **16.4.0**
Source: `node_modules/next/dist/docs/` (version-matched bundled docs)

---

## 1. Async Request APIs (hard breaking — no sync compat in v16)

These APIs are **fully async** as of v16. Synchronous access that was tolerated in v15 is now removed entirely.

| API | How to use |
|---|---|
| `cookies()` | `const store = await cookies()` |
| `headers()` | `const h = await headers()` |
| `draftMode()` | `const { isEnabled } = await draftMode()` |
| `params` (layouts, pages, routes) | `const { slug } = await props.params` |
| `searchParams` (pages) | `const q = await props.searchParams` |

**In sync (client) components** use `React.use()` to unwrap the promise:

```tsx
import { use } from 'react'
export default function Page(props) {
  const params = use(props.params)
}
```

**Route Handlers** — params are also async:

```ts
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
}
```

**Type helpers** — run `npx next typegen` to generate `PageProps`, `LayoutProps`, `RouteContext` globally.

Migration codemod: `npx @next/codemod@canary next-async-request-api .`

---

## 2. `middleware.ts` → `proxy.ts` (deprecated → renamed)

`middleware` filename and function name are **deprecated** in v16. The file is now called `proxy.ts` (or `proxy.js`).

- Rename `middleware.ts` → `proxy.ts`
- Rename exported function `middleware` → `proxy` (default or named export)
- The `edge` runtime is **NOT supported** in `proxy`. Runtime is always Node.js and cannot be configured. If you need edge runtime, keep the old `middleware.ts`.
- Config flags also renamed: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`

```ts
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

export const config = { matcher: '/about/:path*' }
```

Migration codemod: `npx @next/codemod@canary middleware-to-proxy .`

---

## 3. Turbopack is now the default bundler

- `next dev` and `next build` use Turbopack by default — no flag needed.
- Remove `--turbopack` / `--turbo` from npm scripts.
- If you have a custom `webpack` config, `next build` will **fail** unless you either migrate to Turbopack, or add `--webpack` flag.
- `experimental.turbopack` config has moved to top-level `turbopack` in `next.config.ts`.
- Turbopack does **not** support the legacy tilde (`~`) Sass import prefix — use bare imports instead.

---

## 4. `revalidateTag` now requires a second `cacheLife` argument

```ts
// v15 — one arg
revalidateTag('posts')

// v16 — two args required (TypeScript error if omitted)
revalidateTag('posts', 'max')
```

For immediate expiration (read-your-writes), use the new `updateTag` Server Action API instead.

---

## 5. Async `id` in opengraph-image / sitemap generators

Image-generating functions (`opengraph-image`, `twitter-image`, `icon`, `apple-icon`) now receive `params` and `id` as **Promises**:

```js
// v16
export default async function Image({ params, id }) {
  const { slug } = await params
  const imageId = await id
}
```

`sitemap` generator `id` is also now a Promise:

```js
export default async function sitemap({ id }) {
  const resolvedId = await id
}
```

---

## 6. Partial Prerendering (PPR) — `experimental.ppr` removed

The `experimental.ppr` flag and per-route `experimental_ppr` segment config are gone in v16. PPR is now enabled through:

```js
// next.config.js
module.exports = { cacheComponents: true }
```

If you were already using PPR in a v15 canary, **stay on that canary** — v16 PPR works differently. See the [migrating-to-cache-components](../../../node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md) guide.

---

## 7. Node.js & TypeScript minimums

| Requirement | Minimum |
|---|---|
| Node.js | 20.9.0 (Node 18 dropped) |
| TypeScript | 5.1.0 |
| Browsers | Chrome/Edge/Firefox 111+, Safari 16.4+ |

---

## 8. `next/image` breaking changes

| Change | Detail |
|---|---|
| Local images with query strings | Require `images.localPatterns.search` config |
| `minimumCacheTTL` default | Changed from 60 s → 4 hours (14400 s) |
| `imageSizes` default | `16` removed from array |
| `qualities` default | Changed from all → `[75]` only |
| Local IP optimization | Blocked by default; set `images.dangerouslyAllowLocalIP: true` to allow |
| `maximumRedirects` default | Changed from unlimited → 3 |
| `next/legacy/image` | Deprecated — use `next/image` |
| `images.domains` | Deprecated — use `images.remotePatterns` |

---

## 9. `unstable_` prefix removed from stable APIs

`unstable_cacheLife` and `unstable_cacheTag` are now stable — import without the prefix:

```ts
import { cacheLife, cacheTag } from 'next/cache'
```

New cache APIs added: `updateTag` and `refresh`.

---

## 10. Fetch & Route Handler caching defaults (carried from v15)

- `fetch()` is **not cached by default** — add `cache: 'force-cache'` to opt in.
- `GET` Route Handlers are **not cached by default** — add `export const dynamic = 'force-static'` to opt in.

---

## 11. React 19.2 (App Router)

App Router uses React 19.2 canary. New features available:
- `ViewTransition` component for animated navigations
- `useEffectEvent` hook
- `Activity` component (background rendering with `display: none`)

---

## 12. Misc renamed config options (from v15 → v16)

| Old name | New name |
|---|---|
| `experimental.turbopack` | `turbopack` (top-level) |
| `skipMiddlewareUrlNormalize` | `skipProxyUrlNormalize` |
| `experimental.bundlePagesExternals` | `bundlePagesRouterDependencies` (stable) |
| `experimental.serverComponentsExternalPackages` | `serverExternalPackages` (stable) |
| `experimental.ppr` | Replaced by `cacheComponents` |
| `experimental.reactCompiler` | `reactCompiler` (top-level, stable) |
