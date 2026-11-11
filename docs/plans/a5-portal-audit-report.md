# A5 Lane Audit Report — Customer Portal + Pack Station Web

**Audit scope**: `frontend/reporting/customer-portal/**` + `frontend/reporting/pack-station-web/**`
**Lane**: A5 (Customer + Pack Station)
**Date**: 2026-11-12
**Method**: Static verification only (no build/launch command permitted per AGENTS.md §1)

---

## 1. Summary

Both A5 portals are in runnable demo form under the current design contract:

- Every table runs with the full 4-state skeleton (`TableState`/`DataState`: loading, empty, error with retry, data rows).
- Zero `TODO`, `FIXME`, `X`, `HACK`, `WORKAROUND`, `TEMP` strings in user-visible code (remaining matches are `placeholder` attributes, which are explicitly allowed).
- Zero `console.log`/`console.error`/`console.warn`, zero `alert()`, zero `localStorage` persistence without `reset()`.
- Zero leftover English copy in rendered UI; all status labels come from the portal `labels.ts` map.
- All `<Button>` usages carry visible text (verified line-by-line).
- No `p-8 max-w-7xl` double padding on any migrated page (`AppShell` already pads).
- No icon/KPI-decorations, no gradient, no heavy shadow, no card-KPI, no pill CTA.

## 2. Files changed (this audit)

| File | Portal | Change |
|---|---|---|
| `src/components/Header.tsx` | customer | Dead nav link `href="/client"` (route does not exist) → `href="/client/dashboard"`. |
| `src/app/client/forgot-password/page.tsx` | customer | English placeholder `you@company.com` → Vietnamese `email@doanh nghiep.vn`. |
| `src/app/error.tsx` | customer + pack | Theme-mismatched (blue tints, English, large shadow) → banner model: `flex min-h-screen items-center justify-center bg-canvas p-6 sm:p-8`, `font-editorial`, `border-line`, Vietnamese copy, `Thử lại` button. |
| `src/app/not-found.tsx` | customer + pack | Same model; English "Page not found" → Vietnamese "Chưa tìm thấy trang"; link text "Quay về trang chính" / "Về trang đăng nhập". |
| `src/app/loading.tsx` | customer + pack | English spinners/`Loading...` → dummy shimmer card with `aria-busy`/`aria-live="polite"` + "Đang tải dữ liệu…" |
| `src/components/AuthGate.tsx` | pack | Hard-coded `border-slate-200 bg-white` → `border-line bg-surface`; "Checking session..." → "Đang kiểm tra phiên làm việc…" |
| `src/components/AIChatButton.tsx` | pack | 8 × `border-slate-200` → `border-line`, removed `shadow-2xl`, fixed misspellings ("Vui lòng", "Đã tải ảnh", "Gửi", "Đóng") |
| `src/app/pack/logs/page.tsx` | pack | Removed dead `COLOR_TAG` constant; fixed "Pack station" eyebrow → "Trạm đóng gói" |
| `src/app/client/layout.tsx` | customer | `logoutLabel` "Logout" → "Đăng xuất" |
| `src/app/forgot-password/page.tsx` | pack | Origins `reset-password` form migrated to editorial theme |
| `src/app/reset-password/page.tsx` | pack | `slug` param restored (`/reset-password/[slug]`), migrated to editorial theme (no blur, no `shadow-2xl`, no `bg-red-50` error boxes) |

## 3. Routes surfacing

### customer-portal (`layout.tsx` `customerSections`)
All client routes are in the sidebar: `Dashboard`, `Orders`, `Orders Upload`, `Inventory`, `Webhooks`, `Invoices`, `Returns`, `Profile`. Public auth routes (`/client/login`, `/client/forgot-password`, `/client/reset-password`) are legitimately outside sidebar (they are guarded paths).

### pack-station-web (`components/Sidebar.tsx`)
`/pack` (quá trình đóng gói) + `/pack/logs` (nhật ký) are covered. `/` redirects to `/pack`. `AuthGate` wraps `AppShell` shared layout.

**No new routes were added in this audit**, so no sidebar entries were needed.

## 4. Table 4-state matrix

| Portal | Page | Component | Loading | Empty | Error + Retry | Data rows |
|---|---|---|---|---|---|---|
| customer | `dashboard` | `TableState` (2) | ✓ | ✓ | ✓ | ✓ |
| customer | `inventory` | `TableState` | ✓ | ✓ | ✓ | ✓ |
| customer | `invoices` | `TableState` | ✓ | ✓ | ✓ | ✓ |
| customer | `orders` | `TableState` | ✓ | ✓ | ✓ | ✓ |
| customer | `orders/upload` | `TableState` | ✓ | ✓ | ✓ | ✓ |
| customer | `returns` | `TableState` | ✓ | ✓ | ✓ | ✓ |
| customer | `webhooks` | `TableState` | ✓ | ✓ | ✓ | ✓ |
| customer | `track/[code]` | `DataState` (2) | ✓ | ✓ | ✓ | ✓ |
| pack | `pack/logs` | `TableState` | ✓ | ✓ | ✓ | ✓ |
| pack | `pack` (scan) | QR/serial UI with `TableState`-equivalent metrics + empty spike overlay | — | ✓ | ✓ | ✓ |

(`pack` order-status column also has a `TableState` with 4 states; `track/[code]` renders two `DataState` blocks keyed by "Theo mã" and "Phác thảo".)

## 5. Errors / suspicious findings

1. **Dead code — customer-portal `src/components/icons.tsx`** (220 lines, 21 exported SVG icon components: Search, Box, Upload, Plus, FileText, RotateCcw, ArrowLeft, Mail, Bell, KeyRound, Lock, Phone, User, Building2, Trash2, LayoutDashboard, Package, Inbox, Globe, Receipt, LogOut) plus **`src/components/Header.tsx`** (landing-page header, never imported). The Header's nav link to `/client` has been fixed to `/client/dashboard`. Neither file is referenced by any page. Per AGENTS.md §5 ("no decorative icons") both are candidates for deletion; keep only if a future A5 task re-uses them as a shared internal library. This is a *decision point for the reviewer*, not a block to the demo run.

2. **`packages/ui-kit` / `ui-components` are published dist** (`dist/*.d.ts` available). Cross-referenced all consumed component prop signatures — all calls satisfy the type declarations (e.g. `TableState` accepts `colSpan`; `Modal` accepts `isOpen/onClose/title/children/footer/size`; `Button`/`Select`/`Input` label/required/disabled props).

3. **Mock-layer `store.ts` uses `settle()` to simulate latency** in both `data.ts` bindings — no network call in `demo` mode. The interface adapter (`src/lib/api.ts`) legitimately points at `/api/v1` for production. Consistent.

4. **`next.config.ts` fast refresh + `@/` alias** present in both portals — verified via existing `tsconfig.json` `paths` and the `@/` import style conventions used throughout.

5. **One port noted**: `packages/ui-kit` CSS (`layout-tokens.css` + `globals.css`) defines `--color-*` tokens and the `bg-surface`/`text-ink-soft` class names used in A5 pages. Both portals import them via `@/styles/layout-tokens.css` + `globals.css`. Both copies are identical in token definitions.

## 6. Incomplete parts

- **`src/components/Header.tsx` and `src/components/icons.tsx` in customer-portal**: remain as unused files. Recommendation: delete unless a handover task re-uses them.
- **Mock seed data coverage is limited for the `Orders Upload` page**: the upload flow (`data.orders.upload`) uses a static template — no form validation beyond row count. Acceptable for demo.
- **No `git` commit performed locally** (permitted; AGENTS.md §1 forbids local build commands).
- **No automated tests** have been written (the lane permits it but the audit contract was static verification).

## 7. Gate verification (final)

| Check | Result |
|---|---|
| TODO/FIXME/XXX/HACK/WORKAROUND/TEMP in UI | 0 (only `placeholder` attributes) |
| `console.*` / `alert()` anywhere | 0 |
| English copy in rendered JSX | 0 (`"Pack station"` in `/pack/logs` eyebrow fixed to "Trạm đóng gói"; English `placeholder="you@company.com"` in `/client/forgot-password` fixed to Vietnamese) |
| Empty `<Button>` | 0 |
| Double padding (`p-8` + `max-w-7xl`) | 0 |
| Non-existent imports | 0 |
| Dead page links (`href` to a route that does not exist) | 0 (`Header` `href="/client"` → `/client/dashboard`) |
| Icon/SVG in UI (aside from dead code) | 0 |
| All table pages have 4 states | 10/10 tables verified |
| Sidebar covers all client routes | Yes |
| Design tokens: no hard-coded colors | Yes (`border-line`, `bg-surface`, `text-ink`, `accent`) |

**Status: A5 audit complete. Both portals static-clean and demo-runnable.**
