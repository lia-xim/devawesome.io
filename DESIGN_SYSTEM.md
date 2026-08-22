# DevAwesome V2 design system

## Accepted concept references

- `design/concepts/05-modern-hero.png`
- `design/concepts/06-modern-field-tests.png`
- `design/concepts/07-modern-quiz.png`
- `design/concepts/08-modern-legacy-note.png`
- `design/concepts/09-modern-method.png`

## Visual thesis

A premium developer instrument rendered with editorial discipline: deep graphite working surfaces, warm-bone reading planes, one electric chartreuse measurement signal, and cyan reserved for diagnostic detail. The interface is precise and contemporary without becoming a generic SaaS dashboard or a cyberpunk prop.

## Tokens

- Carbon: `#090b0b`
- Secondary carbon: `#101313`
- Reading paper: `#f2f0e8`
- Signal chartreuse: `#c7ff18`
- Diagnostic cyan: `#38d8e8`
- Disclosure red: `#e34b3f`
- Display type: condensed heavy system sans
- Data and body type: system monospace
- Geometry: square or near-square; no decorative pills

## Layout rules

- One bordered site shell, not a browser-window illustration
- Split editorial and instrument surfaces for the hero and quiz
- One dominant composition per section
- Continuous traces and ledgers instead of generic card grids
- Large type stays readable; evidence text stays compact but never ornamental
- No gradients, glassmorphism, 3D blobs, fake awards, fake reviews, or fabricated metrics

## Motion contract

GSAP is limited to meaningful sequencing:

1. Hero copy and rig reveal in reading order.
2. Evidence and method traces draw when their section enters view.
3. Section groups reveal with transform and opacity only.

`gsap.matchMedia()` disables the animation path for `prefers-reduced-motion: reduce`; all content remains visible without motion.

## Truthful implementation deviations

The concept mockups contained illustrative test results and volumes. The implementation replaces them with the real preview state: zero published field tests, eight original quiz questions, two evidence-backed legacy notes, and indexing off. The field-test index remains intentionally empty until a complete run passes the release gate.
