# DevAwesome backlink recovery and URL plan

Date: 2026-08-22
Domain: `devawesome.io`
State: implementation evidence for a non-indexable preview

## Decision summary

Rebuild the exact programming-language quiz URL. Rebuild `/archive/14` and `/archive/49` as new, transparent notes about the same externally linked projects. Do not republish the former newsletters, redirect the archive wholesale, or create pages for spam-driven homepage links.

The domain-level backlink total is not a reliable architecture brief. A large part of the homepage profile is SEO-directory, PBN, scraper, or mirror noise. The useful evidence is concentrated in three target URLs and a small number of live, topically relevant source relationships.

## Paid DataForSEO run

Source file: `reports/owned-domain-rebuild/devawesome-dataforseo-2026-08-22.json`

- Endpoints: backlinks summary, domain pages, and backlink rows
- Calls: 3
- Reserved ceiling: USD 0.24
- Provider-reported cost: USD 0.075888
- Hard per-domain and total cap: USD 0.30
- Rows requested: 100 backlink rows
- Provider status: all three tasks returned `20000 / Ok`

Credentials were loaded temporarily from an existing local Contextter environment into the child process. They were not printed, copied into this repository, or written into the report.

## Domain-level profile

- Backlinks: 144
- Referring domains: 105
- Referring main domains: 100
- Referring pages: 144
- Nofollow pages: 35
- Nofollow domains: 32
- Referring IPs: 61
- Referring subnets: 58
- Domain rank: 171
- Backlink spam score: 31
- First seen by provider: 2019-05-25
- Broken backlinks/pages in provider summary: 0

These totals should not be presented as endorsements or historical audience proof.

## Target-page distribution

| Target | Backlinks | Referring domains | Evidence judgment |
| --- | ---: | ---: | --- |
| `/` | 105 | 88 | Mostly noisy directory, PBN, scraper, and low-quality SEO links. Preserve the homepage because it is the current root, not because every link deserves recovery work. |
| `/guess-the-programming-language/` | 21 | 1 | One live, topically exact programmers-forum source. Repeated links from a single domain; useful intent continuity, not 21 independent endorsements. |
| `/archive/14` | 14 | 14 | One original project relationship plus GitHub mirrors/proxies. The current project README still links the issue URL under Publicity. |
| `/archive/49` | 1 | 1 | One live, topically exact creator source that names Issue #49 as former coverage. |
| Homepage query variants | 2 | 2 | Canonicalize to `/`; do not create separate pages. |
| `/lander` variants | 0 | 0 | Obsolete redirect/parking residue with no recovery value. |

## Backlink-row quality sample

The 100-row paid sample contained 100 unique referring domains. Target distribution in that sample was 82 homepage rows, two homepage query variants, 14 rows for Issue 14, one quiz row, and one Issue 49 row. DataForSEO's domain-page aggregate reports 21 quiz backlinks because the rows are repeated within one referring domain.

- Dofollow rows: 69
- Nofollow rows: 31
- Lost rows: 8
- Broken rows: 0
- Spam score 0–10: 22 rows
- Spam score 11–30: 15 rows
- Spam score above 30: 63 rows
- Semantic locations: 25 article, 2 section, 73 without a useful semantic location

Frequent anchors included domain-name variants, `Dev Awesome - Issue #14`, empty anchors, and explicit link-network spam. No page or navigation label was created from the spam anchors.

## Live source verification

### Programming-language quiz

- Source: `https://replace.org.ua/post/129852/`
- HTTP status on 2026-08-22: 200
- Page subject: a Ukrainian programmers-forum post asking how many programming languages the reader recognizes
- Exact legacy target present in the live HTML: yes
- Decision value: the click still expects a programming-language recognition challenge

### Issue 14

- Source: `https://github.com/Metroxe/one-html-page-challenge`
- Current README: lists `Dev Awesome - Issue #14` under Publicity
- Historical wrapper: `Issue #14 - Dev Awesome`
- Embedded issue date found in the archived wrapper: 2019-07-18
- Archived issue HTML: links the One HTML Page Challenge and describes its single-file constraint
- Decision value: a new note about the same project can satisfy the documented click without reproducing the issue

The 14 referring domains must not be described as 14 independent editorial endorsements. The original GitHub repository is the meaningful relationship; many other rows are mirrors or proxies.

### Issue 49

- Source: `https://www.paulfosterdesign.co.uk/blog/html-memory-tested/`
- HTTP status on 2026-08-22: 200
- Exact legacy target present in the live HTML: yes
- Link context: the creator's article lists Dev Awesome Issue #49 among coverage of the HTML Tags Memory Test
- Historical wrapper: `Issue #49 - Dev Awesome`
- Embedded issue date found in the wrapper: 2021-01-29
- The embedded newsletter file was not captured by Wayback, so no former issue copy was used
- Decision value: a new note about the same exercise can satisfy the creator-context click without pretending the issue survived

### Homepage sources

Tutorialzine currently presents Dev Awesome as its former weekly newsletter and links the domain. That page also identifies Zine EOOD in its footer. This is historical-operator context, not independent corroboration for the current project. Other cleaner homepage links exist, but the dominant profile is too noisy to justify reconstructing former newsletter or signup surfaces.

## URL action matrix

| Legacy path | Action | Current implementation | Reason |
| --- | --- | --- | --- |
| `/guess-the-programming-language/` | `restore_200` | New original eight-question quiz at the exact target | Same user job, clean topical source, no former content copied |
| `/quiz` | `redirect_308` | Permanent redirect to the exact restored legacy target | Current-project alias and full equivalence |
| `/archive/14` | `restore_200` | New One HTML Page Challenge note with ownership disclosure | Same externally linked project; former issue explicitly not republished |
| `/archive/49` | `restore_200` | New HTML Memory Tested note with ownership disclosure | Same externally linked exercise; former issue explicitly not republished |
| `/archive` | `hold` | No route | No transferred issue library or equivalent archive |
| Other `/archive/:issue` | `hold`, runtime `404` | No catch-all route | No target-level evidence or rights; exact issues 14 and 49 are reviewed exceptions |
| `/lander` | `404` | No route | No backlinks and no current content job |
| Unknown paths | `404` | Astro/Vercel 404 | Catch-all homepage redirects are forbidden |

## Current information architecture

- `/` — product thesis, method, quiz entry, two documented legacy notes, launch state
- `/guess-the-programming-language/` — exact restored quiz target
- `/field-tests` — publication gate; no fabricated tests
- `/labs` — future fixtures and reproduction artifacts
- `/methodology` — six-stage evidence, review, correction, and ageing policy
- `/archive/14` — newly authored One HTML Page Challenge note
- `/archive/49` — newly authored HTML Memory Test note
- `/new-ownership` — identity, rights, consent, archive, and correction boundary

## Launch and residual risk

The implementation remains `noindex, nofollow, noarchive`, `robots.txt` blocks the whole site, the sitemap is empty, and Vercel sends `X-Robots-Tag`. Those controls stay until explicit launch approval and live production verification.

Open launch risks:

1. Former-operator and brand/mark clearance are not documented.
2. The public current operator, named editor, and named technical reviewer are not recorded.
3. No complete reproducible field test has passed the release gate.
4. Search Console and production-domain behavior have not been verified in this build task.
5. The two restored archive notes preserve user intent but do not transfer former authorship, endorsement, or issue rights.
