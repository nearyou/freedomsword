# Dynamic Democracy UI refresh

Implemented and validated on October 8, 2026 (Asia/Tokyo).

## Scope

The citizen UI, election-manager UI, and public transparency styling now share navy/blue panels, consistent radii, spacing, controls, status colors, and light/dark design tokens. The supplied `logo.jpg` is used as the brand mark, with the Dynamic Democracy name retained. `public/brand/logo.jpg` is an unchanged copy of the supplied file.

Telegram HMAC verification, eligibility providers, agreements, casting/recall transactions, persistence, Prisma models, migrations, audit/outbox services, idempotency, rate limits, election lifecycle enforcement, and manager authorization were not replaced or simplified. No migrations or mutation services were changed. Existing tests were retained.

## Component organization

- `src/components/DemocracyApp.tsx`: screen composition, selected election, tabs, and exclusive modal coordination.
- `src/components/layout/`: app shell, sidebar, and mobile navigation.
- `src/components/elections/`: selector and selected election configuration/date summary.
- `src/components/candidates/`: search, sort, cards, and profile with Overview/Platform/Promises/Updates tabs.
- `src/components/onboarding/`: three-step Citizen Passport and versioned agreement review/acceptance.
- `src/components/voting/`: vote/recall confirmation, private ballot meter, policy/timing/count display.
- `src/components/results/`: Recharts snapshot, support ranking, participation, original/recalled/active units.
- `src/components/accountability/`: promise cards and optional future history-entry presentation.
- `src/components/admin/`: typed management actions and section-specific fields.
- `src/components/AdminPanel.tsx`: authorized dashboard, grouped actions, draft-state explanations, and confirmation orchestration.
- `src/components/ui/`: shared dialog, avatar, ideology badge, brand mark, progress bar, and skeleton cards.
- `src/hooks/`: citizen/election polling, Telegram launch/safe-area handling, and action/retry state.
- `src/lib/client-api.ts`, `src/lib/ui.ts`, `src/lib/ballot-ui.ts`: client request errors/timeouts and display calculations.
- `src/app/globals.css`, `src/app/theme.css`: shared responsive styles and reusable theme variables.
- `src/app/layout.tsx`, `src/components/ThemeControl.tsx`: supported Next.js theme bootstrap, favicon, safe-area viewport, and appearance preferences.
- `src/components/AuditExplorer.tsx`, `src/components/PromiseTracker.tsx`, `src/components/useModalAccessibility.ts`: existing experiences adapted to the shared components and styles.
- `src/app/elections/[id]/transparency/page.tsx`: shared brand mark and updated public presentation.

## Safe, additive read fields

Two read projections were extended; mutation contracts are unchanged:

- `src/server/elections.ts` and `src/lib/contracts.ts`: public platform `createdAt` for the actual version date. Platform dates were already present in public transparency.
- `src/app/api/me/route.ts` and `src/lib/contracts.ts`: optional private ballot `castAt`, `recallCount`, and `lastRecallAt`, derived from the authenticated citizen's existing records. Only display fields are returned; no event payloads, request IDs, credentials, ballot pseudonyms, or Telegram identifiers are added.

The existing private-projection integration test now verifies these values against the ledger and checks the exact ballot-field allowlist.

Regression additions are in `tests/ballot-ui.test.ts`, `tests/theme.test.ts`, and the extended `tests/voting.integration.test.ts`.

## UX changes

- Loading skeletons, clear empty states, network/stale banners, retries, and success/error feedback.
- A temporary private polling failure retains the last known authenticated state and ballot. A confirmed 401 still clears an expired/revoked session. Recalls are disabled with a refresh explanation while private state is stale.
- Bounded requests and overlapping-poll suppression; mutations request a fresh read after completing. Vote/recall retries retain their request ID and payload.
- Candidate initials replace unavailable photos. No decorative candidate verification checkmarks remain.
- Profiles show actual support, endorsement count, platform version/date/hash, readable content, promises, and an honest empty Updates state.
- Citizen acceptance and endorsements are labeled as authenticated consent/commitment records, without claiming a real cryptographic user or candidate signature.
- The support meter derives segment widths/fills from the actual partial-recall amount, including non-divisors of 100. Gap sizing remains bounded for 1-unit policies on narrow screens.
- Recall counts and availability use actual private timestamps/counts and configured policy. The time remaining is labeled as the election window, not an unsupported office term.
- Results distinguish original units, recalled units, and active support. Participation is ballots cast; no eligible-population denominator or turnout percentage is invented.
- Admin actions are grouped into Election, Candidates, Platforms, Promises, Recall policy, and Lifecycle. Activation, withdrawal, closing, and archiving require review of the actual election/candidate before submission.
- Draft datetime fields use local input values correctly before conversion to ISO timestamps.
- Dialog focus trapping, background isolation, keyboard dismissal/restoration, reduced motion, device/Telegram safe areas, and System/Light/Dark preferences are preserved.
- System mode follows Telegram only for a real launch; an outside-browser SDK default no longer overrides the device scheme.

## Validation

- `npm run check`: TypeScript and ESLint passed; **75 tests in 22 files passed** (68 original tests plus four ballot-display tests and three appearance tests).
- `npm run test:integration`: **32 tests passed** on a newly created isolated PostgreSQL database using all 13 unchanged migrations. The runner removed its temporary database.
- `npm run build`: optimized Webpack build passed with validated staging configuration, HTTPS origin settings, demo authentication disabled, and `.next-staging` output. No production authentication policy was weakened.
- Browser QA used a separate `dd_ui_test_*` database and existing authentication/services. Existing demo ballots and other running checkouts were not used for mutations.
- Browser checks covered local demo connection, MOCK verification, agreement review/acceptance, full-name search, A–Z/support sorting, cast confirmation, casting, partial recall (100 → 75), full recall in another election (100 → 0 with the ballot still consumed), platform endorsement/hash presentation, promise evidence expansion, and public audit-page link verification.
- Manager QA covered draft policy saving, activation review and publication, withdrawal cancellation, early-close review/commit, and archive review/cancellation. Authorization enforcement remains covered by the regression suite.
- A QA-only local proxy returned 503 for private polling. The verified account and 75-unit balance remained visible, the refresh banner appeared, and recalls were disabled until recovery.
- Optimized public UI checks at 320px, 390px, 820px, and 1440px found no page-wide horizontal overflow. Admin and audit dialogs also passed the 320px width check. The optimized public page had no console errors.

## Screenshots

Captures are local artifacts in the ignored `artifacts/` directory. Public production-build screenshots use disposable fictional QA tallies (including a lifecycle test election), not synthetic preview numbers or the user's persistent demo database.

- `artifacts/ui-desktop.jpg`: optimized desktop home, 1440px viewport.
- `artifacts/ui-mobile-390.jpg`: optimized mobile home, 390px viewport.
- `artifacts/ui-mobile-390-full.jpg`: full mobile page.
- `artifacts/ui-mobile-320.jpg`: full minimum-width mobile page.
- `artifacts/ui-tablet.jpg`: 820px tablet page.
- `artifacts/ui-results-390.jpg`, `artifacts/ui-promises-390.jpg`: mobile results and accountability.
- `artifacts/ui-admin-desktop.jpg`, `artifacts/ui-admin-320.jpg`: authorized management UI.
- `artifacts/ui-passport-390.jpg`, `artifacts/ui-vote-confirm-390.jpg`, `artifacts/ui-platform-390.jpg`, `artifacts/ui-audit-320.jpg`: interaction QA captures.

## Remaining reference/data limits

The supplied image is a Freedom Sword logo, not the promised UI layout reference. Exact comparison of layout, colors, proportions, and spacing remains pending that reference image. The current design follows the written brief.

No candidate photo data, candidate cryptographic signatures/public keys, dated candidate updates, or promise history is currently supplied by the backend. Initials and honest empty states are used. Current platform versions and dates are displayed without hardcoding v2. Promise-history presentation accepts optional future entries, but none are fabricated. Real Telegram client acceptance was not repeated during this frontend task.
