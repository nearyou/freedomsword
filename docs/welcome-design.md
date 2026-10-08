# FreedomSword welcome experience

`/` is the Mini App entry screen. The existing election tools remain at `/elections`.

The reference is implemented with parchment `#F8F3E8`, navy `#102541`, antique gold `#D4AD62`, locally served Playfair Display and Inter, fine borders, seal icons, and engraved laurel/landscape scenery. The original `logo.jpg` and served `public/brand/logo.jpg` are unchanged and displayed in full, without cropping, filters, masking, or retouching. Their SHA-256 is `16714742ea6eb77ee3cfdfda4eabf0a10a8bbdc737a40519fdb11b3cf9ac554b`.

Reusable welcome components live in `src/components/welcome`. CSS is scoped to `.welcome-root` so the existing election tools retain their appearance. Inside Telegram the native header supplies Close, FreedomSword, and the menu; browser preview renders equivalent controls. Telegram safe areas and its header/background color are supported. Modal focus trapping, background inertness, Escape, focus restoration, reduced motion, consent validation, retry/error messages, and loading controls are included.

Browser preview does not authenticate or write verification/agreement records. Progress and the demonstration display name exist only in memory. Telegram uses the existing server-validated session, mock verification endpoint, and exact agreement hash. Concurrent session reads are coalesced; a valid session is reused rather than replaying consumed launch data. Agreement acceptance is consent, not a cryptographic or legal signature. The three institutional feature icons describe prototype concepts, with explicit qualification. The election lobby is a placeholder without fabricated candidates, tallies, or a vote action.

## Validation

- TypeScript, ESLint and all 83 unit tests passed; new tests cover participation ordering, input/consent validation, concurrent auth exchange, session reuse and recovery after failed reads.
- All 34 PostgreSQL integration tests passed in a disposable database, preserving the existing staging ballots.
- The optimized staging build passed, followed by public home, readiness, election API, logo and client-bundle checks. Bot name and default chat menu were confirmed as FreedomSword.
- Browser checks covered required fields, consent rejection, loading controls, verification completion, agreement acceptance, Continue, the placeholder lobby, Ukrainian localization, Escape and focus restoration. No runtime errors were reported. English and Ukrainian were checked at 320, 390, 768 and 1440 pixels without horizontal overflow.
- The deployed 390-pixel welcome screenshot is saved locally in ignored `artifacts/freedomsword-welcome-mobile.png`. Browser preview was exercised; a native Telegram client launch still requires the operator to open the bot on their device.

## Decorative asset provenance

The built-in imagegen tool generated the decorative scenery, inspected before use and exported as WebP at `public/illustrations/civic-parchment.webp`. It did not process or alter the logo. Final generation prompt:

> Use case: illustration-story. Asset type: decorative background for FreedomSword ivory-and-gold mobile civic welcome screen. Primary request: a very faint, exquisite antique engraved landscape on warm ivory parchment #F8F3E8. Fine navy-gray and muted antique-gold copperplate lines depict a peaceful Ukrainian countryside, rolling distant hills, a river and classical civic architecture at the bottom right, small trees framing the lower corners. Composition: portrait 1024x1536, upper 70% almost empty ivory paper with subtle grain, landscape confined to bottom quarter fading seamlessly into blank parchment. Delicate pale golden laurel branches along the upper left and mid-right margins, center entirely clear for interface. Elegant restrained 19th-century banknote engraving, dignified premium stationery, exceptionally low contrast. No text, no letters, no logo, no interface, no phone, no frame, no people, no flags, no watermark.
