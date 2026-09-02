# Evidence-led SEO implementation — 2026-08-31

## Contextter refresh — 2026-09-01

The correct workspace binding was reverified before acquisition: `ws_8kec25mygy81`, name `devawesome.io`, domain `devawesome.io`, lifecycle `active`. Only `contextter_devawesome` was used.

- Fresh US-English domain snapshot `snap_i6l5akojjurj` returned a partial overview: 141 backlinks, 103 referring domains, no ranked keywords, top pages, or competitors, and a provider-specific spam score of 35. The score is not a Google metric.
- A second bounded snapshot, `snap_wg3fi75zz4ui`, completed and identified five linked/indexed targets. The homepage received 105 links from 88 referring domains; `/archive/14` received 13 links from 13 referring domains; `/archive/49` received one link from one domain; `/guess-the-programming-language/` received 21 links from one domain.
- The anchor inventory supports a navigational job for “Dev Awesome Issue #14” and the existing “One HTML Page Challenge” subject. The page remains newly authored and does not reproduce the former newsletter.
- Two bounded keyword-research jobs failed before provider execution with `KEYWORD_RESEARCH_SOURCE_RESERVATION_INVALID` and settled at EUR 0. Search demand, volume, difficulty, and intent remain `NOT PROVEN`.
- Site Audit remains unavailable: no active audit site exists, `configureSite` returns `CTX-VAL-001`, and a fresh crawl cannot resolve a site resource.
- The account cost breakdown settled EUR 0.57 for this task: EUR 0.36 for the partial domain action and EUR 0.21 for the successful anchor/indexed-page snapshot. No holds remain. The first operation record still reports `reconciliationRequired`, so Contextter's operation state and settled account ledger are inconsistent.

Decision: strengthen only `/archive/14` with the evidenced Issue 14 navigational label. Keep the homepage as the primary workbench hub, retain `/archive/49` and the quiz, and create no new keyword page until demand or Search Console evidence exists.

## Scope and safety boundary

- Contextter MCP server: `contextter_devawesome` only.
- Verified workspace: `ws_8kec25mygy81`, name `devawesome.io`, domain `devawesome.io`, lifecycle `active`.
- `contextter_ai_fanout` and the `ai-fanout.com` workspace were not used.
- Current identity remains a newly authored browser-local developer and SEO workbench. Former content, authors, subscribers, consent, audience figures, endorsements, and brand identity were not used.
- Commonly controlled portfolio sites are workflow handoffs, not independent evidence.
- No deployment, publication, DNS change, or Search Console submission was performed.

## Evidence register

| Claim | State | Evidence and limit |
|---|---|---|
| Contextter is bound to the intended workspace | Verified | Workspace overview returned `ws_8kec25mygy81`, `devawesome.io`, `devawesome.io`, active. |
| Paid Contextter acquisition | PARTIAL | Fresh execution now starts under the existing human approvals. One partial domain snapshot charged EUR 0.36 and one complete anchor/indexed-page snapshot charged EUR 0.21. Two keyword jobs failed before provider execution and settled at EUR 0. Site configuration still fails. Total task cost: EUR 0.57. |
| Current repository has 35 search-eligible canonical routes | Verified | `src/data/routes.ts`, generated sitemap, Astro build, and repository QA agree. |
| Canonicals, index directives, sitemap, robots, 404, structured data, security headers, and internal-link discoverability pass locally | Verified | `corepack pnpm build`, `corepack pnpm qa`, and rendered browser QA passed on 2026-08-31. This is local release proof, not live production proof. |
| Current Domain Overview rankings and top pages | NOT PROVEN | Fresh snapshot `snap_i6l5akojjurj` completed partially but returned no ranking, top-page, or competitor rows. |
| Current keyword demand and intent metrics | NOT PROVEN | Both a six-seed and one-seed quick run failed with `KEYWORD_RESEARCH_SOURCE_RESERVATION_INVALID` before provider execution and settled at EUR 0. |
| Current technical Site Audit health | NOT PROVEN | Workspace coverage reports `NO_ACTIVE_SITE_AUDIT_SITE`. `configureSite` now reaches the server but returns `CTX-VAL-001`; without a site resource the bounded crawl returns `RESOURCE_NOT_FOUND`. |
| Current GSC clicks, impressions, CTR, queries, pages, and indexing coverage | NOT PROVEN | Contextter returned `SEARCH_PERFORMANCE_SNAPSHOT_NOT_FOUND`. |
| Current tracked rankings and competitors | NOT PROVEN | Contextter returned zero active schedules and `TRACKING_DOMAIN_NOT_STORED`. |
| Current backlink profile | Supported | Fresh Contextter snapshots report 141 backlinks and 103 referring domains, with complete bounded anchor and linked-page samples. Relevance and ownership were not independently verified; many sample domains and one explicit paid-link anchor appear low quality. |
| Current conversion or workflow performance | NOT PROVEN | The repository proves a privacy-bounded Umami implementation, but Contextter contains no tracking/performance data for this workspace. |
| Former operator or mark clearance | NOT PROVEN | Preserved as an explicit rights-manifest and portfolio risk. |
| Independent technical reviewer | NOT PROVEN | Preserved as an explicit rights-manifest and portfolio risk. |

## Current architecture and workflow paths

The canonical route registry assigns one user job to every indexable URL. The primary paths are:

1. Home → one of four complete browser-local workflows.
2. Home or Tools hub → one focused utility → related workflow or guide.
3. Workflow → reviewed local output → optional contextual handoff with common-ownership disclosure.
4. Guide → workflow/tool → executable field-test evidence.
5. Field-test and Labs hubs → reproducible fixture, runner, result, and stated review boundary.

No complete sibling mesh, sitemap-only canonical orphan, query-fan-out page, doorway location page, or generic former-newsletter archive is present.

## Strategic position and keyword hypotheses

DevAwesome is positioned as a browser-based SEO and developer workbench for people who need to clean, inspect, and reuse technical data without uploading the input. It is not positioned as a generic high-volume “free tools” directory. The defensible difference is the complete path from a focused local tool to a reviewed workflow, an explanatory guide, and reproducible field-test evidence.

- **Qualified audience:** SEO practitioners and developers handling keyword exports, URL sets, crawl preparation, indexability evidence, JSON, and MCP messages.
- **Primary outcome:** leave with a checked local result, the visible decisions behind it, and an optional reusable recipe or run manifest.
- **Conversion path:** focused tool → complete workflow → guide or field-test proof → optional disclosed Contextter handoff where a live workspace or crawl is the real next step.
- **Non-goals:** former-newsletter revival, generic software reviews, mass query pages, upload-based SaaS claims, or competing head-term utilities with no differentiated proof.

The phrases below are intent hypotheses derived from verified product jobs and page content. Current volume, difficulty, SERP composition, rankings, and conversion performance remain `NOT PROVEN` because both Contextter keyword jobs failed before provider execution and no Search Console snapshot is stored.

| Cluster | Primary search hypothesis | Existing URL roles | Strategic action |
|---|---|---|---|
| Workbench category | `browser-based SEO tools`, `SEO tools without uploads`, `SEO data workflows` | `/`, `/tools`, `/workflows` | Strengthen the three hubs around local processing, visible decisions, and reusable output; do not build a page per wording variant. |
| Keyword preparation | `keyword list cleaner`, `clean keyword import file`, `prepare keyword import` | Tool → workflow → guide → workbench contract | Treat the tool as the immediate task, the workflow as conflict-safe preparation, and the guide as decision support. |
| Crawl preparation | `URL list normalizer`, `prepare URL list for crawling`, `build crawl list` | Tool → workflow → guide → workbench contract | Own the preparation boundary; never claim a live crawl or canonical decision from pasted data. |
| Indexability diagnosis | `robots.txt tester`, `indexability checker`, `debug page indexability` | Focused robots tool → indexability workflow → technical guide → workbench contract | Explain status, crawl access, directives, and canonical together while preserving the eligibility-versus-indexing limit. |
| MCP validation | `MCP JSON-RPC validator`, `validate MCP message` | Focused validator → versioned workflow → workbench contract | Keep protocol structure separate from transport, authorization, and server-execution claims. |
| Reproducible testing | `developer tool test`, `developer test case template`, `reproducible tool testing` | Test-case builder → guide → methodology → field tests | Use inspectable fixtures and failure boundaries as the differentiator instead of generic review copy. |
| Broad utilities | `JSON formatter`, `UUID generator`, `SHA-256 generator`, `SERP snippet preview` | Individual tools with methods, limits, and related paths | Keep as useful entry utilities, but do not make them the site's primary authority claim without measured demand or links. |

No new page currently passes the publication gate. A new URL requires a materially different user job, independent demand or query evidence, an original maintained asset, a distinct internal-link/conversion path, and a documented cannibalization check. Related wording belongs as a section on the strongest existing page until those conditions are met.

## Page-action matrix

Review date for all rows: after the first usable Contextter/GSC baseline or by 2026-09-30, whichever comes first.

| URL | Primary role and user job | Evidence | Action | Reason / risk control | KPI |
|---|---|---|---|---|---|
| `/` | Workbench entry; choose a real data-preparation job | Repository and browser QA verified; search demand NOT PROVEN | Strengthen | Keep workflow-first offer; shortened title suffix and locked metadata contract | Impressions, workflow starts, completed outputs |
| `/workflows` | Workflow hub; choose a multi-step job | Repository verified; GSC NOT PROVEN | Strengthen | Preserve curated four-workflow hierarchy; canonical slash alias added | Hub impressions, child clicks |
| `/workflows/prepare-keyword-import` | Prepare a conflict-safe keyword import | Executable fixture and browser interaction verified; demand NOT PROVEN | Strengthen | Maintain one complete job; no split into CSV/TSV/query variants | Starts, conflict resolutions, exports |
| `/workflows/build-clean-crawl-list` | Build scoped crawl targets and rejection evidence | Executable fixture and browser interaction verified; demand NOT PROVEN | Strengthen | Maintain scope/robots/export job; canonical slash alias added | Starts, reviewed exclusions, exports |
| `/workflows/debug-indexability` | Diagnose supplied status/canonical/robots/noindex evidence | Executable contract verified; live fetching is out of scope | Strengthen | Metadata synchronized to bounded eligibility verdict; no ranking promise | Starts, completed verdicts |
| `/workflows/validate-mcp-message` | Validate and preserve one MCP message case | Executable fixture verified; search demand NOT PROVEN | Strengthen | Keep versioned validation job; do not fan out by message subtype | Starts, completed comparisons |
| `/field-tests` | First-party evidence hub | Repository verified | Keep | Proof layer, not a generic software-review directory | Evidence-page visits, reproductions |
| `/field-tests/astro-static-route-contract` | Reproduce static route/indexability assertions | Captured field test verified | Keep | Versioned proof; canonical slash alias added | Runner reproductions, corrections |
| `/field-tests/pnpm-frozen-lockfile-contract` | Reproduce frozen-lockfile behavior | Captured field test verified | Keep | Versioned proof; canonical slash alias exists | Runner reproductions, corrections |
| `/field-tests/evidence-receipt-contract` | Reproduce SHA-256 receipt behavior | Captured field test verified | Keep | Versioned proof; canonical slash alias exists | Runner reproductions, corrections |
| `/field-tests/workbench-core-contract` | Reproduce main workbench edge cases | Captured field test verified | Keep | Versioned proof; missing canonical slash alias fixed | Runner reproductions, corrections |
| `/guides` | Guide hub; choose decision support | Repository verified; query demand NOT PROVEN | Strengthen | Curated guide set only; canonical slash alias exists | Hub impressions, guide clicks |
| `/guides/reproducible-developer-tool-tests` | Run a bounded developer-tool test | First-party method and test links verified | Strengthen | Keep one comprehensive guide; no one-page-per-stage split | Impressions, builder/evidence clicks |
| `/guides/clean-keyword-import-files` | Clean a keyword file without losing useful columns | First-party workflow and fixture verified; demand NOT PROVEN | Strengthen | Keep distinct decision job; canonical slash alias added | Impressions, workflow starts |
| `/guides/prepare-crawl-list` | Prepare a deliberate URL list for crawling | First-party workflow and fixture verified; demand NOT PROVEN | Strengthen | Keep normalization-versus-observation boundary; alias added | Impressions, workflow starts |
| `/guides/debug-indexability-signals` | Debug technical eligibility signals in order | Primary references and fixture verified; demand NOT PROVEN | Strengthen | Keep eligibility/indexing distinction; alias added | Impressions, debugger starts |
| `/tools` | Categorized utility hub | Ten tools verified; GSC NOT PROVEN | Strengthen | Preserve four categories and direct tool links | Hub impressions, tool opens |
| `/tools/keyword-list-cleaner` | Clean/deduplicate one keyword list | Browser interaction verified; demand NOT PROVEN | Strengthen | Maintain focused tool; avoid keyword-import fan-out pages | Tool runs, exports |
| `/tools/url-list-normalizer` | Normalize and classify one URL list | Browser interaction verified; demand NOT PROVEN | Strengthen | Maintain focused tool and explicit ambiguity limits | Tool runs, exports |
| `/tools/robots-txt-tester` | Test pasted rules for one crawler and URL | Browser interaction and contract verified; demand NOT PROVEN | Strengthen | No live-fetch claim; retain exact winning-rule output | Tool runs, workflow continuation |
| `/tools/serp-snippet-preview` | Review title, URL, and description together | Browser interaction verified; demand NOT PROVEN | Strengthen | Keep preview claim bounded; no promise of Google rendering | Tool runs, repeat use |
| `/tools/mcp-json-rpc-validator` | Find structural errors in one MCP JSON message | Browser interaction and versioned workflow verified | Strengthen | Do not split by Inspector/SDK/log query variants | Tool runs, workflow continuation |
| `/tools/json-formatter` | Format, validate, or minify JSON locally | Browser interaction verified; demand NOT PROVEN | Strengthen | Broad but distinct developer job | Tool runs, copies |
| `/tools/uuid-generator` | Generate UUID v4 values locally | Browser interaction verified; demand NOT PROVEN | Strengthen | Maintain v4-only truth; no format fan-out | Tool runs, copies |
| `/tools/developer-tool-test-plan` | Build one compact Markdown test case | Browser interaction verified; demand NOT PROVEN | Strengthen | Distinct artifact job tied to method guide | Tool runs, downloads |
| `/tools/evidence-receipt` | Generate a normalized-text SHA-256 receipt | Contract and browser interaction verified; demand NOT PROVEN | Strengthen | Preserve digest/receipt boundary | Tool runs, receipt downloads |
| `/tools/run-manifest-verifier` | Verify prior workbench input/output/settings receipts | Fixture and browser interaction verified; demand NOT PROVEN | Strengthen | Missing slash alias fixed; metadata synchronized | Tool runs, MATCH/changed verdicts |
| `/methodology` | Audit publication and maintenance rules | Repository verified | Keep | Trust and correction asset; not a generic SEO landing page | Method visits, correction contacts |
| `/labs` | Locate public fixtures and runners | Repository verified | Keep | Evidence utility; maintain only with live fixtures | Fixture downloads, reproductions |
| `/guess-the-programming-language/` | Original syntax-recognition quiz | Repository and legacy route evidence verified; current demand NOT PROVEN | Keep | Exact legacy intent restored with new original work; `/quiz` remains a permanent alias | Organic entries, completions |
| `/new-ownership` | Explain identity, rights, and non-transfer boundary | Portfolio and rights manifest verified | Keep | Required identity/consent clarification | Organic entries, correction contacts |
| `/archive/14` | Answer one reviewed legacy target with new project context | Contextter reports 13 links from 13 domains and the anchor “Dev Awesome - Issue #14”; repository evidence supports subject-level continuity | Strengthen | Add the evidenced Issue 14 navigational label to title and H1; no former issue republished | Organic/referral entries, exits to source |
| `/archive/49` | Answer one reviewed legacy target with new project context | Repository legacy manifest supports target-level continuity | Keep | Concise title/description aligned; no former issue republished | Organic/referral entries, exits to source |
| `/impressum` | Current operator identification | Repository verified | Keep | German metadata aligned with visible German content | Availability, legal accuracy |
| `/datenschutz` | Explain current hosting, local tools, analytics, and opt-out | Repository and privacy QA verified | Keep | German metadata aligned with visible German content | Availability, opt-out correctness |

## Alias and non-canonical actions

- Keep `/quiz` as a permanent redirect to `/guess-the-programming-language/`.
- Normalize the non-canonical trailing-slash variant of every slashless canonical route with a permanent redirect.
- Normalize the slashless quiz variant to its canonical trailing-slash URL.
- Keep unknown paths as real 404 responses; do not redirect the former archive pattern to the homepage.
- No evidence currently supports Merge, Noindex, Remove, or a New Page action.

## Implemented in this worktree

- Replaced the verbose per-page title suffix with `DevAwesome` while keeping `DevAwesome Browser Workbench` as the full site/schema name.
- Repositioned the home, tools, workflows, guides, and field-test hubs around browser-based SEO tools, complete data workflows, explicit user jobs, and reproducible proof.
- Aligned each strengthened hub's SEO title, meta description, H1, opening copy, and contextual terminology without repeating exact phrases mechanically.
- Synchronized rendered titles and descriptions with the canonical route registry and added a regression contract.
- Added every missing permanent slash-normalization redirect and a registry-driven redirect regression contract.
- Tightened both reviewed legacy titles/descriptions without copying former content or implying continuity of authorship.
- Repaired the repository browser QA for the current ten-tool inventory, six-step crawl workflow, declared Umami origin, and recipe-v2 preflight behavior.

## Remaining decision gates

1. Repair the keyword provider reservation and Site Audit configuration path, then collect demand and crawl evidence without exceeding the remaining approved budget. Domain/link snapshots are now available; rankings, keyword demand, competitors, GSC, and technical audit health remain `NOT PROVEN`.
2. Connect or refresh Search Console in the correct workspace before making performance-based merge, removal, or new-page decisions.
3. Establish a ranking baseline only for admitted keyword jobs; do not bulk-track every research candidate.
4. Resolve or continue explicitly disclosing former-operator/mark clearance and independent technical review.

## Measurement plan

| Layer | Measure | Success signal | Important limit |
|---|---|---|---|
| Technical eligibility | 200 status, self-canonical, index/follow, sitemap membership, crawlable robots, permanent aliases, real 404 | All canonical routes remain eligible and aliases consolidate | Eligibility does not prove indexing or ranking |
| Discovery and indexing | GSC discovered/indexed canonicals and inspection samples | Intended canonicals discovered without duplicate slash variants | Contextter/GSC snapshot currently NOT PROVEN |
| Search demand | Query/page impressions, clicks, CTR, position by user job | Growth on admitted tool/workflow intents without sibling cannibalization | Do not judge from one short window |
| Product use | Tool/workflow view → input → run → result → export | More completed local outputs on priority jobs | Current Contextter performance data is NOT PROVEN |
| Workflow handoff | Contextual outbound handoff after a completed job | Handoffs help a real next step without becoming the site's reason to exist | Shared ownership is not independent evidence |
| Authority | Relevant referring domains and target health | Genuine third-party use or citation of tools, fixtures, and methods | Contextter baseline exists; source relevance and link quality require review |

## Risk register

| Risk | Current control | Next check |
|---|---|---|
| Keyword or page fan-out | One route per declared user job; no new pages in this pass | Require independent demand and maintenance proof before a new URL |
| Cannibalization between tool, workflow, and guide | Mechanical tool, complete workflow, and decision guide have distinct roles and links | Compare GSC queries/pages once connected |
| Duplicate slash URLs | Explicit permanent aliases now cover the entire canonical registry | Verify live after an separately authorized deployment |
| Unsupported search or product claims | Bounded local-tool language and evidence states remain explicit | Recheck every new claim against first-party execution or primary docs |
| Legacy identity confusion | New-ownership disclosure and rights manifest; only two reviewed legacy targets | Resolve former-operator/mark question or continue prominent disclosure |
| Artificial portfolio linking | Contextual handoffs with adjacent common-ownership disclosure | Remove handoffs that show no real user-path value |
| Stale utilities and tests | Versioned fixtures, field tests, byte budgets, focused browser QA | Retest after browser/API/provider changes |

## Prioritized 30/60/90-day plan

### Days 1–30

1. Resolve `KEYWORD_RESEARCH_SOURCE_RESERVATION_INVALID` and `configureSite` validation, then complete the keyword and Site Audit baseline within the remaining 5 EUR ceiling.
2. Connect or refresh the correct Search Console property in `ws_8kec25mygy81`; record query/page and indexing baselines before content expansion.
3. After a separately authorized deployment, verify every new slash alias, title, description, canonical, sitemap URL, robots rule, and 404 on production.
4. Resolve or formally retain the disclosed former-operator/mark and independent-reviewer gaps.

### Days 31–60

1. Strengthen at most the two tool/workflow jobs with the clearest combined search demand and completed-use evidence.
2. Improve examples, limits, and contextual links on those existing pages before considering a new URL.
3. Compare tool → workflow → export funnels and GSC page/query pairs for abandonment or intent overlap.
4. Seek relevant third-party use of one original tool, fixture, or field test; do not arrange reciprocal portfolio links.

### Days 61–90

1. Review cluster-level impressions, clicks, completed outputs, repeat use, and referring domains against the baseline.
2. Merge, redirect, noindex, or remove only if performance, links, conversions, uniqueness, and intent equivalence are all checked.
3. Add at most one new page only when it represents a distinct user job with independent demand, an original maintained asset, and a clear conversion/evidence path.
4. Choose a maintained scope for the next quarter; reduce or park stale utilities instead of growing the URL count by default.
