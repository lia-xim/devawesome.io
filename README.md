# devawesome.io

Public source repository for the current devawesome.io website.

## Current state

DevAwesome is a small browser-local developer toolbox held from indexing until its documented reviewer and identity gates are cleared. The primary visitor job is simple: open a useful tool and complete an everyday developer task without signing up or uploading the input.

The current toolbox includes a JSON formatter and validator, UUID v4 generator, SHA-256 text hash generator, and developer test-plan builder. The protected release also keeps an original programming-language quiz, three reproducible field tests, a public methodology, a lab hub, two evidence-bounded legacy notes, legal pages, and a visible new-ownership disclosure.

Matthias Ramahi is the operator and editor. All three field tests are explicitly marked as not independently reviewed; no reviewer identity is invented.

## Standalone purpose

The tools solve the immediate task. Reproducible tests and engineering notes explain how selected tools are checked and where their claims stop. The portfolio records DevAwesome as an accepted Contextter support domain with a standalone purpose. Common ownership is disclosed and never used as independent corroboration or as a reason for automatic product coverage.

## Hard boundary

No former issues, authors, subscribers, consent, audience figures, brand endorsement, users, customers, or identity transferred with the acquired domain. Former-site material is not republished.

## Local development

    corepack pnpm install
    corepack pnpm dev

Run the full release contract:

    corepack pnpm verify

Run and recapture the three field tests:

    corepack pnpm field-test:astro:capture
    corepack pnpm field-test:pnpm:capture
    corepack pnpm field-test:receipt:capture

The QA pass checks all canonical routes, crawlable robots, consistent meta and Vercel-header noindex, the empty hold sitemap, real 404 behavior, declared legacy decisions, legal pages, internal links, permanent aliases, all three test records, utility schemas, request-free and storage-free tool scripts, route-specific JavaScript budgets, security headers, closed governance gates, and historical-identity claims.

## Deployment

Vercel project: devawesome-io.

During the release hold Astro serves an intentionally empty /sitemap.xml. robots.txt allows crawling but does not advertise indexable URLs. Every HTML document and every Vercel response carries noindex, follow, noarchive. These controls change together only after the outstanding reviewer and identity gates receive an explicit recorded approval.

## Rights

This repository is public for operational transparency. No license to reuse former-site content, identities, brands, media, datasets, code, subscribers, customers, or other third-party material is granted. No open-source license is granted unless a later commit adds one explicitly.
