export const toolCategories = [
  {
    id: "seo-data",
    name: "SEO data",
    description: "Clean keyword and URL inputs before they enter a crawl, import, or reporting workflow.",
  },
  {
    id: "developer-utilities",
    name: "Developer utilities",
    description: "Small browser tools for structured data, identifiers, hashing, and repeatable test cases.",
  },
] as const;

export type ToolCategoryId = (typeof toolCategories)[number]["id"];

export const tools: ReadonlyArray<{
  path: string;
  name: string;
  description: string;
  glyph: string;
  category: ToolCategoryId;
  featured?: boolean;
}> = [
  {
    path: "/tools/keyword-list-cleaner",
    name: "Keyword list cleaner",
    description: "Clean, deduplicate, and export keyword lists.",
    glyph: "Aa",
    category: "seo-data",
    featured: true,
  },
  {
    path: "/tools/url-list-normalizer",
    name: "URL list normalizer",
    description: "Validate and normalize URLs for a crawl list.",
    glyph: "URL",
    category: "seo-data",
    featured: true,
  },
  {
    path: "/tools/json-formatter",
    name: "JSON formatter",
    description: "Format and validate JSON, API, and SEO export data.",
    glyph: "{ }",
    category: "developer-utilities",
  },
  {
    path: "/tools/uuid-generator",
    name: "UUID generator",
    description: "Generate secure v4 UUIDs instantly.",
    glyph: "ID",
    category: "developer-utilities",
  },
  {
    path: "/tools/evidence-receipt",
    name: "SHA-256 hash",
    description: "Create SHA-256 hashes from text.",
    glyph: "#",
    category: "developer-utilities",
  },
  {
    path: "/tools/developer-tool-test-plan",
    name: "Simple test case builder",
    description: "Turn one expected result into a short test case.",
    glyph: "list",
    category: "developer-utilities",
  },
];
