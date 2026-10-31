# FreedomSword client artwork — 31 October 2026

The invitation uses the existing, unmodified app emblem (`frontend/public/brand/emblem-reference.png`) rather than the temporary trident drawing. The exact quote **Vote for a better future** sits below its FreedomSword wordmark. The teaser is rendered from `scripts/assets/invitation-teaser.svg` by `scripts/export-user-flow-images.mjs`; the JPEG has a new URL so Telegram can fetch the corrected image instead of reusing its cached preview.

Final project assets:

- `frontend/public/brand/invitation-teaser-v2.jpg` — original logo, quote and app previews.
- `frontend/public/illustrations/ready-dove.webp` — illustrated cream and blue dove with olive branch, replacing the line icon.
- `frontend/public/illustrations/vote-ballot-box.webp` — blue, three-dimensional ballot box with gold Ukrainian tridents and a marked paper ballot replacing the green check badge. Confetti remains a separate CSS animation, positioned around the artwork and disabled for reduced-motion preferences.

The readiness card follows the reference's parchment palette, serif heading, blue share button and circular social marks. The previously approved invitation remains in English/Ukrainian, and mock verification stays explicit. The artwork is a reference-based reconstruction, rather than a claim of pixel-identical extraction from the low-resolution screenshots.

## Image-generation record

Mode: built-in `image_gen`, two reference-image edits. Generated originals remain in the tool's default image directory; the selected artwork is encoded as WebP in this repository. Encoding changes size/format only.

Reference inputs: `codex-clipboard-644ea3e0-2d1f-4a4c-9360-2a3e337a242c.png` (dove/card) and `codex-clipboard-078fd558-7a14-4379-bd4e-81db7e1fb768.png` (blue ballot box).

Final dove prompt:

> Use case: background-extraction. Asset type: transparent PNG artwork for the FreedomSword invitation card. Extract ONLY the exact illustrated flying dove with olive branch from the top of this reference mockup. Preserve its pose, cream body, raised feathered wings, dusty blue tail and wing tips, dark green olive leaves and vintage hand-painted watercolor engraving style. Preserve the bird's proportions and silhouette faithfully. Remove all phone frame, typography, buttons, interface, parchment background, status icons, and surrounding decoration. Center the complete dove and olive branch with close but unclipped framing on genuinely transparent background. No new design, no line icon, no text, no additional objects. This must be the same dove artwork, cleaned up at high resolution, not a modern reinterpretation.

Final ballot-box prompt:

> Use case: precise-object-edit. Asset type: app voting-success illustration. Edit this exact reference image. Keep the blue three-dimensional ballot box exactly as shown: tall near-cubic shape, thick projecting blue lid with slot, two visible blue faces with gold Ukrainian trident emblems, softly painted texture, navy background and warm golden circular glow underneath/behind. Replace ONLY the green round checkmark badge rising from the slot with an ivory paper election ballot inserted into the same slot. The paper must contain three small square choices with text-like horizontal strokes, with ONE clearly checked square and two empty squares. The ivory paper should tilt very slightly and be rendered in the same soft painted style. No green badge and no floating success tick. Remove the little phone navigation symbols at the extreme top left/right and remove the surrounding confetti (we animate confetti in the app). Keep all other box design details and colors faithful to the original reference, do not add laurels or redesign the box. Keep the complete illustration centered and closely framed, square canvas, dark navy background #061b29 blending smoothly to the edges. No text, no phone UI, no watermark.
