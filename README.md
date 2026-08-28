# devawesome.io

Public source repository for the current devawesome.io website.

## Current state

DevAwesome is a browser-local workbench for developers and SEO teams. The owner explicitly approved indexable publication on 28 August 2026. A visitor can either open one focused mini-tool or follow a complete workflow that turns a messy input or a group of technical signals into a reviewable result without signing up or uploading the data.

The current workbench includes nine focused tools plus four guided workflows. Keyword imports expose conflicting duplicate data instead of silently choosing a row. Crawl lists support host, subdomain, protocol, pattern, sitemap-type, and resource boundaries while retaining exclusion reasons. Keyword and crawl sources can be loaded from local CSV, TSV, TXT, or XML files without uploading them. The indexability workflow extracts signals from pasted evidence. MCP validation applies revision-specific checks and expected-versus-actual comparison. Every deep workflow can export and reload a configuration-only recipe and download a privacy-bounded run manifest that links input, settings, and output through SHA-256 receipts without embedding the source data.

The release also keeps an original programming-language quiz, four reproducible field tests, a guide hub, a public methodology, a lab hub, two evidence-bounded legacy notes, legal pages, and a visible new-ownership disclosure.

Matthias Ramahi is the operator and editor. All four field tests are explicitly marked as not independently reviewed; no reviewer identity is invented.

## Standalone purpose

The tools solve one transformation. The workflows connect related steps, show what changed, preserve conflicts and exclusions for review, and offer an optional next handoff only when it fits the job. Portable recipes make the decisions repeatable without saving the underlying input. Reproducible tests and worked fixtures explain how selected tools are checked and where their claims stop. The portfolio records DevAwesome as an accepted Contextter support domain with a standalone purpose. Common ownership is disclosed and never used as independent corroboration or as a reason for automatic product coverage.

## Hard boundary

No former issues, authors, subscribers, consent, audience figures, brand endorsement, users, customers, or identity transferred with the acquired domain. Former-site material is not republished.

## Local development

    corepack pnpm install
    corepack pnpm dev

Run the full release contract:

    corepack pnpm verify

Run and recapture the four field tests:

    corepack pnpm field-test:astro:capture
    corepack pnpm field-test:pnpm:capture
    corepack pnpm field-test:receipt:capture
    corepack pnpm field-test:workbench:capture

The QA pass checks all canonical routes, index directives, crawlable robots, generated sitemap membership, real 404 behavior, declared legacy decisions, legal pages, internal links, permanent aliases, all four test records, utility schemas, request-free and storage-free tool scripts, route-specific JavaScript budgets, security headers, governance disclosures, and historical-identity claims.

## Deployment

Vercel project: devawesome-io.

Astro generates `/sitemap.xml` from the central canonical-route registry. `robots.txt` allows crawling and references that sitemap. Canonical pages use `index, follow`; the custom 404 remains `noindex`. The independent technical reviewer and former-operator or mark clearance are still not proven and remain disclosed rather than invented.

## Rights

This repository is public for operational transparency. No license to reuse former-site content, identities, brands, media, datasets, code, subscribers, customers, or other third-party material is granted. No open-source license is granted unless a later commit adds one explicitly.
