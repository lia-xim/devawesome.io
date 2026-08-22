# DevAwesome Field Tests - project brief

## Purpose

DevAwesome is a low-cadence, independent developer and AI-engineering publication. It helps developers inspect reproducible evidence before adopting developer tools, APIs, MCP servers, agents, and the workflows between them.

The evergreen product is an original, browser-local programming-language identification quiz. The editorial product is a transparent field-test library. Each result publishes its environment, inputs, method, observed result, limitations, reproduction command, editor, and review status.

## Audience

- Software developers evaluating tools and workflows
- Developer-tool and API builders
- MCP and agent implementers
- Technical product and platform teams

## Information architecture

- / - publication thesis, current tests, quiz entry, legacy-link policy, and ownership disclosure
- /field-tests - canonical library for published tests
- /field-tests/astro-static-route-contract - FT-01, the Astro static publishing contract
- /field-tests/pnpm-frozen-lockfile-contract - FT-02, the pnpm frozen-lockfile contract
- /labs - public fixture, runner, result, and reproduction hub
- /methodology - testing, evidence, review, correction, and ageing policy
- /guess-the-programming-language/ - original eight-question language-identification quiz
- /quiz - permanent alias redirect to the canonical quiz
- /archive/14 and /archive/49 - newly authored notes for two evidence-backed legacy targets
- /new-ownership - identity, consent, rights, corrections, and current status disclosure
- /impressum and /datenschutz - operator and implementation-specific legal disclosures

## Launch evidence

- FT-01 ran the pinned Astro 7.2.1 production build and compared all generated sitemap entries with the declared canonical route set.
- FT-02 ran pnpm 10.33.2 in a disposable local fixture: the matching frozen lockfile installed offline, while a deliberately stale manifest failed with ERR_PNPM_OUTDATED_LOCKFILE.
- Both result records were captured on 22 August 2026 and live in reports/field-tests/.
- Matthias Ramahi is the operator and editor. The launch tests are not independently technically reviewed, and every test discloses that limit.

## Launch status

The owner explicitly approved indexing once the minimum viable launch passed its content, legal, and technical gates. The source now has no meta noindex or Vercel X-Robots-Tag noindex. Crawling is allowed, and Astro generates a canonical-only sitemap.

Unknown legacy paths return a real 404. No 410 target is currently declared because the recovery evidence contains no reviewed 410 decision; open archive samples remain review_required rather than receiving an invented status.

## Non-goals and hard boundaries

- No weekly newsletter, signup form, imported list, or inherited consent
- No copied former issues, quiz questions, branding, code, screenshots, authors, or identities
- No fake reviews, benchmarks, testimonials, audience figures, or reviewer identity
- No Contextter satellite role, sitewide promotion, or portfolio link network
- No blanket homepage redirect or speculative restoration of legacy URLs

## Stop condition

Do not start a newsletter without a named editor, a current consent system, and four completed editions. If reproducible field tests cannot be maintained, retain the evergreen quiz and methodology or park the domain.
