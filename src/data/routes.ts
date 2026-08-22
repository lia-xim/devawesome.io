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
  { path: "/", title: "DevAwesome Field Tests", description: "Reproducible field tests for developer tools, APIs, MCP servers, agents, and engineering workflows.", job: "Understand the publication and choose a useful next step.", cluster: "home", searchEligible: true, evidence: "verified" },
  { path: "/field-tests", title: "Field Tests", description: "The DevAwesome field-test library and the evidence gate every verdict must pass.", job: "Find a published, executable field test.", cluster: "field-tests", searchEligible: true, evidence: "verified" },
  { path: "/field-tests/astro-static-route-contract", title: "Astro Static Route Contract", description: "A reproducible Astro field test for canonical routes, crawlable noindex, an empty hold sitemap, redirects, and 404 output.", job: "Reproduce the Astro route and indexing-hold assertions.", cluster: "field-tests", searchEligible: true, evidence: "verified" },
  { path: "/field-tests/pnpm-frozen-lockfile-contract", title: "pnpm Frozen Lockfile Contract", description: "A reproducible pnpm field test for a matching offline frozen install and a deliberately stale manifest failure.", job: "Reproduce pnpm frozen-lockfile success and failure behavior.", cluster: "field-tests", searchEligible: true, evidence: "verified" },
  { path: "/guides/reproducible-developer-tool-tests", title: "How to Run a Reproducible Developer Tool Test", description: "A practical six-stage guide to declaring, running, breaking, recording, reviewing, and maintaining a developer-tool test.", job: "Learn how to run a bounded, reproducible developer-tool test.", cluster: "method", searchEligible: true, evidence: "supported" },
  { path: "/tools/developer-tool-test-plan", title: "Developer Tool Test Plan Builder", description: "Build and export a structured, browser-local test plan for a developer tool, API, agent, or engineering workflow.", job: "Create a reusable JSON test plan without sending data to a server.", cluster: "tools", searchEligible: true, evidence: "experiment" },
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
