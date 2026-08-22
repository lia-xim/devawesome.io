# DevAwesome toolbox fidelity ledger

Date: 2026-08-23

## Accepted design references

- `reports/design-concepts/toolbox-home-desktop.png` — 1504 × 1046 first viewport
- `reports/design-concepts/toolbox-home-lower.png` — 1555 × 1012 lower homepage
- `reports/design-concepts/toolbox-home-mobile.png` — 843 × 1866 generated mobile composition representing a 390 px CSS viewport

The references were generated with the built-in ImageGen workflow and treated as the implementation specification.

## Render evidence

- `reports/qa/toolbox-home-desktop-native.png` — 1504 × 1046 viewport match
- `reports/qa/toolbox-home-lower-native.png` — 1555 × 1012 lower-section match
- `reports/qa/toolbox-home-desktop.png` — 1440 px full-page production-preview capture
- `reports/qa/toolbox-home-mobile.png` — 390 px full-page production-preview capture

The Browser/IAB runtime was attempted first as required. It exited during setup with `trusted Node process exited unexpectedly; kernel reset`. Browser verification therefore used the bundled Playwright Chromium against the built Astro preview.

The local `view_image` helper was attempted on both concept and implementation PNGs. It could not open any workspace, generated-image, or visualizations path because the Windows sandbox helper returned `helper_unknown_error: apply deny-read ACLs`. The same original PNGs were instead loaded read-only and rendered directly for visual comparison. The literal `view_image` command remains environment-blocked; visual inspection itself was completed.

## Fidelity comparison

| Point | Concept evidence | Render evidence | Result |
|---|---|---|---|
| Above-the-fold copy | Two-line headline, one short paragraph, two CTAs | Exact headline, paragraph, and CTA labels | PASS |
| Header | Cube mark, four links, lime Browse tools action, status dot | Same order, geometry, and action hierarchy | PASS |
| Palette | True white, charcoal, cool-gray rules, restrained lime | Computed white `rgb(255, 255, 255)`; lime `rgb(181, 242, 10)` | PASS |
| Hero composition | Copy left, live JSON formatter right | Same two-column desktop composition; formatter hidden on mobile to prioritize tools | PASS |
| Tool directory | Four open divided rows, no placeholder cards | Exactly four working tools with matching names and descriptions | PASS |
| Lower homepage | Three-item trust strip, plain explanation, two secondary rows | Same order, open layout, and copy | PASS |
| Mobile | Compact header, two-line hero, full-width CTAs, 96 px tool rows | 390 px capture with no overflow and large tap targets | PASS |
| Footer | Compact ownership line and six links | Same ownership wording and six links | PASS |

## Above-the-fold copy diff

No unapproved hero eyebrow, badge, metric, testimonial, newsletter prompt, Contextter promotion, or decorative jargon was added. The formatter includes functional `Minify` and `Format JSON` controls in addition to the concept's `Clear` and `Copy` controls because the shipped surface is a working tool rather than a static preview.

## Material mismatches fixed

- Reduced the desktop hero type until both exact headline clauses fit on two lines.
- Preserved a real space when the desktop line break is hidden on mobile.
- Reduced the mobile type scale so the headline remains two clean lines.
- Closed the mobile menu and removed keyboard-focus/debug overlays before final captures.
- Switched captures from the Astro development surface to the built production preview.
- Changed the lower desktop explanation from a two-column interpretation to the open stacked layout shown in the accepted concept.

## Core interaction proof

Playwright completed the JSON format/minify/error states, three-value UUID v4 generation, the published SHA-256 `abc` vector, and full test-plan JSON generation. It recorded zero console errors, zero external requests, zero interaction-triggered requests, and no desktop or mobile overflow.

No material visual mismatch remains in the inspected homepage scope.
