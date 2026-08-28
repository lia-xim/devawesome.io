# DevAwesome rights and independent-review dossier

Status date: 2026-08-28
Launch state: owner-approved indexable production release
Decision owner: Matthias Ramahi
Scope: devawesome.io under new ownership

This dossier is an operating checklist, not a legal opinion. Buying the domain established control of the hostname. It did not transfer the former publication, mark, issues, code, media, authorship, subscribers, consent, analytics, sponsors, endorsements, customers, or reputation.

## Current gate ledger

| Gate | State | Evidence now available | What would change the state |
|---|---|---|---|
| Domain control | PASS | Namecheap acquisition recorded in the canonical portfolio; Vercel serves the apex and www redirect | Recheck after registrar, DNS, or account-control change |
| Current operator identity | PASS | Impressum names Matthias Ramahi with a verified postal and email contact | Recheck after operator or address change |
| Current repository provenance | PASS | Git history and rights manifest identify the current copy, code, quiz, method, notes, tests, and tools as newly authored | Keep a file-level inventory and hashes for material releases |
| Former material excluded | PASS | No former issue body, quiz bank, logo, media, author identity, subscriber data, consent, or audience claim is in the current build | Any proposal to reuse former material reopens this gate and needs documented rights first |
| Former operator authorisation | NOT PROVEN | No signed licence, assignment, consent, or non-objection from the former operator is recorded | Dated written evidence naming the parties, assets, territory, term, and permitted use, reviewed for authenticity and scope |
| Brand / mark clearance | NOT PROVEN | Domain ownership and historical use are known; a current clearance record is not present | Dated DPMA, EUIPO, and WIPO searches plus a written risk decision; obtain qualified legal advice if a live or confusingly similar right appears |
| Named editor | PASS | Matthias Ramahi is publicly named as operator and editor | Confirm again if editorial control changes |
| Independent technical reviewer | NOT PROVEN | The tests say “Not independently reviewed”; Codex is an implementation agent, not the missing independent reviewer | A qualified named person reproduces the locked review packet, declares conflicts, and signs a bounded verdict |
| Index release | OWNER APPROVED | Matthias explicitly directed the site to become indexable on 28 August 2026. The independent-review and mark-clearance gaps remain disclosed and were not converted into false PASS states. | Reassess after any rights claim, former asset reuse, identity change, or material reviewer finding |

## Rights workstream

### R-01 — Identify the former operator without adopting the identity

- Owner: Matthias Ramahi
- Action: locate the former site's legal/provider identification from a lawful archive or acquisition paperwork; record legal name, jurisdiction, and the source privately.
- Acceptable evidence: acquisition-chain document, archived legal page, registry record, or direct signed correspondence whose origin can be checked.
- Do not publish: private addresses, personal contact data, archived copy, author profiles, or speculation.
- Pass rule: the likely operator is documented with source and confidence, or a qualified adviser records why the operator cannot reasonably be identified and what residual risk remains.

### R-02 — Clear the present use of the name

- Owner: Matthias Ramahi; qualified legal reviewer if a conflict appears.
- Action: run exact and confusing-similarity searches for “Dev Awesome”, “DevAwesome”, and relevant logo/device marks in DPMAregister, EUIPO eSearch, and WIPO Global Brand Database. Check active status, owner, classes, territory, and similarity to developer publishing and software tools.
- Evidence artifact: dated search log with query, database, filters, results, screenshots or export, and a written decision.
- Pass rule: a documented low-risk decision supports the current name, or the site is renamed before index release. Silence from a former operator is not clearance.

### R-03 — Keep former assets out unless rights are asset-specific

- Owner: editor
- Action: maintain the repository rights manifest at asset-category level. Every proposed former asset needs its own provenance, licence or assignment, and permitted-use record.
- Pass rule: the public build contains only newly authored, owned, or documented licensed material. A domain-sale invoice alone never satisfies this rule.

### R-04 — Preserve current release provenance

- Owner: release operator
- Action: create a local SHA-256 receipt for the rights inventory and review packet at the approved commit; store the receipt beside the release evidence.
- Limit: the digest can support later byte-equivalence checking. It does not prove authorship, ownership, clearance, identity, or a trusted date.
- Pass rule: receipt, commit, build result, and deployment ID refer to the same reviewed release.

### R-05 — Legacy URLs remain decision-by-decision

- Owner: editor plus rights reviewer when former material is implicated.
- Action: preserve 200 only for independently written, intent-equivalent current notes; preserve real 404 for unknown issues and non-equivalent paths; never use a catch-all homepage redirect.
- Pass rule: each exception has target-level evidence, a rights status, equivalence rationale, approver, and test date in `src/data/manifests/legacy-urls.v1.json`.

## Independent technical review workstream

### Reviewer eligibility

The reviewer must be a real named person with enough web or JavaScript engineering experience to run the packet. They must not be the author of the tested implementation. Paid review is allowed when disclosed. Employment, contracting, family, common ownership, or other material relationships must be stated; the editor then decides whether the review is independent enough for the public claim.

Codex implementation records, automated QA, CI output, and Matthias's editorial approval are useful evidence. None is a substitute for the required independent reviewer.

### Locked review packet

The reviewer receives:

1. Exact Git commit and public repository URL.
2. Node 24.x and pnpm 10.33.2 environment declaration.
3. `corepack pnpm install --frozen-lockfile` and `corepack pnpm verify` commands.
4. FT-01, FT-02, and FT-03 runners plus saved JSON results.
5. Rights manifest, legacy URL manifest, this dossier, and the protected-preview audit.
6. Production URL and the current owner-approved indexability state, including the unresolved review and mark-clearance disclosures.

### Required reviewer actions

- Reproduce all three field tests from a clean checkout.
- Inspect the negative case for FT-02 rather than accepting a success-only run.
- Compare FT-03 known vectors and the Node/Web Crypto cross-check.
- Check that every public verdict stays within the saved result and limitations.
- Exercise quiz, plan builder, and evidence-receipt controls with keyboard and mobile viewport.
- Verify canonicals, robots, generated sitemap, index directives, 404, redirects, CSP, and console health on the exact release.
- Record discrepancies, conflicts, environment differences, and any part not reproduced.

### Sign-off record

The completed record must contain:

- Reviewer full name and relevant role/experience
- Contact or verifiable professional profile retained privately
- Relationship and conflict disclosure
- Review date, environment, commit, and deployment ID
- Commands run and result for FT-01, FT-02, FT-03, UI, and HTTP gates
- Verdict: `approved`, `approved_with_limits`, or `rejected`
- Exact public wording permitted by the verdict
- Expiry/retest trigger
- Signature or authenticated written approval

`approved_with_limits` does not automatically clear index release. The editor must show that each limit is compatible with every public claim.

## Post-launch evidence gates

Indexing was released by explicit owner decision on 28 August 2026. The following work remains open and must be completed before the site can claim independent technical review or former-brand clearance:

- Former-operator and mark decision is documented and supports the current identity.
- A qualified independent technical reviewer has signed the locked packet.
- Public pages name Matthias Ramahi as operator/editor and retain the new-ownership boundary.
- All former assets remain excluded unless their individual rights are documented.
- `corepack pnpm verify`, dependency audit, live HTTP audit, mobile/desktop/keyboard/Axe/console checks, and internal-link checks pass against the approved commit.
- Apex and www preserve host, HTTPS, path, and query rules; 404 and legacy decisions match the manifest.
- Any future use of former material or broader identity claims requires a fresh rights decision; the current release contains newly authored tools and copy only.

Current required state: crawlable robots with the canonical sitemap, `index, follow` on canonical pages, `noindex` on the custom 404, no global `X-Robots-Tag` block, and public disclosure that the field tests are not independently reviewed.
