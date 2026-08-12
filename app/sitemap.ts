import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/practice", "/leaderboard", "/operator", "/rules", "/about"];
  return routes.map((route) => ({ url: `https://rigyadh.buzz${route}`, lastModified: new Date(), changeFrequency: route === "/leaderboard" ? "daily" : "weekly", priority: route === "" ? 1 : .8 }));
}
