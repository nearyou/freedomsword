# FreedomSword — client design direction

## Telegram invitation destination — 30 October 2026

New invitations link to `https://t.me/freedomswordbot?startapp`, opening FreedomSword's main Mini App through Telegram. Use this destination for the visible invitation link, copied invitation, Instagram copy action, device share and every network's URL/text payload. English/Ukrainian labels identify the destination as the Telegram Mini App. The website continues to host the app and review artifacts.

## Image exports and startup — 30 October 2026

Each review step (3–18) now has a numbered PNG under `/review/user-flows/images/`, with full-content exports, initial phone views, an overview and a ZIP download. Regenerate with `node scripts/export-user-flow-images.mjs --runtime-modules <directory containing playwright and sharp>` after updating the HTML review. The renderer uses an isolated headless browser and serves local review assets directly; it does not use a signed-in desktop browser profile. Full-content exports expand long dialogs and move fixed navigation below the content so it does not cover review text.

The Mini App now loads the official Telegram SDK from the same site and signals native readiness once its server-rendered HTML is available, independently of React hydration and API requests. Client hooks recognize both preloaded and late SDK initialization. Server-side validation of Telegram launch data and voting eligibility remains required. This addresses a startup dependency that can hold Telegram's loading overlay open; the affected client's connection still needs a device check.

## Language, sharing and review — 30 October 2026

Remember the language selected on either opening screen for the main desktop/mobile menu, page headings, feedback links and invitation controls. English and Ukrainian use the same stored preference; it can also be changed in the app header. Candidate content retains its published language.

The support diagram and remaining-support bar use the projected/saved amount: 100 blue, 75 green, 50 yellow, 25 red, 0 gray. Exact values between quarter marks use the next quarter's color. Keep four sections and explicit adding/recalling labels; gestures still edit a draft until confirmation.

The invitation uses the client's approved three English lines beginning “True democracy starts with your anonymous vote.”, or their Ukrainian translation. Show it during connection onboarding and after voting. Retain a visible current-demo disclosure, including in text-sharing payloads. Instagram is an explicit network choice: copy the invitation and open Instagram for pasting. Every listed network has a recognizable icon.

The ordered static review is published at `/review/user-flows/index.html`, with screens 3–18 and full-size links for each. Run `node scripts/generate-user-flow-review.mjs` to regenerate it from the app components and sample states. The agreement, cooldown and audit examples are labeled as illustrations. These review pages make no API calls and cannot submit votes or consent.

## Viewport correction — 30 October 2026

The second opening screen fits Telegram's stable viewport, with safe-area padding included. Center the five benefit rows in the available content area, using smaller spacing and icons on shorter phones. Reserve separate rows for the forward button and demo disclosure so neither can scroll below the viewport or be covered by the city artwork. On very short screens or with enlarged text, only the benefit list scrolls; navigation stays visible. Keep the accepted first screen, language selector and later dark theme unchanged.

## Client correction — 29 October 2026

Follow-up: the second screen has five matching left-icon rows. A ballot icon accompanies election types; a helping-hands icon accompanies issues for Ukraine. Keep the city background behind the lower rows. Both opening screens use a compact globe/language selector, with Change language retained as its accessible label. Support controls use a ring and horizontal scale split into four equal 25-unit sections: retained support is blue, draft additions are mint with a plus label, and draft recalls are amber with a minus label. The center shows support after the proposed change. The existing confirmation and cooldown rules remain authoritative; the visual changes do not submit actions.

The user clarified that both opening screens must remain light. Restore the original large-emblem, light city launch with “Take back control. Manage your vote. Shape what comes next.” and its blue Telegram button, without yellow text highlighting. Show a visible Change language control on both opening screens, including inside Telegram. The second screen keeps the three corrected benefits (verified citizens, real-time updates, transparency/accountability), city illustration, election types, Ukraine issues, and circular gold forward button, using ivory surfaces and dark readable text. Preserve explicit mock-verification and privacy disclosures. Dark navy begins at “Let’s get you ready” and continues through later screens.

Support adjustments use a slider and a swipe row: left subtracts 0.25 vote (25 of 100 units), right adds 0.25, clamped to the available budget. The user confirmed this interpretation. Gestures only edit a draft; a separate confirmation saves it. Reusable-support recalls become available six calendar months after each withdrawal; cooling units cannot be added early. Original ballots keep their published recall policy. Feedback bot descriptions, help and acknowledgments are Ukrainian.

## Welcoming and equal — 29 October 2026

The service should feel like a shared community, with equal standing and an equal voice. Use welcoming, plain language rather than institutional or commanding labels. The community introduction says “Different people. Equal voices.” Its people illustration gives every figure the same size and baseline. New reusable-support copy explains the actual equal 100-unit starting budget within that election; it does not change eligibility, allocation, recall or private-poll rules.

Keep the restrained 6/8/12px rounding below and the welcoming sentence-case labels. The user subsequently requested the earlier dark navy theme from “Let’s get you ready” onward: use navy surfaces and blue actions for connection, dialogs and the main app, including the community introduction. Keep the first two screens light with their existing teal actions, brand and city illustration. Keep the English and Ukrainian welcome copy, all demo/eligibility/cooldown/privacy disclosures, and equal standing. Avoid ranks, VIP presentation, privileged votes or unsupported anonymity claims.

## Current direction — 28 October 2026

The user clarified that rounding should be selective, not removed everywhere. Use restrained 6px corners on buttons and fields, 8px on cards and portraits, and 12px on dialogs. Small badges use 3px corners; status dots, step markers and confirmation symbols may be circular. Navigation, page frames, dividers and data rows remain straight. Avoid pill controls and oversized rounded containers. Preserve the two ivory opening screens and their city illustration; the opening text has no colored highlight.

`frontend/src/app/precision.css` defines the shared geometry under `html[data-interface="refined"]`, with separate tokens for controls, cards, dialogs and badges. Election cards separate their image and readable text; candidate cards include a brief biography; results use a ranking with straight bars instead of a donut. The existing verification, voting, recall, agreement and feedback behavior stays intact. These geometry and layout decisions supersede the older concepts below.

This is a review concept based on Arsen's feedback of 10 and 13–14 October 2026 and the twelve marked screenshots. The visual preview is [client-design-preview.html](./client-design-preview.html), with an [updated review board](./FreedomSword-client-feedback-2026-10-14.png). It does not connect new services. The selected Rarimo and MACI architecture is recorded in [PRIVATE_VOTING_DECISION.md](./PRIVATE_VOTING_DECISION.md).

The [24 October corrections](CLIENT_UPDATES_2026-10-24.md) supersede the earlier wallet, sharing, opening-copy and recall proposals below. They document the implemented reusable-support mode and distinguish current functionality from integrations awaiting credentials.

## What the client chose

- Use a **dark navy interface after the first two screens**. The logo and opening message may remain light and patriotic. Keep later screens quiet and functional, with only occasional blue/gold accents and no repeated flag or landscape treatment.
- Use **reference 9 as the main flow and layout source**. Use **reference 10 for results after a private poll's verified tally**. The marked individual elements from otherwise rejected boards remain useful: the portrait-led candidate profile, the verification-in-progress visual, the ballot-box illustration, and the post-vote sharing card.
- The opening message should lead with **“Your voice. Your choice.”**, **“Real people. Real influence.”**, or **“People in control. Always.”** Use FreedomSword consistently in the introductory description. Remove the “Recall with freedom” slogan and do not reveal vote recall in introductory feature lists.
- The second screen should present **five benefits**: explore candidates, read their platforms, see election results, track public promises, and inspect the audit trail. Avoid a “one person, one voice” claim while eligibility uses a mock check.
- Connect the Telegram account **and a compatible wallet** in onboarding. Rarimo is the selected identity-verification provider. Add “Powered by [FreedomTool](https://freedomtool.org/)” as a live link only when the integration supports that attribution. Keep mock verification explicit until Rarimo is integrated.
- Put the invitation/share card **after a citizen makes a choice**, with Telegram contacts, social networks, and copy-link actions. Use a more motivating invitation message. Place a simple **Send feedback** action in the persistent menu.
- Keep the ballot screen's recall controls discoverable **after voting**. The client did not ask to remove recall from the product.

## Proposed screen sequence

1. Light logo launch with the unmodified FreedomSword logo and one short statement.
2. Light mission/introduction screen with five short benefits; no recall preview.
3. Dark connection screen: Telegram first, wallet second, with clear progress and connection status.
4. Dark verification screen with a calm progress state; show Rarimo as the selected provider and keep the current mock status visibly marked until integration is real.
5. Dark citizen agreement screen with the agreement itself and a deliberate acceptance action.
6. Dark elections and portrait-led candidate view with platform, promises, and vote action.
7. Dark vote confirmation and post-vote ballot screen. Reveal recall controls here; show the invitation card after the vote succeeds.
8. Dark results based on reference 10. Legacy demo elections may show live aggregates; MACI elections reveal candidate totals only after a verified final tally.

## Visual system

| Element | Direction |
| --- | --- |
| Background | `#071522` to `#0B2135` navy |
| Surface | `#10273B`, with quiet borders `#244052` |
| Text | `#F6F7F4` primary, `#9DB0BE` secondary |
| Action | `#1685E8` Telegram blue |
| Accent | `#D4AD62` antique gold, used sparingly |
| Opening only | warm ivory `#F8F3E8` and the original logo |
| Typography | Inter for navigation/body; Playfair Display for the light opening and selected major headings |

## Decisions still needed for implementation

- Confirm which wallet integration the client means by “Telegram wallet (Walt)” and whether FreedomTool's actual flow supports it inside Telegram Mini Apps. A wallet button in the preview is a design proposal, not a working connection.
- Implement [Rarimo](https://docs.rarimo.com/freedom-tool/) proof verification with election-scoped uniqueness and a Telegram Mini App flow. The current project uses mock verification; the interface must not claim a real identity check before it exists.
- Migrate new elections to [MACI](https://maci.pse.dev/docs/introduction/) with encrypted, replaceable votes and a trusted coordinator. Do not reuse the current plaintext ballot ledger or public live candidate tallies for MACI elections. The coordinator can decrypt ballots; choices remain private from the public and other voters. MACI reduces bribery incentives under its coordinator trust assumptions; it does not make bribery impossible.
- Choose the destination for the feedback bot and the final approved share message. A Telegram deep link can be used for sharing, but a new feedback bot needs its own handle or endpoint.
- Supply or approve real candidate portraits and election data. The preview's portrait and numbers are fictional sample content.

The references depict official elections, guaranteed privacy, and blockchain protection. Those statements require evidence from the actual deployment before they can appear as product claims. The preview uses demo labels accordingly.
