/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build a fully static site into /out for GitHub Pages (no Node server).
  output: "export",
  // Emit /posts/foo/index.html so GitHub Pages serves /posts/foo/ directly.
  trailingSlash: true,
  // The default image optimizer needs a server; serve images as-is.
  images: {
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
