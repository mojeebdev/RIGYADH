import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "RIGYADH", short_name: "RIGYADH", description: "5,555 rigs. One field.", start_url: "/practice", display: "standalone", background_color: "#080b09", theme_color: "#080b09", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}
