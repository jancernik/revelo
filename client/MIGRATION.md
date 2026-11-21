# Revelo frontend: TypeScript migration plan

Worktree: `/home/jan/revelo-frontend-rebuild` (branch `frontend-rebuild`). All work happens
there. Agents never commit, push or open pull requests; the user creates commits.

During the autonomous run, advance after each validated and independently accepted stage.
Evidence is stored in the Git-ignored `client/node_modules/.cache/revelo-migration/`.
The PC reboot cleared the earlier temporary snapshots and isolated runtime. `RECOVERY.md`
in that directory documents recovered agent records, original Git sources and evidence
limits. Earlier live checks used frontend port 5191, API port 5301 and a disposable
PostgreSQL database. That stack is now offline; existing services were not operated.

Stages 5–7 and the audit A test follow-up were committed together as `a867751`.
Stage 8a was committed as `d50cb19`.
Stage 8b was committed as `237ca76`. Group audit B was accepted 2026-11-14 with no
findings; report: `client/node_modules/.cache/revelo-migration/group-b-audit.md`.
Current checkpoint: Stage 9 accepted and ready for the user's commit. Stages 10–12 follow
sequentially with tests-first validation and an independent review per stage. Preserve
unrelated image, navigation and viewer module work.

## Stage tracker

Record the completion date for each stage. Commit fields remain pending until the user commits.

- [x] Stage 0: Test infrastructure and tracker. Completed 2026-11-13. Commit: `99bae66`.
- [x] Stage 1: Tooling, entry point and shared types. Completed 2026-11-13. Commit: `993b4f8`.
- [x] Stage 2: Leaf composables. Completed 2026-11-13. Commit: `36f5c9b`.
- [x] Stage 3: API client and auth store. Completed 2026-11-13. Commit: `24b1d8f`.
- [x] Stage 4: Data stores and useSettings. Completed 2026-11-13. Commit: `b0e0425`.
- [x] Group audit A: Data layer, after Stage 4. Completed 2026-11-14. Accepted, no migration
      regressions or blocking type drift. Report: `client/node_modules/.cache/revelo-migration/group-a-audit.md`. The auditor
      performed DOM login and independently assessed the remaining supervisor-run real-browser
      evidence at `client/node_modules/.cache/revelo-migration/group-a-live-evidence.md`.
- [x] Stage 5: Common components. Completed 2026-11-14. Commit: `a867751`.
- [x] Stage 6: Shell, layouts, router, App. Completed 2026-11-14. Commit: `a867751`.
- [x] Stage 7: Grids and drag reorder. Completed 2026-11-14. Commit: `a867751`.
- [x] Stage 8a: Image form components. Completed 2026-11-14. Commit: `d50cb19`.
- [x] Stage 8b: Settings components. Completed 2026-11-14. Commit: `237ca76`.
- [ ] Group audit B: All components, after Stage 8b.
- [x] Stage 9: Auth and utility views. Completed 2026-11-14. Commit: pending (user).
- [ ] Stage 10: Image views.
- [ ] Stage 11: Collection views.
- [ ] Stage 12: Dashboard index, settings and tasks views.
- [ ] Stage 13: Dev playground and hardening.
- [ ] Final audit: After Stage 13.

## Deferred follow-ups

- [ ] Resolve the six Vue test-host lint warnings in
      `client/src/composables/useDevice.test.ts` and
      `client/src/composables/useWindowSize.test.ts` (component property order and multiple
      host components). Preserve their assertions.
- [ ] Collection cache coherence (audit A, B1): synchronize survivor orders and membership
      after mutations and clear image membership after collection deletion. These are
      pre-existing behavior defects, excluded from the TypeScript-only stages.
- [ ] Search cache coherence (audit A, B2): decide and test an update/invalidation policy
      for separately fetched search results before changing their current behavior.
- [ ] Backend wire-boolean parsing (audit A, B3): parse omitted/true/false explicitly and
      add request-level tests. Authenticated `includeHidden=false` currently coerces to true;
      anonymous and omitted-flag requests still exclude hidden images.
- [ ] Dialog listener cleanup on unmount (Stage 5 baseline): remove the window key listener
      when an open dialog unmounts. The new regression test preserves the existing leak;
      change it only with a separate behavior fix.
- [ ] Upload editor Reset baseline (Stage 8a, P2 baseline): UploadImages immediately echoes
      emitted metadata into `initialMetadata`, replacing the editor's original snapshot.
      Preserve the originally extracted metadata and add a parent-integration regression
      test in a separate behavior fix, not during the view's TypeScript migration.

Audit A's test-contract follow-up A1 corrects the collection-removal response fixture and
adds a realistic add/remove sequence. It asserts the existing divergence between hydrated
collection orders and the stale surviving image-store order. The original JavaScript replay
passes 82 tests. Full validation passes with 32 files and 377 tests, zero lint errors and
the six deferred warnings. Runtime behavior is unchanged.

## 1. Baseline

What exists today (verified 2026-11-13):

- `client/src/pager/` is TypeScript, strict, with 12 colocated vitest files (151 tests). It is
  the house style for everything below: pure modules, typed `defineProps<...>()` with
  `withDefaults`, call-signature `defineEmits`, `useTemplateRef<T>`, `import type`.
- `client/tsconfig.json` is already strict (`strict`, `noUnusedLocals`, `noUnusedParameters`,
  `verbatimModuleSyntax`, `isolatedModules`, `allowJs: true`). It only includes
  `src/**/*.ts` and `src/**/*.vue`; JavaScript is pulled in through imports and not checked.
- ESLint applies `typescript-eslint` recommended to `client/**/*.{ts,vue}` (so
  `no-explicit-any` and `ban-ts-comment` already error), Vue flat recommended, perfectionist
  natural sorting, prettier. lint-staged runs ESLint and prettier on commit.
- Vitest with jsdom and `@vue/test-utils` is configured (`client/vitest.config.js`), without
  setup files, coverage, or any test outside the pager.
- CI runs lint, prettier and the API Jest suite. The client tests and `vue-tsc` are not in
  CI; root `pnpm test` runs the API only.

What remains in JavaScript: 20 `.js` modules and 52 `.vue` files without `lang="ts"`,
about 10,400 lines including templates and styles. All of it is the admin dashboard, auth
views, the dev playground, their stores, composables and utilities, plus the Vite config and
the entry point.

Commands (from the worktree root):

```sh
pnpm --filter client exec vitest run
pnpm --filter client run typecheck
pnpm lint:check
pnpm exec prettier --check client
pnpm --filter client run build
pnpm --filter client exec vite --host --port 5190 --strictPort   # manual checks at /dashboard, /dev
```

## 2. Inventory and dependency map

Arrows read "depends on". Everything also depends on Vue, Pinia or the router as expected.

### Tooling and entry

| File                               | Depends on                                        | Notes                                                        |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| `client/vite.config.js`            | `src/config/environment.js`                       | Node context; not covered by `tsconfig.json`                 |
| `client/vitest.config.js`          | `vite.config`                                     | jsdom, no setup files                                        |
| `client/src/config/environment.js` | `api/src/config/helpers.js` (JavaScript, stays)   | dotenv, Node `fs`                                            |
| `client/src/main.js`               | App, router, settings/collections/images stores   | mounts after `settingsStore.initialize()`                    |
| `client/index.html`                | `/src/main.js`                                    | script tag must follow the rename                            |
| `client/src/App.vue`               | Dialog, Toast, useFavicon, useTheme, layouts/Main | applies theme class to `<html>`                              |
| `client/src/router/index.js`       | every view and layout, auth store                 | custom `production: false` field on routes, filtered in PROD |

### Utilities and API

| File                | Depends on                                      | Used by                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/helpers.js`  | nothing                                         | `debounce` (images store), `getImageVersion` (Image, EditImage views), `getThumbnailPath` (grids). `cssVar`, `clamp`, `lerp`, `smoothingFactor`, `createArray`, `clearArray`, `easeInOutSine` are unused |
| `utils/download.js` | nothing                                         | images and collections stores                                                                                                                                                                            |
| `utils/api.js`      | `stores/auth` (circular, resolved at call time) | all stores, Settings and Tasks views                                                                                                                                                                     |

### Stores (Pinia setup stores)

| File                    | Depends on                                                   | Notes                                                           |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `stores/auth.js`        | api, localStorage                                            | user and accessToken persistence                                |
| `stores/settings.js`    | api, auth, useToast                                          | public settings as `name -> value` map; refetch on token change |
| `stores/images.js`      | api, auth, collections (mutual), useToast, download, helpers | debounced search, local cache updates                           |
| `stores/collections.js` | api, auth, images (mutual), useToast, download               | keeps images in sync via `imagesStore.updateLocal`              |

### Composables

| File                    | Depends on                              | Notes                                                                           |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| `useToast.js`           | nothing                                 | module-level state, auto dismiss timers                                         |
| `useDialog.js`          | nothing                                 | module-level state, `useX` only set by `show`                                   |
| `useDashboardLayout.js` | nothing                                 | module-level header/footer/selection/mobileMenu, partial `Object.assign` merges |
| `useTheme.js`           | localStorage, matchMedia at import time | module-level listeners                                                          |
| `useFavicon.js`         | matchMedia, DOM                         | runs at call time, cleans up on unmount                                         |
| `useWindowSize.js`      | window                                  | resize listener                                                                 |
| `useDevice.js`          | useWindowSize, matchMedia               | breakpoint 650, `(pointer: coarse)`                                             |
| `useRangeSelect.js`     | nothing                                 | shift-click ranges, mutates `selectedIds.value` in place                        |
| `useSettings.js`        | settings store                          | thin wrapper                                                                    |
| `useSortableGrid.js`    | gsap Draggable, ResizeObserver          | drag reorder for `ImageGrid`                                                    |

### Components

| File                                                                       | Depends on                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `components/common/Icon.vue`                                               | `@lucide/vue` (dynamic import by name)                      |
| `components/common/Button.vue`                                             | Icon                                                        |
| `components/common/Input.vue`                                              | Icon                                                        |
| `components/common/Switch.vue`                                             | Icon                                                        |
| `components/common/Toggle.vue`, `Progress.vue`                             | nothing                                                     |
| `components/common/Toast.vue`                                              | Button, Icon, useToast                                      |
| `components/common/Dialog.vue`                                             | Button, Icon, useDialog                                     |
| `components/dashboard/Footer.vue`                                          | Button, useDashboardLayout                                  |
| `components/dashboard/Header.vue`                                          | Button, Icon, useDashboardLayout, useDevice                 |
| `components/dashboard/Sidebar.vue`                                         | Icon, useDashboardLayout, useWindowSize, auth store, router |
| `components/dashboard/ImageGrid.vue`                                       | Icon, useSortableGrid, helpers, router                      |
| `components/dashboard/CollectionGrid.vue`                                  | Icon, helpers, router                                       |
| `components/dashboard/images/ImageUploader.vue`                            | Button, Icon, ImageGrid, useSettings, useToast              |
| `components/dashboard/images/MetadataEditor.vue`                           | Button, Input                                               |
| `components/dashboard/settings/{Input,Switch,Toggle,TextPairs}Setting.vue` | Button, Input/Switch/Toggle, useDialog                      |
| `components/images/ImageMetadata.vue`                                      | Icon                                                        |
| `layouts/Dashboard.vue`                                                    | Footer, Header, Sidebar                                     |
| `layouts/Main.vue`, `Images.vue`, `Collections.vue`                        | RouterView only                                             |

### Views

| File                                                     | Depends on                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `views/Login.vue`, `Signup.vue`                          | Button, Input, useSettings, auth store, router                                             |
| `views/VerificationPending.vue`, `VerifyEmail.vue`       | Button, Icon, useToast, auth store, router                                                 |
| `views/NotFound.vue`                                     | Button, router                                                                             |
| `views/dashboard/Index.vue`                              | CollectionGrid, ImageGrid, useDashboardLayout, useDialog, useToast, both stores            |
| `views/dashboard/Settings.vue`                           | four setting components, useDashboardLayout, useSettings, api                              |
| `views/dashboard/Tasks.vue`                              | Button, useDashboardLayout, useToast, api                                                  |
| `views/dashboard/images/Images.vue`                      | ImageGrid, useDashboardLayout, useDialog, useRangeSelect, useToast, images store           |
| `views/dashboard/images/Image.vue`                       | ImageMetadata, useDashboardLayout, useDialog, useToast, images store, helpers              |
| `views/dashboard/images/EditImage.vue`, `EditImages.vue` | MetadataEditor, (ImageGrid), useDashboardLayout, useToast, images store                    |
| `views/dashboard/images/UploadImages.vue`                | Icon, ImageGrid, ImageUploader, MetadataEditor, useDashboardLayout, useToast, images store |
| `views/dashboard/collections/Collections.vue`            | CollectionGrid, layout, dialog, range select, toast, collections store                     |
| `views/dashboard/collections/Collection.vue`             | ImageGrid, layout, dialog, range select, toast, collections store                          |
| `views/dashboard/collections/CreateOrEditCollection.vue` | Input, layout, toast, collections store                                                    |
| `views/dashboard/collections/SelectCollectionImages.vue` | ImageGrid, layout, range select, toast, both stores                                        |
| `views/dev/Index.vue`, `Sidebar.vue`, `examples/*.vue`   | common components, useToast, useDialog, `import.meta.glob`                                 |

Migration order follows the arrows bottom up: tooling and shared types, utilities,
leaf composables, api + auth store, data stores, common components, shell and router,
grids, form components, views, dev playground. Mutually dependent pairs (api + auth store,
images + collections stores) migrate within one stage.

## 3. Testing approach

### Infrastructure to add (Stage 0)

- `client/src/test/setup.ts` registered as vitest `setupFiles`. It installs only what jsdom
  lacks and the whole suite needs: a `matchMedia` stub returning an `EventTarget` with
  `matches: false`, and `URL.createObjectURL` / `revokeObjectURL` stubs. The pager tests stub
  their own globals with `vi.stubGlobal` and are unaffected. Keep the file tiny.
- `@pinia/testing` as a client dev dependency (`createTestingPinia({ stubActions: false })`
  for component and view tests that need real store logic, or stubbed actions when the test is
  about the view's wiring).
- No HTTP mocking library. `utils/api` is tested by giving the axios instance a custom
  adapter (`api.defaults.adapter = vi.fn(...)`) so interceptors run for real with fake timers.
  Stores are tested with `vi.mock("#src/utils/api")`, asserting on calls, payloads and
  resulting state. Views mock the stores or use a testing pinia.
- Router in tests: `createRouter({ history: createMemoryHistory(), routes })` with stub
  components, or `vi.mock("vue-router")` for views that only call `push`.
- Scripts: client `test:watch`; root `test:client` and `typecheck:client`. Proposed CI
  change: add client tests and `vue-tsc` to `.github/workflows/test.yml` as a second job.
  Approved in advance (decision 6).
- Tests are colocated as `*.test.ts` next to the module, like the pager, and are TypeScript
  from the start even when the module under test is still JavaScript. Imports stay
  extensionless (`#src/...`) so the same test file runs unchanged before and after the
  rename. That unchanged test file is the behaviour-preservation check for every stage.

### What to test

Test contracts and interactions, not implementation details:

- Composables and stores: public return shape, state transitions, side effects
  (localStorage, timers, DOM), error paths, parameters sent to the API, cross-store
  effects.
- Components: rendered output for prop combinations, emitted events and payloads,
  `v-model` round trips, keyboard handling, attribute passthrough (`v-bind="$attrs"`),
  slots, exposed methods, class toggles that drive styling.
- Views: what they register on the dashboard layout (header title and actions, footer
  actions, selection actions) in each state, which store methods they call with which
  arguments, dialogs they open, toasts they show, where they navigate.
- Do not snapshot entire templates. Do not test private helpers through the module's
  exports unless they are exported already.

### Behaviour-preservation rule

Tests are written against the JavaScript module first and must pass. Then the module is
migrated. Then the same tests must pass without edits. If a test must change during
migration, the agent explains why in its report; the only accepted reasons are a type-only
test adjustment (for example a test that passed an intentionally wrong type) or a path where
the old code threw a `TypeError` on an unexpected shape and the new code takes the generic
error path (see the quirk list in section 9).

## 4. Conventions for migrated code

- Rename with `git mv` (`.js` to `.ts`; `.vue` stays, script block gains `lang="ts"`), so
  history follows the file. Update the three store imports that carry a `.js` extension to
  extensionless specifiers. Every other import is already extensionless.
- `<script setup lang="ts">` everywhere. Props via `defineProps<{...}>()` and `withDefaults`
  when defaults exist, like `Pager.vue`. Emits via the call-signature form
  `defineEmits<{ select: [item: Image, event: MouseEvent] }>()`. Template refs via
  `useTemplateRef<HTMLInputElement>("name")`. Exposed API via a typed `defineExpose`.
- Keep `modelValue` prop plus `update:modelValue` emit on the form components. Do not switch
  to `defineModel` in this migration; it adds local fallback state the current components do
  not have. It can be a later, separate change.
- Prop validators that restrict to a set of strings become literal union types and the
  validator is dropped (the type now enforces it). Props typed `[String, Number]` become
  `string | number`. Props typed `Object` or `Array` get the real domain type.
- No `any`, no `as` casts except `as const`, no non-null assertions, no `@ts-ignore` or
  `@ts-expect-error`. Narrow `unknown` with type guards (`axios.isAxiosError`, `instanceof`,
  `typeof`, `Array.isArray`, small user-defined guards). If a cast seems unavoidable, write a
  guard function and a test for it instead.
- Types live next to what they describe: a composable exports its option and state types,
  a component's shared prop types go in `components/common/types.ts`, domain and API types go
  in `client/src/types/` (section 5). Stores export `type XStore = ReturnType<typeof useXStore>`
  only when a consumer needs it.
- Preserve comments when moving code. Add a comment only for a non-obvious constraint.
  No notes about the migration in the code.
- No visual or functional changes. Do not fix the quirks in section 9 as part of a
  migration stage; record them in the stage report instead.
- Lint, prettier, typecheck, tests and build must be green at the end of every stage.

## 5. Shared types and early decisions (Stage 1)

Create `client/src/types/` with two files, verified against the backend code, not guessed:

`types/api.ts`

```ts
export interface ApiSuccess<T> {
  data: T
  status: "success"
}
export interface ApiFailure {
  data: null | { validation?: { message: string }[]; [key: string]: unknown }
  message?: string
  status: "error" | "fail"
}
```

Operational backend errors return `{ status: "fail", data }` without `message`
(`api/src/middlewares/errorMiddleware.js`), so `error.response?.data?.message` is almost
always `undefined` and the stores fall back to the axios message. The types must allow that;
a shared `errorMessage(error: unknown): string` helper in `utils/api.ts` reproduces exactly
`error.response?.data?.message || error.message` with `isAxiosError` narrowing and a
`String(error)` fallback for non-Error values. Stores and views use it instead of repeating
the optional chains on an untyped error.

`types/models.ts` (from `api/src/database/schema.js`, `Image.js`, `Collection.js`,
`Setting.js`, `User.js`, `settings.yml`):

- `ImageVersionType = "original" | "regular" | "thumbnail" | "tiny"`,
  `ImageVersion { height; path; size; storageType: "local" | "s3"; type; width }`.
- `Image`: `id: string`, `aperture`, `camera`, `comment`, `focalLength`,
  `focalLengthEquivalent`, `lens`, `shutterSpeed` as `null | string`; `iso: null | number`;
  `date: null | string` (ISO timestamp in JSON); `hidden: boolean`;
  `captions: null | Record<string, string>`; `collectionId: null | string`;
  `collectionOrder: null | number`; `versions: ImageVersion[]`. The confirm-upload response
  also carries `originalFilename` and timestamps; model those as optional on `Image` or as a
  separate `UploadedImage` extending it. Check `Image.transformImageWithUrls` before deciding.
- `Collection { id; title: null | string; description: null | string; createdAt; updatedAt; images: Image[] }`.
- `User { admin: boolean; email: string; emailVerified: boolean; id: number; username: string }`
  and `AuthPayload { accessToken: string; user: User }`.
- Settings: `SettingType = "toggle" | "integer" | "decimal" | "text" | "textpairs" | "switch" | "select" | "multiselect"`;
  `PublicSetting { name; value }`; `CompleteSetting` as a discriminated union on `type`
  with `category`, `default`, `description`, `name`, `value` and `options` for the switch
  family. `TextPairs = [string, string][]`. A `KnownSettings` interface lists the keys in
  `settings.yml` with their value types (`enableSignups: boolean`, `maxUploadFiles: number`,
  ...), so `useSettings().settings` can be `Partial<KnownSettings>`.
- `ImageMetadataForm`: the nine string fields the editor and the upload flow use
  (`aperture`, `camera`, `comment`, `date`, `focalLength`, `focalLengthEquivalent`, `iso`,
  `lens`, `shutterSpeed`), all `string`, with `date` also allowing `null` because
  `EditImage.vue` sets `null` when the image has no date.
- `UploadReview { metadata: ImageMetadataForm-like; sessionId: string }` from `/upload/review`.
- Task results: `{ deleted; errors; scanned }` and `{ errors; scanned; successful }`.

UI types, colocated:

- `components/common/types.ts`: `ButtonColor = "primary" | "secondary"`,
  `SwitchOption { icon?: IconName; label?: string; value: string }`, `IconName`.
- `useToast.ts`: `ToastType`, `ToastAction`, `ToastOptions`, `Toast`.
- `useDialog.ts`: `DialogAction { callback?: () => void; color?: ButtonColor; icon?: IconName; name: string }`, `DialogOptions`.
- `useDashboardLayout.ts`: `LayoutAction { color?: ButtonColor; disabled?: boolean; icon?: IconName; key?: string; onClick: () => void; text: string }`
  (`key` optional because `Collections.vue` and `Images.vue` header actions omit it).

Decisions, all approved by the user on 2026-11-13. Stage agents apply them without asking:

1. **IconName.** Derive from lucide: `type IconName = Exclude<keyof typeof import("@lucide/vue"), "createLucideIcon" | "Icon" | ...>`, excluding the non-component exports found in the package's `index.d.ts`. The derived type catches typos in templates at typecheck time and costs nothing at runtime.
2. **Dead helpers.** Delete `cssVar`, `clamp`, `lerp`, `smoothingFactor`, `createArray`, `clearArray`, `easeInOutSine` from `utils/helpers` in Stage 1. Nothing imports them (the `clamp` hit in `NotFound.vue` is the CSS function); the pager has its own math.
3. **Router `production` flag.** Move it to `meta: { production: false }` with a `RouteMeta` augmentation (`requiresAuth?: boolean; production?: boolean`) and filter on `route.meta?.production`. Behaviour identical; the current custom top-level field is not a valid `RouteRecordRaw` property.
4. **ImageGrid item type.** `ImageGrid` accepts `GridImage = Image | UploadPreview` where `UploadPreview { id: string; name: string; path: string; size: number }` is what `ImageUploader` builds, and `srcAttribute` becomes `srcAttribute?: "path"` (the only value ever passed). No generic component.
5. **Settings drafts.** `Settings.vue` keeps `currentValues`/`originalValues` as `Record<string, SettingValue>`. The per-type setting components take their precise value type. Settings.vue narrows with small type guards per branch (`isBoolean`, `isTextPairs`, ...) and passes narrowed values; the unknown-type fallback branch stays. No casts.
6. **CI.** Add a client job (install, `vitest run`, `vue-tsc --noEmit`) to `.github/workflows/test.yml` in Stage 0. Approved in advance; the Stage 0 agent edits the workflow without asking again.
7. **Axios config flags.** `_retry` and `_retryCount` on the request config are typed by module augmentation of `InternalAxiosRequestConfig` in `utils/api.ts`.

## 6. Stages

Each stage is one session. Prerequisites are the previous stages unless stated. Every stage
ends with the full validation list in section 7 and a report (section 8 template).

### Stage 0: Test infrastructure and tracker

Scope: `client/vitest.config.js` (setupFiles), `client/src/test/setup.ts`, `@pinia/testing`
dev dependency, `test:watch` script, root `test:client` and `typecheck:client` scripts,
the `test.yml` client job (decision 6), copy of this plan into the repo at
`client/MIGRATION.md` with a checklist of stages.
Tests: a trivial smoke test proving the setup file runs (for example `matchMedia` exists).
Migration: none.
Completion: existing 151 pager tests still pass; new scripts work; tracker committed by user.

### Stage 1: Tooling, entry point and shared types

Scope: `vite.config.ts`, `vitest.config.ts`, `client/tsconfig.node.json` (Node context for
the two configs and `environment.ts`, referenced from `tsconfig.json`), `src/config/environment.ts`,
`src/main.ts` plus the `index.html` script tag, `types/api.ts`, `types/models.ts`,
`components/common/types.ts`, `utils/helpers.ts`, `utils/download.ts`. Also update
`client/package.json` and `pnpm-lock.yaml` for Node typings and checking the Node project
through the existing typecheck script.
Apply decisions 1 and 2 from section 5. The API client, auth store and decision 7 remain
in Stage 3.
Tests first: `helpers` (`debounce` with fake timers: trailing call, latest args, reset on
repeat; `getImageVersion` found, missing version, undefined image returns `{}`;
`getThumbnailPath` fallback `""`), `download` (`getFilenameFromDisposition` quoted, missing,
null; `triggerDownload` creates and removes an anchor, revokes the URL).
Migration: rename, type, delete dead helpers if approved. `environment.ts` types the config
object; importing the API's JavaScript helpers is fine (`allowJs`), add a minimal
`declare module` only if inference fails. `main.ts` is unchanged in behaviour (mount after
settings initialise, other stores initialise unawaited).
Validation: dev server, build and tests run; `vue-tsc` includes the new files.
Completion: no `.js` left in `utils/`, `config/`, root of `src/`, or `client/*.config.*`,
except `utils/api.js`, which remains in Stage 3.

### Stage 2: Leaf composables

Scope: `useToast`, `useDialog`, `useDashboardLayout`, `useTheme`, `useFavicon`,
`useWindowSize`, `useDevice`, `useRangeSelect`.
Tests first (one file per composable):

- useToast: defaults (`type` info, `duration` 4, `dismissible` true, `showIcon` true),
  incrementing ids, auto-remove after `duration` seconds with fake timers, `duration: 0`
  sticks, `remove` unknown id is a no-op, `clear`.
- useDialog: `show` defaults and `dismissible: false`, `hide` resets every field including `useX`.
- useDashboardLayout: `setHeader({ title })` keeps existing actions (partial merge),
  resets, `toggleMobileMenu`/`closeMobileMenu`, returned objects are readonly (assignment
  warns and does not change state).
- useTheme: reads `localStorage` at import, `themeClass` for light/dark/system with the
  media query stub, `setTheme` persists. Use `vi.resetModules` and dynamic import per test.
- useFavicon: creates or updates the `link[rel~='icon']`, switches on media change, removes
  the listener on unmount (mount a host component).
- useWindowSize / useDevice: initial values, resize updates, `isMobile` threshold 650,
  `isTouchPrimary` follows the pointer media query and unsubscribes on unmount.
- useRangeSelect: toggle single, shift-range selects, shift-range on an all-selected range
  deselects, unknown anchor falls back to toggle, `clearLastSelected`.
  Migration: type state and option objects; export the types listed in section 5. Keep the
  module-level singletons and the `Object.assign` partial-merge semantics.
  Completion: all eight are `.ts`; tests unchanged and green.

### Stage 3: API client and auth store

Scope: `utils/api.ts`, `stores/auth.ts`, `errorMessage` helper.
Tests first:

- api: request interceptor adds `Authorization` from the store; near-expiry token triggers
  one refresh even for concurrent requests (promise dedupe) and uses the new token; refresh
  route skips expiry checks but still receives Authorization; unreadable token clears the
  user; 401 retries once and rejects the second failure without logout; the four listed
  auth routes are excluded from the 401 retry; network errors and
  502/503/504 retry up to 5 times with 1s, 2s, 4s, 8s, 16s backoff (fake timers); a
  `/refresh` failure logs out. Drive everything through a custom adapter.
- auth store: initial state from `localStorage` (including the `JSON.parse(null)` case),
  `login` stores user and token and returns the body, `logout` clears even when the request
  fails, `refreshToken` updates the token and clears on failure, `signup`/`verifyEmail`/
  `resendVerificationEmail` call the right endpoints and rethrow, `setUser`/`clearUser`.
  Migration: type the axios instance against `ApiSuccess`/`ApiFailure`; decision 7 for the
  retry flags; `config.url?.includes(...)`. The circular import stays; it is resolved at call
  time inside interceptors. Persisted user state remains `unknown` because stored JSON is
  not validated. Consumers must narrow it without normalizing the stored state.
  Completion: both files `.ts`; tests unchanged and green.

### Stage 4: Data stores and useSettings

Scope: `stores/settings.ts`, `stores/images.ts`, `stores/collections.ts`,
`composables/useSettings.ts`.
Tests first (mock `#src/utils/api`, real pinia, mocked `useToast`):

- settings: `fetchSettings` guards (`loading`, `initialized`, `force`), map derivation,
  error sets `error` and shows a toast, refetch when the auth token changes, `initialize`
  only once, `refreshSettings` forces.
- images: `fetchAll` params (`includeHidden` only when authenticated, `orderBy`/`order`
  only when `orderBy` set), guards, `fetch(id)` returns the cached item without a request
  unless `force`, `uploadForReview` FormData and headers, `confirmUpload` appends,
  `updateMetadata`/`bulkUpdateMetadata` update local items and call
  `collectionsStore.updateImageLocal`, `remove`/`bulkRemove` filter both lists and call
  `removeImageLocal`, `download`/`bulkDownload` filename from disposition with fallbacks,
  `toggleHidden` delegates, `search` is debounced at 300 ms, empty query restores the full
  list, `setOrder` refetches, every error path shows a toast and rethrows.
- collections: `fetchAll`, `fetch` cache replace or append, `create`/`update`/`remove`/
  `bulkRemove`, `addImages` merges ids in collection order and updates `collectionId`/
  `collectionOrder` on the images store, `removeImages` clears them, `setImages` rebuilds
  the `images` array in the new order with `collectionOrder` and clears removed images,
  `getImageIdsInCollection` sorts by `collectionOrder` and accepts an object or an id,
  `updateImageLocal` stops at the first collection containing the image, `removeImageLocal`.
  Migration: typed state (`Ref<Image[]>` and so on), typed options objects, `search` typed
  as `(query: string) => void` (debounce returns nothing). Keep the mutual store imports.
  Completion: all four files `.ts`; tests unchanged and green.

Group audit A after Stage 4 (section 8).

### Stage 5: Common components

Scope: `Icon`, `Button`, `Toggle`, `Progress`, `Input`, `Switch`, `Toast`, `Dialog`.
Tests first (mount with test-utils):

- Icon: lazy loads the named lucide export (mock `@lucide/vue`), size as number and as
  string, reloads on name change, failure logs and renders nothing.
- Button: color class, icon rendering, `iconOnly` hides the slot, attrs pass through to
  `<button>` (`type`, `disabled`, listeners).
- Toggle: checked from `modelValue`, emits on change, disabled.
- Progress: indeterminate when `value` null or flag set, rounded `--progress-value`, string values.
- Input: single and multiline, `v-model` round trip, icon/unit position classes, error vs
  description precedence, `--unit-width` set when a unit exists, attrs pass to the native
  element.
- Switch: renders nothing without options, emits first option on mount when `modelValue`
  is falsy, radio change emits, arrow keys and Enter cycle with wrap in both orientations,
  disabled ignores keys, indicator CSS variables updated after value change.
- Toast: renders toasts from the composable state, icon per type and hidden when
  `showIcon` false, action button calls callback and removes, close button, transition group.
- Dialog: hidden until `isOpen`, overlay click hides when dismissible, the first click after
  opening is swallowed (`openingClickPending`), Escape hides only when dismissible, action
  click runs callback then hides, Cancel hidden with `useX`, close X shown with `useX`.
  Migration: typed props with literal unions (`ButtonColor`, `iconPosition`, `resize`,
  `unitPosition`), `size: number | string`, `SwitchOption[]`, typed emits, typed template
  refs. Toast template: drop the `toast-visible` binding or type `visible` optional (see quirk 4).
  Completion: all eight files typed; tests unchanged and green; `/dev` playground renders every
  example without console errors (manual).

Completed: all eight scripts are typed, with 52 colocated tests passing unchanged from the
JavaScript-first snapshot. Progress retains cast-free runtime props to preserve its range
validator and nullable public value type. All eight real `/dev` examples render and key
controls work without captured runtime errors. Independent review accepted with no findings:
`client/node_modules/.cache/revelo-migration/stage5-review.md`. The reviewer independently replayed all 52
tests on original JavaScript and passed all five validations: 40 files, 429 tests, zero lint
errors and six deferred warnings. Stage snapshot and patch receipts are in the session directory.

### Stage 6: Shell, layouts, router, App

Scope: `Footer`, `Header`, `Sidebar`, `layouts/*`, `App.vue`, `router/index.ts`.
Apply decision 3 from section 5.
Tests first:

- Footer: hidden without actions, renders buttons, click calls `onClick`, disabled.
- Header: title/subtitle mode vs selection mode (`1 item selected` vs `n items selected`),
  action buttons `iconOnly` when mobile (mock `useDevice`), menu button toggles the mobile menu.
- Sidebar: items render, active state for exact `/dashboard` and prefix matches, click
  resets selection and navigates, logout calls the store then navigates to `/login`, menu
  closes on route change and when leaving mobile width, backdrop click closes.
- Router: route names and paths resolve, `requiresAuth` guard redirects to `/login` without
  a token and passes with one, dev routes absent when `import.meta.env.PROD` (stub env).
- App: applies `light`/`dark` class to `<html>` on mount and on theme change.
  Migration: typed sidebar items (`{ icon; key; label; path? ; action?; className? }`),
  `RouteMeta` augmentation, typed routes array.
  Completion: files typed; tests green; manual check of dashboard navigation at 5190.

Completed: the three shell components, all four layouts, App and router are typed, with
44 new tests passing on original JavaScript and TypeScript. One test has a type-only
Vue Test Utils correction from `get(...).exists()` to `find(...).exists()`; assertion
strength is unchanged. Real dashboard navigation, selection, footer cancellation, theme
updates, login/logout and protected redirects pass. Independent review accepted with no
findings: `client/node_modules/.cache/revelo-migration/stage6-review.md`. All five checks pass: 49 files,
473 tests, zero lint errors and six deferred warnings.

### Stage 7: Grids and drag reorder

Scope: `useSortableGrid`, `ImageGrid`, `CollectionGrid`.
Apply decision 4 from section 5.
Tests first:

- useSortableGrid: mock `gsap` and `Draggable.create` to capture configs; `init` measures the
  grid from computed styles (stub `getComputedStyle`), positions items by index, simulated
  `onDragStart`/`onDrag` with a fake `this` (`deltaX`, `hitTest`) reorders only for valid
  moves (same-row direction rule), `onDragEnd` calls `onReorder` with the new image order,
  `cleanup` kills draggables, disconnects the observer and clears props.
- ImageGrid: `shortGrid` shows five plus "View all", selection mode class and emit payload
  `(image, event)`, click opens the image when not selecting and `allowClick`, hidden
  indicator, remove button conditions, actions hidden while selecting, file name and size
  rows, `srcAttribute`, reorder init on `allowReorder` toggle and cleanup on unmount.
- CollectionGrid: three previews max in `shortGrid`, up to four thumbnail paths, `1 image`
  vs `n images`, selection and action emits, untitled fallback.
  Migration: `GridImage` type, typed emits, typed sortable item records.
  Completion: typed; tests green; manual drag reorder in a collection still works.

Completed: all three modules are typed, with 23 JavaScript-first tests and their fixture
unchanged after migration. Seven minimal ImageGrid binding guards preserve both real
image and upload-preview values; DOM structure and styles are unchanged. Actual Chromium
pointer dragging, DOM Save Order and a fresh API read confirm persisted order 0/1/2.
Collection thumbnails and upload previews also pass. Independent review accepted without
findings: `client/node_modules/.cache/revelo-migration/stage7-review.md`. All five checks pass: 52 files,
496 tests, zero lint errors and six deferred warnings.

### Stage 8a: Image form components

Scope: `ImageMetadata`, `MetadataEditor`, `ImageUploader`.
Tests first:

- ImageMetadata: group visibility by available fields, formatting (`f/`, `mm`, shutter
  `1/n` vs seconds, date formatting), exposed root ref.
- MetadataEditor: initialises from `initialMetadata` with defaults and `iso` coerced to
  string, does not emit during initialisation, emits the whole object on edits, reset
  restores and `hasChanges` drives the Reset button, shutter speed display conversion both
  ways on blur and Enter, preview and header toggles, re-initialises when the prop changes.
- ImageUploader: file input and drop selection, rejects non JPEG/PNG and oversize files
  with toasts (both toasts when both fail), preview URLs created and revoked on remove and
  reset, counters and `hasExceededFileLimit`, drag enter/leave counter and `dragActive`,
  `upload` emit payload, exposed API, listeners removed on unmount, limits read from settings
  once at setup.
  Migration: `ImageMetadataForm`, typed exposes, `UploadPreview`.
  Completion: typed; tests green; manual upload flow step 1 and 2 at 5190.

Completed: all three components are typed, with 33 unchanged JavaScript-first tests.
The editor's local state honestly retains nullable non-ISO values and string ISO;
shared `ImageMetadataForm` remains unchanged. Templates and styles are unchanged.
Pre-reboot real upload/review/confirm, metadata display and parent-driven reset checks
passed. The reboot removed raw temporary CDP files; retained observation summaries and
matching test hashes were recovered without inventing old snapshots or timestamps.
A fresh post-reboot review accepted the migration with no required fixes, independently
passing all five checks (55 files, 529 tests, zero lint errors and six deferred warnings)
and all 33 current tests over committed original JavaScript. Report:
`client/node_modules/.cache/revelo-migration/stage8a-recovery-review.md`.

### Stage 8b: Settings components

Scope: `ToggleSetting`, `InputSetting`, `SwitchSetting`, `TextPairsSetting`.
Apply decision 5 from section 5.
Tests first (shared cases): name and description rendered; Reset-to-saved button when
`currentValue !== originalValue`; Reset-to-default button when original differs from
default; the default-reset opens a dialog whose action emits `reset-default`; `update`
payloads. Specific: InputSetting parses integer/decimal and passes text through, NaN keeps
the raw value, `step`, multiline for text; SwitchSetting normalises string and object options
and emits the original option object; TextPairsSetting add/remove/update pairs, editing
index bookkeeping, empty state.
Migration: each component typed to its `CompleteSetting` variant and value type.
Completion: typed; tests green.

Completed: all four components are typed with 44 JavaScript-first tests. Common Switch
option values/emits now honestly allow string, number and undefined, with numeric labels;
its compiled runtime, defaults and native string-versus-keyboard value behavior are unchanged.
The common test listener has a type-only annotation correction. Five insertion-order fixtures
use explicitly ordered entries after a separately approved representation-only exception;
assertions, values, property order and identities were independently verified unchanged.
Three new tests and the shared fixture retain their original hashes. Templates and styles
are unchanged. Independent review accepted with no findings, passing all five checks
(59 files, 573 tests, zero lint errors and six deferred warnings) and the original-source
replay (five files, 56 tests). Report:
`client/node_modules/.cache/revelo-migration/stage8b-review.md`.

Group audit B remains pending; this stage's acceptance does not complete that audit.

### Stage 9: Auth and utility views

Scope: `Login`, `Signup`, `VerificationPending`, `VerifyEmail`, `NotFound`.
Tests first (mock router and auth store, testing pinia for settings): form submit calls the
store with the field values; success navigation by `admin`; error messages; signup
validation list from the API body; redirects on mount when already verified; signups
disabled redirect; resend verification toasts; verify-email token from the query, success
countdown and redirect after 3 s, failure state; NotFound buttons.
Migration: typed refs, `errorMessage` helper, `isAxiosError` narrowing. Keep the dead
`requiresVerification` branch in Login (quirk 2) typed as an optional field on the failure body.
Completion: typed; tests green; manual login at 5190.

Completed: all five views typed with 33 JavaScript-first tests. The auth store keeps
`user` as `unknown` (Stage 4 decision); only two type-only store parameter widenings were
approved (resend email, verify token). VerificationPending renders a narrowed script
computed through one supervisor-approved template interpolation with provably identical
output for every persisted value shape. Signup catches use `isAxiosError` per quirk 13.
Independent review accepted with no code findings; all five checks passed
(72 files, 665 tests, zero lint errors, six deferred warnings) and the 33-test replay ran
over the original sources. Report:
`client/node_modules/.cache/revelo-migration/stage9-review.md` (includes a parent
addendum correcting the reviewer's evidence-root search artifact). Live login at 5190
remains for the user's own environment; the isolated-stack audit covered real login,
guard and logout flows.

### Stage 10: Image views

Scope: `Images`, `Image`, `EditImage`, `EditImages`, `UploadImages`.
Tests first (assert through `useDashboardLayout` state and store mocks): header title and
actions per view and per state (`Images` upload action; `Image` toggle hidden label flips
after toggle; `EditImage` reset action only with changes, save disabled without changes;
`EditImages` redirects for zero or one id, title pluralisation, payload omits empty fields;
`UploadImages` layouts for steps 1 to 3 including `Add More` vs `Select Images`, review
title count, remove last image cancels, confirm payload pairs session ids with edited
metadata); selection actions (`Hide`/`Show` depending on all selected hidden, single vs bulk
edit); delete dialogs call the store and toast; range select wiring.
Migration: typed component instance refs (`InstanceType<typeof ImageUploader>` for the
exposed API), typed action arrays, `ImageMetadataForm`.
Completion: typed; tests green; manual pass over the five routes.

### Stage 11: Collection views

Scope: `Collections`, `Collection`, `CreateOrEditCollection`, `SelectCollectionImages`.
Tests first: header and selection actions per state (single vs multi selection, reorder
mode swaps the header actions), delete dialogs, reorder save calls `setImages` with the
pending order and refreshes the local collection, remove-from-collection action, create
vs edit titles and footer labels, save navigation and toasts, available images filter
(`!collectionId || collectionId === id`), initial selection from `getImageIdsInCollection`.
Migration: typed `Ref<Collection | null>`, typed actions.
Completion: typed; tests green; manual pass over the four routes.

### Stage 12: Dashboard index, settings and tasks views

Scope: `views/dashboard/Index.vue`, `Settings.vue`, `Tasks.vue`.
Tests first: Index selection actions for images and collections (single vs bulk edit,
select-images action only for one collection), delete dialogs, `commitHash` fallback;
Settings fetch with `complete=true`, categories sorted, dispatch by type including the
unsupported fallback, `hasChanges` and `changedSettings` across arrays, objects and
primitives, footer save/cancel appear only with changes and label pluralises, save sends
only changed settings and syncs originals, reset default deletes and refreshes, cancel
restores; Tasks four endpoints, info toast then success toast with the result fields, error toast.
Migration: `Record<string, SettingValue>` drafts with guards (decision 5), typed task results.
Completion: typed; tests green; manual settings save and reset at 5190.

### Stage 13: Dev playground and hardening

Scope: `views/dev/Index.vue`, `views/dev/Sidebar.vue`, `views/dev/examples/*.vue`;
`tsconfig.json` set `allowJs: false`; ESLint config drops the client `*.js` globs and the
JavaScript-only overrides for `client/vite.config.js`, `client/vitest.config.js`,
`client/src/config/environment.js` (replace with the `.ts` paths); `lint-staged` globs
unchanged (API is still JavaScript); remove any stale `jsconfig` references.
Tests: Sidebar props and `navigate` emit; Index loads example modules via `import.meta.glob`
(mock), active section follows hash and intersection (stub `IntersectionObserver`). Example
pages get one mount smoke test each (no console errors, key controls present).
Migration: typed example data (`SwitchOption[]`), `markRaw` components typed as `Component`.
Completion criteria for the whole migration (section 7) all pass.

Final audit after Stage 13.

## 7. Validation and completion

Per stage, run from the worktree root and paste results into the report:

```sh
pnpm exec prettier --check client
pnpm lint:check
pnpm --filter client run typecheck
pnpm --filter client exec vitest run
pnpm --filter client run build
```

Plus the manual check named in the stage, in the dev server on port 5190.

Whole-migration completion checks:

```sh
find client/src -name '*.js' -o -name '*.cjs' -o -name '*.mjs'          # must print nothing
grep -L 'lang="ts"' $(find client/src -name '*.vue')                       # must print nothing
grep -rn --include='*.ts' --include='*.vue' -E '\bany\b|@ts-ignore|@ts-expect-error|\bas [A-Z]' client/src | grep -v 'as const'   # review every hit; target is none
grep -n '"allowJs"' client/tsconfig.json                                   # false or absent
```

Also: every migrated module has a colocated test file; CI runs client tests and typecheck;
`client/MIGRATION.md` has every stage checked with the date and the commit the user made.

No compatibility layers: no `.d.ts` shims for the app's own modules, no re-export barrels
created only to bridge JavaScript and TypeScript, no `// @ts-nocheck` files parked for
later.

## 8. Review and audit cadence

- **After every stage: a light independent review** by a fresh agent, read-only, 15 to 30
  minutes of work. It reads the stage section of this plan, the diff (`git diff` against the
  index or the last commit), and the tests. It checks: tests were added before migration
  and pass unchanged; no behaviour change (diff of templates and logic is type-only); no
  `any`/casts/suppressions; types match the backend; tests test contracts, not internals;
  nothing out of scope touched. It reports findings; it does not fix. The user decides
  whether the migrating agent (same session, context intact) addresses them.
- **Group audits** after Stage 4 (data layer), after Stage 8b (all components), and after
  Stage 13 (final). Deeper: run the app, exercise the flows manually in the browser against
  the real API, compare with `main` where useful, look for drift in shared types, check that
  tests for the lower layers still describe the current contracts, and run the completion
  checks. Findings become small follow-up tasks, not a new migration stage.
- The reviewer gets the code and the plan, not the migrating agent's conclusions.

## 9. Behaviour quirks found during the survey

Preserve these during migration. They are candidates for separate fixes afterwards.

1. The backend returns no `message` for operational errors (`status: "fail"`), so store
   toasts usually show the axios text, such as "Request failed with status code 400".
2. `Login.vue` checks `error.response.data.requiresVerification`, which the backend never
   sends (it sends `data: { user }` with a 401). The branch is dead; `setUser(error.response.data)` would set `user` to `undefined` if it ran.
3. `useDialog` has no `useX` in its initial state; `show` adds it. Typing it as
   `useX: boolean` initialised to `false` is observably identical.
4. `Toast.vue` binds `toast-visible` to `toast.visible`, which is never set. Dropping the
   binding produces identical DOM.
5. `Toast.vue` falls back to the icon name `"info"`, which is not a lucide export; with a
   `ToastType` union the fallback is unreachable.
6. `Switch.vue` emits the first option on mount whenever `modelValue` is falsy, including
   `0` and `""`. It also disables the indicator transition for the first layout via
   `setTimeout` plus `requestAnimationFrame`.
7. `Settings.vue` passes `setting.type` (`integer`, `decimal`, `text`) to `Input`, which
   puts it on `<input type>`; browsers fall back to a text input.
8. Both `images.fetch(id)` and `collections.fetch(id)` return cached objects unless forced.
   Forced collection fetches replace or append cache entries. Image fetches do not populate
   or replace the cache.
9. `images.search` is a debounced function that returns `undefined`; callers cannot await it.
10. `useRangeSelect` pushes into `selectedIds.value` in place for additions, including
    ranges, and reassigns for single or range deselections. Views rely on `deep: true`
    watchers to catch both.
11. `useDashboardLayout.setHeader({ title })` keeps the previous actions (partial merge).
    Views depend on this when they call `setHeader` without `actions`.
12. Header actions in `Collections.vue` and `Images.vue` have no `key`; the `v-for :key`
    is `undefined`.
13. `Signup.vue` reads `error.response.data` without optional chaining on `response`; a
    network error inside `handleSignup` throws from the catch block. TypeScript narrowing will
    route that case to the generic message instead. Accepted change; report it.
14. `ImageUploader.handleFileSelection` reassigns `files` inside a `for...of` over the same
    array, so a file failing both checks shows two toasts; `maxFiles` and `maxUploadSize`
    are read once at setup and are not reactive to settings changes.
15. `ImageUploader.handleRemoveImage` matches by file name, so duplicate names remove the first.
16. `useFavicon` sets a relative `href` (`images/favicon-dark.svg`), which resolves under
    nested routes to a path nginx serves as the SPA shell. `index.html` already declares
    media-query favicons.
17. `useDevice` uses a 650 px mobile breakpoint while `Sidebar.vue` uses 992 px.
18. `EditImage.vue` initialises `date` to `null` when missing, while every other field and
    `MetadataEditor` use `""`; `hasChanges` compares JSON strings.
19. `VerifyEmail.vue` schedules one timer per countdown tick plus a redirect timer and never
    clears them on unmount.
20. `Settings.vue` copies arrays and objects one level deep when snapshotting originals;
    `TextPairsSetting` emits new arrays so this holds today.
21. `main.js` awaits only the settings store before mounting; images and collections load in
    the background and their failures surface as toasts.
22. `api.js` reads `config.url.includes(...)`; `url` can be `undefined` in axios types.
    `config.url?.includes` is equivalent for every real call.
23. Refresh requests bypass token expiry checks but still receive Authorization when an
    access token exists.
24. A second 401 after a successful refresh is rejected without logout. Refresh failure
    does trigger logout.
25. Signup returns only a user, but the auth store still calls `setUser`. Its access token
    becomes `undefined`, and localStorage stores the string `"undefined"`. Stored user JSON
    is not validated; arbitrary truthy parsed values are retained, and invalid JSON throws.
26. Only `/login`, `/signup`, `/verify-email` and `/verification-pending` are excluded from
    the 401 retry. `/logout` and `/resend-verification` are not excluded.
27. Readable token payloads without `exp` are retained without refresh; numeric-string
    expiry values are coerced to numbers.
28. Collection create/update responses are unhydrated rows without `images`. Create caches
    the bare row; update merges it into the existing cache entry and retains cached images.
29. `getImageIdsInCollection` sorts the supplied image array in place. Passing an id forces
    a collection fetch first.
30. `collections.setImages` rebuilds cached images from the old collection and image store,
    ignoring the response's image array. Unresolved ids are dropped and cached ordering is
    compressed, while image-store ordering follows the requested positions. The rebuilt
    collection images retain their old `collectionId` values.
31. Removing a collection does not clear image-store membership locally, although the
    backend clears it in the database.
32. `images.updateLocal` updates the main cache only. Separately fetched search results
    retain their old values.

## 10. Prompt templates

### 10.1 Stage execution prompt

Replace the bracketed parts. Hand the agent this plan file (or its repo copy) alongside.

```
You are migrating one stage of the Revelo frontend from JavaScript to TypeScript.

Repository worktree: /home/jan/revelo-frontend-rebuild (branch frontend-rebuild). Work only
there. Never commit, push, open pull requests or post on GitHub; I commit myself.

Read first, in this order:
1. client/MIGRATION.md (the migration plan). Sections 3, 4, 5, 7 and 9 apply to every
   stage. Your stage is "[Stage N: title]".
2. The files in your stage's scope and everything they import.
3. client/src/pager/Pager.vue, client/src/pager/engine.test.ts and
   client/src/pager/test/helpers.ts as the house style for TypeScript and tests.
4. For backend shapes, the API source under api/src (models, controllers, validation,
   config/settings.yml). Types must match the real responses, not guesses.

Decisions: all seven decisions in section 5 are approved; apply the ones your stage names.

Work in this order and do not skip steps:
1. Baseline: run prettier check, lint, typecheck, vitest and build. All must be green
   before you change anything. If not, stop and report.
2. Tests first. For each module in scope, write colocated *.test.ts files in TypeScript
   that import the module by its extensionless #src path and exercise the behaviours listed
   in the stage section. Test contracts, interactions and edge cases, not implementation
   details or coverage numbers. Run them against the current JavaScript. They must pass.
   If a test reveals a bug, do not fix the bug; write the test to document the current
   behaviour and list the bug in your report.
3. Migrate. Rename with git mv, add lang="ts", type props, emits, refs, state and
   functions following section 4. No any, no casts other than as const, no non-null
   assertions, no @ts-ignore or @ts-expect-error, no compatibility shims. Preserve
   behaviour, templates, styles and comments exactly. Do not refactor beyond what typing
   requires. Do not touch files outside the stage scope except import specifiers that
   must change because of a rename.
4. Verify. The tests from step 2 must pass unchanged. If one needs a change, it is only
   allowed for the two reasons in section 3, and you explain it in the report. Then run
   the full validation list from section 7 and the manual check named in the stage.
5. Tracker. Tick the stage in client/MIGRATION.md with today's date.

Report at the end, in this shape:
- Files migrated and tests added (paths).
- Decisions you had to make that the plan did not cover, with the alternative you rejected.
- Any test changed after migration and why.
- Behaviour quirks or bugs you noticed (do not fix them).
- Output of each validation command (pass/fail, counts).
- Anything left out and why.

Comments and docstrings: minimal, only for non-obvious constraints; no references to the
migration or to the old code; no em dashes or double hyphens as punctuation; avoid the
word "rather".
```

### 10.2 Stage review prompt

```
You are reviewing a completed migration stage of the Revelo frontend (JavaScript to
TypeScript), independently of the agent that did it. Read-only: do not edit files.

Worktree: /home/jan/revelo-frontend-rebuild. The stage is "[Stage N: title]" in
client/MIGRATION.md. Read the plan sections 3, 4, 5, 7, 9 and the stage section first.

Inspect the change with git: [git diff --cached | git diff <base>..HEAD]. For every file in
the stage scope, compare the JavaScript before and the TypeScript after (git show
<base>:<path> for the old version) and read the new tests.

Check and report, with file and line references:
1. Behaviour preservation: any difference in logic, template, styles, defaults, event
   payloads, timing, error handling, or side effects that is not purely type-level.
2. Test quality: were tests written before the migration (check that they target
   behaviours, import by #src path, and would have passed on the old code)? Do they cover
   the behaviours the plan lists? Do they test contracts and interactions, not internals?
   Any test weakened or changed to make the migration pass?
3. Type quality: any any, casts, non-null assertions, suppressions, loose string types
   where a union exists, Object/Array types where a domain type exists, optional fields
   added only to silence the checker, or types that do not match the backend code under
   api/src.
4. Scope: anything touched outside the stage, refactoring beyond typing, comments that
   narrate the migration.
5. Run the validation commands from section 7 yourself and report the results.

Output: a ranked list of findings (severity, location, what is wrong, how you verified it),
then a short verdict: accept, accept with fixes, or redo. Do not fix anything.
```

### 10.3 Group audit prompt

```
You are auditing a group of completed migration stages of the Revelo frontend: stages
[list]. Read client/MIGRATION.md fully, then the migrated code and tests for those stages.
Read-only.

Beyond the per-stage review checks, do the following:
1. Run the app (pnpm --filter client exec vite --host --port 5190 --strictPort with the API
   running) and exercise the affected flows in a browser: [list flows, for example login,
   image upload steps 1 to 3, collection reorder, settings save and reset]. Compare with
   the behaviour on branch main if anything looks different.
2. Check shared types in client/src/types against api/src for drift, and check that lower
   layers' tests still describe the contracts the upper layers rely on.
3. Run the whole-migration completion checks from section 7 and report the state.
4. Look for duplicated type definitions, compatibility shims, or partially typed areas.

Output: findings ranked by severity with evidence, a list of follow-up tasks small enough
for one session each, and a verdict on whether the next stage group can start.
```
