# Emoji Studio: Comprehensive UI/UX Audit

## Goal

Ship-ready polish for desktop-primary users. Find and fix every rough edge real users encounter, address structural debt in the largest components, and bring accessibility to a baseline standard.

## Approach

Comprehensive code audit of all 12 pages and shared components, followed by implementation in 6 dependency-ordered batches. A browser walkthrough runs during the audit phase to catch visual issues code reading alone misses.

---

## Issue Inventory

### Tier 1: User-Visible Every Session

| # | Issue | File | Lines | Severity |
|---|-------|------|-------|----------|
| 1 | **Desktop scrollbars hidden globally.** `scrollbar-width: none` on `*` hides all scrollbars. A styled scrollbar defined later (lines 586-604) can never take effect. Desktop users cannot tell which panels are scrollable. | `app/globals.css` | 64-74, 586-604 | Critical |
| 2 | **`user-scalable=no` in viewport meta.** Blocks pinch-to-zoom, fails WCAG 2.1 SC 1.4.4. Red flag for accessibility auditors. | `app/layout.tsx` | 27 | High |
| 3 | **Global `touch-action: manipulation` on `*` selector.** Mobile-first lockdown applied to all elements including desktop. Could interfere with drag-and-drop on the Create page. | `app/globals.css` | 69 | High |
| 4 | **Dead `styles/globals.css` file.** Not imported anywhere (confirmed via grep). Contains `body { font-family: Arial }` that would override Geist fonts if ever imported. Contains a parallel set of theme variables that duplicates `app/globals.css`. Creates confusion for future developers. | `styles/globals.css` | entire file | Medium |

### Tier 2: Experienced During Specific Workflows

| # | Issue | File | Lines | Severity |
|---|-------|------|-------|----------|
| 5 | **`javascript:history.back()` in Next.js Link.** XSS vector pattern, doesn't work with client-side routing. Should use `useRouter().back()` with a Button. | `app/not-found.tsx` | 28 | High |
| 6 | **Conditional hook call with eslint-disable.** `useSidebar()` in a try/catch violates Rules of Hooks. Works today but brittle under refactoring. | `components/app-sidebar.tsx` | 717-723 | Medium |
| 7 | **303 `console.log/warn/debug/info` calls across 40 files.** Produces noise in DevTools. Worst offenders: `parse-slack-curl.ts` (20), `emoji-processor.ts` (19), `indexed-db.ts` (18), `chrome-extension.ts` (18), `refresh-button.tsx` (14), `gif-frame-extractor.ts` (17). | Multiple | - | Medium |
| 8 | **Sparse ARIA/keyboard support.** Only 8 aria/role/tabIndex/onKeyDown occurrences across all 12 page files. Explorer grid, My Emojis table/grid, and emoji overlays are mouse-only. Keyboard users cannot navigate emoji grids or trigger context menus. | All pages | - | Medium |
| 9 | **Framer Motion ignores `prefers-reduced-motion` on main pages.** CSS global override (line 471) kills CSS animations but Framer Motion JS animations bypass it. The Wrapped slides correctly use `useShouldReduceAnimations()`, but dashboard, explorer, create, and leaderboard pages do not. | `app/globals.css`, multiple pages | 470-479 | Medium |

### Tier 3: Code Quality / Maintenance

| # | Issue | File | Lines | Severity |
|---|-------|------|-------|----------|
| 10 | **`my-emojis/page.tsx` at 2880 lines.** Contains table view, grid view, 4 action dialogs, bulk operations, keyboard shortcuts, processing modals, and download logic in a single file. | `app/my-emojis/page.tsx` | entire file | High (maintenance) |
| 11 | **Duplicate `useIsMobile` hook.** `hooks/use-mobile.tsx` returns `boolean \| null` (SSR-safe). `components/ui/use-mobile.tsx` returns `boolean` (coerces via `!!`). The UI version is dead code -- nothing imports it. | `components/ui/use-mobile.tsx` | entire file | Low |
| 12 | **Duplicate `isClient` hydration guard pattern.** Six pages independently implement `useState(false)` + `useEffect(() => setIsClient(true), [])`. Should be a shared hook. | Dashboard, Explorer, Leaderboard, My Emojis, Visualizations, Wrapped | - | Low |
| 13 | **Duplicate inline date formatters.** Explorer and Visualizations pages each define a local `format()` function to avoid importing date-fns. Near-identical but not shared. | `app/explorer/page.tsx:19`, `app/visualizations/page.tsx:29` | - | Low |
| 14 | **CSS variable duplication.** `app/globals.css` defines theme variables at lines 336-448 (with Wrapped tokens, oklch colors). `styles/globals.css` defines a parallel set at lines 15-100. The `styles/globals.css` set is dead but creates confusion. | Both CSS files | - | Low |

---

## Implementation Plan

### Batch 1: CSS Foundation (~1 hour)

**Files:** `app/globals.css`, `app/layout.tsx`, `styles/globals.css`

1. **Fix scrollbar hiding (Issue #1)**
   - Remove `scrollbar-width: none` and `::-webkit-scrollbar { display: none }` from the `*` selector (lines 65-73)
   - Keep the styled scrollbar rules at lines 586-604 (they'll now take effect)
   - Add a mobile-only media query to hide scrollbars on mobile (preserving app-like feel)
   - Result: desktop users see subtle styled scrollbars, mobile stays clean

2. **Remove `user-scalable=no` (Issue #2)**
   - Change viewport meta (line 27) to: `width=device-width, initial-scale=1.0, viewport-fit=cover`
   - Remove `maximum-scale=1.0` and `user-scalable=no`

3. **Scope `touch-action: manipulation` to mobile (Issue #3)**
   - Move the `*` selector rule (line 69) inside the existing `@media (max-width: 768px)` block
   - Keep it on `body` for mobile, remove from `*` for desktop

4. **Delete dead CSS file (Issue #4, #14)**
   - Delete `styles/globals.css` entirely (not imported anywhere, confirmed)
   - Verify no build config references it

### Batch 2: Safety & Hook Fixes (~1 hour)

**Files:** `app/not-found.tsx`, `components/app-sidebar.tsx`, `components/ui/use-mobile.tsx`, new `hooks/use-is-client.ts`

1. **Fix `javascript:history.back()` (Issue #5)**
   - `not-found.tsx` is currently a server component. Add `"use client"` directive.
   - Replace the `<Link href="javascript:history.back()">` with a `<Button onClick={() => router.back()}>` using `useRouter()`
   - Keep the "Go to Dashboard" link as-is (it uses a static href)

2. **Fix conditional hook in app-sidebar (Issue #6)**
   - The `AppSidebar` is always rendered inside `SidebarProvider` (confirmed in `app/layout.tsx` line 80). The try/catch is unnecessary.
   - Remove the try/catch and call `useSidebar()` directly
   - Remove the eslint-disable comment

3. **Delete dead `useIsMobile` duplicate (Issue #11)**
   - Delete `components/ui/use-mobile.tsx` (nothing imports it)

4. **Extract shared `useIsClient` hook (Issue #12)**
   - Create `hooks/use-is-client.ts` with the common pattern
   - Update the 6 pages that use the inline pattern

### Batch 3: Console.log Cleanup (~2 hours)

**Files:** 40 files with 303 occurrences

**Strategy:**
- Remove all `console.log` calls entirely from UI components and page files
- Keep `console.error` for actual error handling paths
- Keep `console.warn` for deprecation warnings
- For library/utility files (`emoji-processor.ts`, `indexed-db.ts`, etc.): remove debug logging, keep error logging
- For `app-sidebar.tsx` navigation handler (lines 726-748): remove all 5 console.log calls in `handleNavigate`

**Highest-priority files (10+ occurrences):**
- `lib/utils/parse-slack-curl.ts` (20)
- `lib/utils/emoji-processor.ts` (19)
- `lib/storage/indexed-db.ts` (18)
- `lib/chrome-extension.ts` (18)
- `lib/utils/gif-frame-extractor.ts` (17)
- `lib/hooks/use-emoji-data.tsx` (16)
- `components/dashboard-overlay.tsx` (16)
- `lib/services/mobile-emoji-fetch.ts` (14)
- `components/refresh-button.tsx` (14)
- `lib/utils/share-image.ts` (10)

### Batch 4: Accessibility Pass (~2-3 hours)

**Files:** All page files, `components/ui/sidebar.tsx`, overlay components

1. **Reduced motion for Framer Motion (Issue #9)**
   - Create a `useReducedMotion()` wrapper or use Framer Motion's built-in `useReducedMotion` hook
   - Apply to all pages that use `motion.div` / `AnimatePresence` outside Wrapped:
     - `app/create/page.tsx` (uses `motion` + `AnimatePresence`)
     - `app/create/components/FileUploadZone.tsx`
     - `app/create/components/ExtensionBanner.tsx`
     - `components/pack-browser.tsx`
     - `components/mobile-emoji-drawer.tsx`
     - `components/dashboard-insights.tsx`

2. **Basic ARIA for interactive grids (Issue #8)**
   - Explorer page emoji grid: add `role="grid"` with `aria-label`, grid items get `role="gridcell"` with `aria-label` describing emoji name
   - My Emojis table: already uses `<Table>` component (semantic), verify headers are properly associated
   - My Emojis grid view: add `role="grid"` similar to explorer

3. **Keyboard navigation for emoji selection**
   - Add `tabIndex={0}` and `onKeyDown` (Enter/Space to select) for emoji grid items in Explorer and My Emojis
   - Arrow key navigation within grids

4. **Focus management in overlays**
   - Verify `EmojiOverlay` and `UserOverlay` trap focus when open
   - Verify Escape key closes overlays (likely handled by Radix/shadcn already)

5. **Verify skip-to-content link**
   - `app/layout.tsx` line 59 has a skip link targeting `#main-content` (line 84). Verify it works correctly.

### Batch 5: My Emojis Decomposition (~3-4 hours)

**File:** `app/my-emojis/page.tsx` (2880 lines)

**Target architecture:**

```
app/my-emojis/
  page.tsx              (~100 lines) - Orchestrator, layout, routing
  components/
    my-emojis-toolbar.tsx   - Search, view toggle, sort, filter controls
    emoji-table-view.tsx    - Table/list view with sortable columns
    emoji-grid-view.tsx     - Grid view with context menu
    emoji-action-dialogs.tsx - Rename, Replace, Alias, Delete dialogs
    bulk-operations-bar.tsx  - Bulk selection bar with actions
  hooks/
    use-my-emojis-state.ts  - All state management, filtering, sorting logic
```

**Decomposition strategy:**
1. Extract state management into `use-my-emojis-state.ts` first (this is the foundation everything else depends on)
2. Extract the 4 action dialogs into `emoji-action-dialogs.tsx` (self-contained, just need selectedEmoji + callbacks)
3. Extract table view and grid view as separate components
4. Extract toolbar (search, filters, view toggle)
5. Extract bulk operations bar
6. Page becomes a thin orchestrator wiring components together

**Risk mitigation:**
- Each extraction is a standalone commit so regressions can be bisected
- Run `npm run build` after each extraction to verify no type errors
- Visual diff: the page should look identical before and after

### Batch 6: Visual Polish + Browser-Discovered Issues (~2-3 hours)

This batch addresses issues found during the browser walkthrough. Until the walkthrough runs, here are the known visual improvements:

1. **Consistent page header pattern**
   - Currently each page handles its own title differently. Standardize using a shared `PageHeader` component with title + optional description + optional actions slot.

2. **Theme consistency**
   - Browser walkthrough will identify any dark/light mode rendering issues
   - Fix any cards, backgrounds, or text that don't properly respond to theme changes

3. **Responsive edge cases**
   - Test sidebar collapse/expand at 1024px breakpoint
   - Test content overflow on charts at narrow desktop widths

4. **Duplicate inline date formatters (Issue #13)**
   - Extract shared `formatDate()` utility from the near-identical implementations in Explorer and Visualizations

---

## Verification Plan

After each batch:
1. `npm run build` -- verify no TypeScript or build errors
2. Visual check: load each page in Chrome desktop at 1440px
3. Theme toggle: verify dark and light mode
4. Keyboard: Tab through the page, verify focus visibility

After all batches:
1. Full browser walkthrough of all 12 pages at 1440px, 1024px, 768px
2. Lighthouse audit for accessibility score
3. `npm test` -- verify no test regressions
4. Open DevTools console -- verify no stray console.log output
5. Test with `prefers-reduced-motion: reduce` enabled in Chrome DevTools

---

## Out of Scope

- iOS PWA testing (desktop primary)
- Chrome extension compatibility (verified unchanged in v1.3.0)
- Wrapped experience redesign (its own isolated feature)
- New features or functionality changes
- Performance profiling (covered in v1.3.0)
