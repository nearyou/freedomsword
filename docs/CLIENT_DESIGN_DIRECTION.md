# FreedomSword — client design direction

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
