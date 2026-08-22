import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://devawesome.io/",
  output: "static",
  trailingSlash: "ignore",
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\/$/, "") || "/";
        return !["/404", "/404.html", "/quiz"].includes(pathname);
      },
      serialize(item) {
        const url = new URL(item.url);
        if (url.pathname !== "/" && url.pathname !== "/guess-the-programming-language/") {
          url.pathname = url.pathname.replace(/\/$/, "");
        }
        return { ...item, url: url.href };
      },
    }),
  ],
});


