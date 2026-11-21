# Independent audit through Stage 11

## Scope and approach

Reviewed the other agent's TypeScript migration from `7e1ab4d` through `ef4c233`:

| Stages                                  | Commit    |
| --------------------------------------- | --------- |
| 0: test infrastructure                  | `99bae66` |
| 1: tooling, helpers and shared types    | `993b4f8` |
| 2: leaf composables                     | `36f5c9b` |
| 3: API and authentication               | `24b1d8f` |
| 4: data stores                          | `b0e0425` |
| 5–7: common UI, shell, router and grids | `a867751` |
| 8a: image forms                         | `d50cb19` |
| 8b: settings components                 | `237ca76` |
| 9: authentication views                 | `f954efc` |
| 10–11: image and collection views       | `ef4c233` |

Three fresh read-only review lanes examined implementation, tests, callers and baseline
source before consulting the original requirements. Prior implementation notes and verdicts
were consulted afterward. The parent separately checked generated development/production
component code, template/style differences, TypeScript syntax, backend contracts, test
mutations and real-browser integration. A final fresh read-only reviewer accepted the
corrective diff after verifying its tests and a deliberately injected cache-corruption fault.
This was a risk-focused audit, not a claim that every unchanged line or timing interleaving
was exhaustively verified.

The existing pager implementation and unrelated untracked image/navigation/viewer, API and AI
work were excluded from corrective changes. Their tests still ran in the complete suite.
The index was clean at the start and was left unchanged. Stage 12 was not started.

## Issues corrected

### Bulk-edit query normalization

`views/dashboard/images/EditImages.vue` discarded null entries from repeated query parameters.
For example, `?ids=a&ids=b&ids` became `["a", "b"]`, allowing updates to a subset where the
original request `["a", "b", null]` would fail backend validation. Direct URLs are a reachable
entry point even though normal application navigation uses comma-separated IDs.

Restored the original array passthrough. `stores/images.ts` now types that boundary argument
as `(null | string)[]`; this describes incoming route data, not backend acceptance. The server
still rejects null IDs. A new regression failed before the fix and passed against the original
JavaScript. Browser verification against the real API confirmed rejection without modifying
either valid target, while retaining the editor for the error state.

### Assertion-free tests

Removed 37 non-const type assertions from seven authentication/image/collection view tests.
Replaced state assertions with explicit mock declarations and removed redundant fixture casts.
Existing expectations, fixture values, callbacks and identities were retained. This closes a
convention violation that earlier reviews had deferred or overlooked.

## Test improvements and results

Added nine permanent tests:

- Numeric Switch values retain raw numbers on mount/keyboard and native strings on change.
- Bare cached collections render safely and update when hydrated.
- Bulk editing preserves repeated IDs and rejects malformed targets without silently
  changing the target set.
- A rejected bulk metadata request leaves both local caches unchanged.
- Real Pinia collection views exercise reorder success, reorder failure, membership
  selection/filtering, cross-store updates and navigation. Only the API transport,
  decorative icons, notifications and animation driver are mocked in these tests.
- A real MetadataEditor/Input parent test covers initialization, editing, Reset, exact
  string-ISO save payload and navigation.

Nine sampled mutations now cause meaningful test failures. Initially three survived:
numeric Switch coercion, bare collection access, and null-ID filtering. The new tests detect
all three. A further independent optimistic-cache mutation exposed shared expected fixtures
in a new rejection test. Detached snapshots corrected that weakness, and the same mutation
now fails on the changed camera value. Failed-reorder expectations also use detached snapshots.
This is targeted mutation evidence, not a whole-codebase mutation score.

| Required check                         | Result                                              |
| -------------------------------------- | --------------------------------------------------- |
| `pnpm exec prettier --check client`    | Pass                                                |
| `pnpm lint:check`                      | Pass; zero errors, six previously deferred warnings |
| `pnpm --filter client run typecheck`   | Pass                                                |
| `pnpm --filter client exec vitest run` | Pass; 82 files, 747 tests                           |
| `pnpm --filter client run build`       | Pass                                                |

Additional temporary probes compared current and original sources: real API/auth refresh and
persistence, cache reconstruction, native prop behavior, real GSAP cleanup timing, and real
editor/upload failure interactions. Some probe setup attempts failed before execution; only
corrected, successfully executed checks are counted as evidence. One full-suite run concurrent
with other gates hit the router's first-import 5-second timeout; an unchanged solo rerun passed
all 747 tests. The failed receipt is retained. No test timeout or retry policy was widened.

## Browser integration

The parent executed these checks in real Chromium against a disposable API/PostgreSQL stack,
after matching boot ID, process start times and working directories. Unrelated services on
3000/5190 were not operated.

- DOM login, logout/storage clearing and protected-route redirection.
- Image-list DOM selection, supported bulk-edit navigation, Cancel and selection cleanup.
- Native file selection of three PNGs, upload/review, camera metadata editing, confirmation,
  rendered image grids and server metadata readback.
- Collection creation/editing through DOM form controls, image membership selection/save,
  persisted membership, removal and restored initial selection.
- Real mouse drag followed by DOM Save Order; API readback confirmed changed IDs with
  contiguous orders `0/1/2`.
- Real image editor Reset/Save with server metadata readback.
- Malformed repeated-ID bulk request rejection without partial updates and DOM collection
  deletion with server readback.

Public router navigation was used to enter several routes. Mutations used DOM controls;
API calls provided independent readback, not fabricated UI success. An initial probe imported
a second router module instance and changed the URL without changing the mounted view. It was
corrected to navigate the installed router; that probe artifact was not an application defect.
A later hot reload cleared transient probe IDs; recorded disposable IDs were reused safely.
No mail delivery, S3 or AI inference was exercised.

## Comparison with prior reports

Most prior preservation claims are supported by the independent checks. Stage 10's notes
acknowledged null-ID filtering but treated it as outside normal navigation; this audit also
covers direct URLs and restores passthrough. Earlier reviews deferred or overlooked test
assertions that the conventions forbid. Those are now removed. Historical stage test counts
remain historical receipts; this audit deliberately adds coverage and does not claim the
current tests are all byte-identical to their JS-first snapshots.

## Existing issues and remaining limits

These reproduce in the original JavaScript and were not silently changed:

- Failed upload confirmation clears review data; another Confirm can show completion
  without making another confirmation request. This deserves a separate behavior fix.
- Editing and reverting a metadata field can leave Save enabled because numeric ISO in the
  parent becomes a string in the real child editor.
- A pending GSAP completion can emit an empty order after cleanup. No persisted data loss
  was demonstrated.
- Dialog mount/unmount listener boundaries, numeric Switch native/keyboard type differences,
  unvalidated persisted authentication and documented cache-coherence quirks remain.

Newly approved fallbacks and runtime prop-validator differences were distinguished from
byte-identical behavior. In particular MetadataEditor keeps required `previewUrl`, but its
development String validator is lost when accepting undefined. Existing callers and production
rendering remain compatible. CollectionGrid's missing-images fallback is now permanently tested.

Earlier pre-reboot raw evidence is not fully recoverable; the new source comparisons, runtime
probes and browser checks do not reconstruct historical test-first timestamps. Six existing
Vue test-host lint warnings remain. `allowJs`, the remaining untyped views and dev playground
are intentional work for later stages, not proof that the entire migration is complete.

The modular structure, public contracts and established Vue/Pinia patterns are suitable to
build on. No architectural rewrite was justified. Continue only after the user's approval,
with the baseline upload failure and cleanup risks tracked separately.

Detailed receipts and independent lane reports are Git-ignored under
`client/node_modules/.cache/revelo-migration/independent-audit/`; final command logs are
`client/node_modules/.cache/revelo-migration/independent-audit-final-*`.
