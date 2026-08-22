# devawesome.io

Public source repository for the current `devawesome.io` website.

## Current state

The first product version is live on the owned custom domain: an original programming-language quiz, the field-test methodology, an intentionally empty test library, a lab hub, legal pages, and the new-ownership disclosure. It remains intentionally non-indexable. No newsletter, public editorial cadence, editor, technical reviewer, or indexing launch is approved.

## Standalone purpose

The site is an independent developer and AI-engineering lab for reproducible tool tests and an original programming-language quiz.

## Current status

Live but deliberately noindex. The site remains unassigned in the portfolio; a named editor, technical reviewer, brand clearance, two complete field tests, and indexing approval remain open. No newsletter, subscriber list, or public editorial cadence is active.

## Hard boundary

No former issues, authors, subscribers, consent, audience figures or brand endorsement transferred.

Portfolio relationship: unassigned. No project relationship is claimed by this repository or website.

## Local development

```bash
corepack pnpm install
corepack pnpm dev
```

Verification:

```bash
corepack pnpm verify
```

The QA pass checks built routes, legal pages, exact canonical URLs, the crawlable noindex contract, the empty sitemap, the real 404 boundary, internal links, quiz content, the legacy URL manifest, and forbidden historical claims.

## Deployment

Vercel project: `devawesome-io`.

The production site allows crawling so search engines can observe its page-level and HTTP `noindex, follow, noarchive` directives. The sitemap remains empty. Remove `noindex` only after the strategy, rights, disclosure, quality, editorial, and explicit launch gates pass.

## Rights

This repository is public for operational transparency. No license to reuse former-site content, identities, brands, media, datasets, code, subscribers, customers, or other third-party material is granted. No open-source license is granted unless a later commit adds one explicitly.


