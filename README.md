# devawesome.io

Public source repository for the current devawesome.io website.

## Current state

DevAwesome is an indexable, independently operated developer and AI-engineering field-test publication. The minimum viable launch includes an original programming-language quiz, two reproducible field tests, a public methodology, a lab hub, two evidence-bounded legacy notes, legal pages, and a visible new-ownership disclosure.

Matthias Ramahi is the operator and editor. The two launch tests are explicitly marked as not independently reviewed; no reviewer identity is invented.

## Standalone purpose

The site evaluates developer tools, APIs, MCP servers, agents, and engineering workflows through narrowly scoped, executable tests. It is not a Contextter satellite and does not use commonly owned portfolio sites as independent corroboration.

## Hard boundary

No former issues, authors, subscribers, consent, audience figures, brand endorsement, users, customers, or identity transferred with the acquired domain. Former-site material is not republished.

## Local development

    corepack pnpm install
    corepack pnpm dev

Run the full release contract:

    corepack pnpm verify

Run and recapture the two field tests:

    corepack pnpm field-test:astro:capture
    corepack pnpm field-test:pnpm:capture

The QA pass checks all canonical launch routes, automatic sitemap coverage, crawlable robots, absence of meta and Vercel-header noindex, the real 404 boundary, declared legacy decisions, legal pages, internal links, the permanent quiz alias, test evidence, and historical-identity claims.

## Deployment

Vercel project: devawesome-io.

Astro generates the sitemap through @astrojs/sitemap. Only canonical indexable 200 pages are included. robots.txt allows crawling and references /sitemap-index.xml. The redirect-only /quiz, custom /404, unknown paths, utility paths, and any future noindex or non-200 routes stay outside the sitemap.

## Rights

This repository is public for operational transparency. No license to reuse former-site content, identities, brands, media, datasets, code, subscribers, customers, or other third-party material is granted. No open-source license is granted unless a later commit adds one explicitly.
