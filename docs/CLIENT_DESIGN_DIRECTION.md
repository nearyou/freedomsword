# FreedomSword — client design direction

This is a review concept based on Arsen's feedback of 10 October 2026 and the twelve marked screenshots. The visual preview is [client-design-preview.html](./client-design-preview.html). It does not change the production app or connect new services.

## What the client chose

- Use a **dark navy interface after the first two screens**. The logo and opening message may remain light and patriotic. Keep later screens quiet and functional, with only occasional blue/gold accents and no repeated flag or landscape treatment.
- Use **reference 9 as the main flow and layout source**. Use **reference 10 for live results**. The marked individual elements from otherwise rejected boards remain useful: the portrait-led candidate profile, the verification-in-progress visual, the ballot-box illustration, and the post-vote sharing card.
- The opening message should lead with **“Your voice. Your choice.”**, **“Real people. Real influence.”**, or **“People in control. Always.”** Use FreedomSword consistently in the introductory description. Do not reveal vote recall in introductory feature lists.
- Connect the Telegram account **and a compatible wallet** in onboarding. Show Rarimo as the **only identity-verification provider**. Add “Powered by [FreedomTool](https://freedomtool.org/)” as a live link.
- Put the invitation/share card **after a citizen makes a choice**, with Telegram contacts, social networks, and copy-link actions. Use a more motivating invitation message. Place a simple **Send feedback** action in the persistent menu.
- Keep the ballot screen's recall controls discoverable **after voting**. The client did not ask to remove recall from the product.

## Proposed screen sequence

1. Light logo launch with the unmodified FreedomSword logo and one short statement.
2. Light mission/introduction screen with three short benefits; no recall preview.
3. Dark connection screen: Telegram first, wallet second, with clear progress and connection status.
4. Dark Rarimo-only verification screen with a calm progress state; current mock status remains visibly marked until integration is real.
5. Dark citizen agreement screen with the agreement itself and a deliberate acceptance action.
6. Dark elections and portrait-led candidate view with platform, promises, and vote action.
7. Dark vote confirmation and post-vote ballot screen. Reveal recall controls here; show the invitation card after the vote succeeds.
8. Dark live results based on reference 10, using only figures actually available from the backend.

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
- Obtain the exact Rarimo integration requirements and success/failure states. The current project uses mock verification; the interface must not claim a real identity check before it exists.
- Choose the destination for the feedback bot and the final approved share message. A Telegram deep link can be used for sharing, but a new feedback bot needs its own handle or endpoint.
- Supply or approve real candidate portraits and election data. The preview's portrait and numbers are fictional sample content.

The references depict official elections, guaranteed privacy, and blockchain protection. Those statements require evidence from the actual deployment before they can appear as product claims. The preview uses demo labels accordingly.
