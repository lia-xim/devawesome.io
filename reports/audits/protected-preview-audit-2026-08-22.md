# DevAwesome protected-preview audit

Audited: 2026-08-22  
Implementation commit: `219edc82052973fefb6217df981cbed92e375206`  
Protected Preview: `dpl_4mjoZMTi3C1DWir8iyanMreSxxQd`  
Production deployment: `dpl_3muMuGZMU2Sy4CDfXWa12AFiF9d3`  
Launch decision: index release remains blocked

## Priority findings

### P0 — Index release remains blocked

`src/data/site.ts`, the rights manifest, HTML meta directives, Vercel response header, crawlable robots, and the empty sitemap all preserve the noindex hold. Former-operator authorisation, brand/mark clearance, and a named independent technical reviewer are not documented. No evidence found in this audit permits those gates to be inferred.

### P1 — The governance work is now executable

`reports/governance/rights-reviewer-dossier.md` separates domain control from former-identity rights and defines evidence, owner, pass rule, reviewer eligibility, locked packet, sign-off fields, and index-release conditions. Codex remains an implementation agent and is explicitly not counted as the missing independent reviewer.

### P1 — A third original field test and bounded local tool were added

The SHA-256 Evidence Receipt runs entirely in the browser, exports a versioned JSON receipt, and links its limitations beside the result. FT-03 imported the same public core and passed four cases: empty input, `abc`, mixed CRLF/CR line endings, and Unicode. Node Web Crypto matched a separate `node:crypto` reference; the two fixed vectors matched their expected digests. The result does not claim authorship, rights, identity, or trusted time.

### P2 — Manual screenshot inspection is environment-blocked

Playwright generated desktop, mobile, and interaction screenshots. The Windows filesystem helper then rejected image inspection with `apply deny-read ACLs`, including after a temporary copy. DOM identity, computed overflow, keyboard focus, Axe, console, runtime errors, performance entries, and interaction states passed; a human pixel-level screenshot review in this run is therefore NOT PROVEN.

## PASS / FAIL / NOT PROVEN

| Surface | Verdict | Evidence |
|---|---|---|
| Git scope | PASS | Clean parent, focused commit `219edc8`, pushed to `origin/main`; no unrelated files changed |
| Astro build | PASS | 39 files; zero errors, warnings, or hints; 18 generated pages |
| Field tests | PASS | FT-01: 16 canonical noindex documents; FT-02: matching frozen lock accepted and mismatch rejected; FT-03: four digest cases passed |
| Dependency security | PASS | `corepack pnpm audit --prod`: no known vulnerabilities |
| Canonicals and metadata | PASS | 16/16 live canonical routes returned 200, exact self-canonical, one H1, one description, OG metadata, matching schema, meta and header noindex |
| Robots / sitemap | PASS | robots allows crawling and advertises no sitemap during hold; sitemap returns 200 with zero `<loc>` entries |
| Unknown and legacy paths | PASS | `/archive/15` and a synthetic unknown path return real 404; 404 has no canonical; no catch-all homepage redirect |
| Host / HTTPS / slash rules | PASS | HTTP and www permanently redirect to HTTPS apex while preserving path/query; configured slash redirects are permanent |
| Security headers | PASS | CSP, HSTS, nosniff, frame denial, referrer, permissions, and COOP observed live; no third-party runtime scripts or fonts |
| Internal links | PASS | 20 live internal targets, zero broken |
| External links | PASS with one limit | 11 tested sources returned 200; CodePen returned 403 to the automated client and remains reachable status NOT PROVEN rather than classified broken |
| Runtime JavaScript | PASS | Home and field-test hub: 861 B script transfer; receipt route: 3,154 B across three route-local scripts; no GSAP bundle |
| Receipt data handling | PASS | Known vector generated correctly; export/reset/focus worked; zero network requests after submission; no storage API in implementation |
| Mobile / overflow | PASS | 1440×1000 and 390×844 tested; no horizontal overflow on audited pages |
| Keyboard | PASS | Skip link receives first focus and moves to `#main-content`; receipt form and controls exercised |
| Automated accessibility | PASS | Zero Axe WCAG A/AA violations on home, field-test hub, and receipt tool desktop/mobile |
| Console / framework overlay | PASS | Zero console warnings/errors, page errors, or framework overlays on audited flows |
| Unsupported historical claims | PASS | No transferred audience, subscriber, author, endorsement, archive, or brand-right claim; legacy notes remain independently written and bounded |
| Protected Vercel Preview | PASS | Deployment READY; anonymous requests receive Vercel SSO 302 plus edge `X-Robots-Tag: noindex` |
| Production noindex deploy | PASS | Deployment READY and aliased to apex; all audited public routes retain meta/header noindex |
| Search Console verification record | PASS | Existing Google verification TXT remains publicly visible; no DNS write was made |
| Former-operator authorisation | NOT PROVEN | No authenticated assignment, licence, consent, or non-objection recorded |
| Brand / mark clearance | NOT PROVEN | No dated DPMA/EUIPO/WIPO clearance log or qualified risk decision recorded |
| Independent technical reviewer | NOT PROVEN | No qualifying named reviewer or signed review packet recorded |
| Manual pixel-level visual review | NOT PROVEN | Screenshots exist; Windows ACL blocked direct image inspection in this run |
| Full manual WCAG audit | NOT PROVEN | Automated Axe and keyboard smoke checks passed; this is not a full manual assistive-technology audit |
| Real-user Core Web Vitals | NOT PROVEN | Lab navigation timings and transfer sizes passed the local budget; no field RUM dataset exists |
| Index release | FAIL | Mandatory identity/mark and independent-review gates are still open |

## Claim controls

- “Passed” refers only to the declared test assertions and saved environment.
- “Local by design” is supported by source inspection and a zero-request post-submit interaction run; it does not mean the page itself loads without HTTP.
- A receipt supports later comparison of normalized UTF-8 text. It is not a timestamping, notarisation, provenance, authorship, ownership, or clearance service.
- Common ownership with Contextter remains disclosed and supplies no independent corroboration or automatic product coverage.

## Required next gate sequence

1. Complete R-01 through R-03 in the rights/reviewer dossier and record the dated artifacts.
2. Recruit a qualifying independent reviewer and lock the exact commit/deployment packet.
3. Resolve every reviewer discrepancy and recapture affected results.
4. Rerun repository, dependency, live HTTP, desktop/mobile, keyboard, Axe, console, overflow, links, and redirect QA against the approved release.
5. Only then may Matthias Ramahi make a new explicit domain-specific index-release decision. Until that decision, noindex and the empty sitemap remain mandatory.
