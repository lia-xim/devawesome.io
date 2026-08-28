export type EvidenceState = "verified" | "supported" | "hypothesis" | "experiment" | "rejected";

export interface CanonicalRoute {
  path: string;
  title: string;
  description: string;
  job: string;
  cluster: "home" | "field-tests" | "tools" | "method" | "quiz" | "identity" | "legacy" | "legal";
  searchEligible: boolean;
  evidence: EvidenceState;
}

export const canonicalRoutes: CanonicalRoute[] = [
  { path: "/", title: "Simple Browser Tools for Developers and SEO Teams", description: "Clean keyword lists, normalize URLs, format JSON, generate UUIDs, create SHA-256 hashes, and build test cases locally in your browser.", job: "Choose and use one small developer or SEO data tool immediately.", cluster: "home", searchEligible: true, evidence: "verified" },
  { path: "/field-tests", title: "Field Tests", description: "The DevAwesome field-test library and the evidence gate every verdict must pass.", job: "Find a published, executable field test.", cluster: "field-tests", searchEligible: true, evidence: "verified" },
  { path: "/field-tests/astro-static-route-contract", title: "Astro Static Route Contract", description: "A reproducible Astro field test for canonical routes, crawlable noindex, an empty hold sitemap, redirects, and 404 output.", job: "Reproduce the Astro route and indexing-hold assertions.", cluster: "field-tests", searchEligible: true, evidence: "verified" },
  { path: "/field-tests/pnpm-frozen-lockfile-contract", title: "pnpm Frozen Lockfile Contract", description: "A reproducible pnpm field test for a matching offline frozen install and a deliberately stale manifest failure.", job: "Reproduce pnpm frozen-lockfile success and failure behavior.", cluster: "field-tests", searchEligible: true, evidence: "verified" },
  { path: "/field-tests/evidence-receipt-contract", title: "Evidence Receipt Contract", description: "A reproducible SHA-256 field test comparing known vectors, normalized text, Web Crypto, and Node crypto output.", job: "Reproduce the integrity contract behind the evidence-receipt tool.", cluster: "field-tests", searchEligible: true, evidence: "verified" },
  { path: "/guides/reproducible-developer-tool-tests", title: "How to Run a Reproducible Developer Tool Test", description: "A practical six-stage guide to declaring, running, breaking, recording, reviewing, and maintaining a developer-tool test.", job: "Learn how to run a bounded, reproducible developer-tool test.", cluster: "method", searchEligible: true, evidence: "supported" },
  { path: "/guides", title: "Developer and SEO Tool Guides", description: "Practical DevAwesome guides for reproducible tool tests, technical methods, and the evidence behind browser-local mini tools.", job: "Choose a practical guide or evidence collection.", cluster: "method", searchEligible: true, evidence: "supported" },
  { path: "/tools", title: "Developer and SEO Mini Tools", description: "Free browser-local mini tools for keyword lists, URL sets, JSON, UUIDs, SHA-256 hashes, and simple test cases.", job: "Browse browser-local developer and SEO tools by category.", cluster: "tools", searchEligible: true, evidence: "verified" },
  { path: "/tools/keyword-list-cleaner", title: "Keyword List Cleaner", description: "Clean, trim, and deduplicate keyword lists locally in your browser. Paste lines, CSV, or TSV and export one keyword per line.", job: "Clean and deduplicate a keyword list for import or tracking.", cluster: "tools", searchEligible: true, evidence: "experiment" },
  { path: "/tools/url-list-normalizer", title: "URL List Normalizer", description: "Validate, normalize, and deduplicate HTTP and HTTPS URL lists locally in your browser before a crawl or import.", job: "Create a normalized URL list and identify invalid entries.", cluster: "tools", searchEligible: true, evidence: "experiment" },
  { path: "/tools/json-formatter", title: "JSON Formatter", description: "Format, validate, and minify JSON, API payloads, and SEO export data locally in your browser without uploading it.", job: "Format or minify JSON and identify syntax errors.", cluster: "tools", searchEligible: true, evidence: "experiment" },
  { path: "/tools/uuid-generator", title: "UUID Generator", description: "Generate cryptographically random UUID v4 values locally in your browser.", job: "Generate and copy one or more UUID v4 values.", cluster: "tools", searchEligible: true, evidence: "experiment" },
  { path: "/tools/developer-tool-test-plan", title: "Simple Test Case Builder", description: "Turn one action, expected result, and edge case into a short Markdown test case locally in your browser.", job: "Create a compact Markdown test case without sending data to a server.", cluster: "tools", searchEligible: true, evidence: "experiment" },
  { path: "/tools/evidence-receipt", title: "SHA-256 Hash Generator", description: "Create a SHA-256 hash from text locally in your browser without uploading it.", job: "Create and copy a SHA-256 digest for normalized text.", cluster: "tools", searchEligible: true, evidence: "experiment" },
  { path: "/methodology", title: "Methodology", description: "How DevAwesome declares, runs, breaks, reviews, reproduces, maintains, and retires developer-tool field tests.", job: "Audit the publication standard behind DevAwesome verdicts.", cluster: "method", searchEligible: true, evidence: "verified" },
  { path: "/labs", title: "Labs", description: "Public DevAwesome fixtures, runners, saved results, and reproduction steps for published field tests.", job: "Locate the artifacts needed to reproduce a published test.", cluster: "field-tests", searchEligible: true, evidence: "verified" },
  { path: "/guess-the-programming-language/", title: "Guess the Programming Language", description: "Identify eight programming languages from short code samples and inspect the syntax clue behind every answer.", job: "Practice recognizing programming languages from syntax clues.", cluster: "quiz", searchEligible: true, evidence: "verified" },
  { path: "/new-ownership", title: "New Ownership", description: "The ownership, identity, rights, editorial, and search-indexing boundaries for the current DevAwesome site.", job: "Verify who operates the current site and what did not transfer.", cluster: "identity", searchEligible: true, evidence: "verified" },
  { path: "/archive/14", title: "One HTML Page Challenge", description: "A current, independently written project note for the former DevAwesome issue 14 URL, with a clear ownership boundary.", job: "Answer the surviving issue-14 link with a current project note.", cluster: "legacy", searchEligible: true, evidence: "supported" },
  { path: "/archive/49", title: "HTML Memory Tested", description: "A current, independently written project note for the former DevAwesome issue 49 URL, with a clear ownership boundary.", job: "Answer the surviving issue-49 link with a current project note.", cluster: "legacy", searchEligible: true, evidence: "supported" },
  { path: "/impressum", title: "Impressum", description: "Legal provider identification for devawesome.io under its current operator.", job: "Find the current operator's legal contact details.", cluster: "legal", searchEligible: true, evidence: "verified" },
  { path: "/datenschutz", title: "Datenschutz", description: "Privacy information for the current, analytics-free devawesome.io website.", job: "Understand current data processing and contact channels.", cluster: "legal", searchEligible: true, evidence: "verified" },
];

export const canonicalRouteMap = new Map(canonicalRoutes.map((route) => [route.path, route]));

export function toCanonicalUrl(path: string, host = "https://devawesome.io") {
  return new URL(path, host).href;
}
