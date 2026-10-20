import { mkdir } from "node:fs/promises";
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = fileURLToPath(new URL(".", import.meta.url));

function bundleExtensionScripts(): Plugin {
  return {
    name: "bundle-extension-scripts",
    apply: "build",
    async closeBundle() {
      const outDir = resolve(root, "dist");
      await mkdir(resolve(outDir, "content"), { recursive: true });

      await esbuild.build({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/background/index.ts")],
        bundle: true,
        format: "esm",
        outfile: resolve(outDir, "background.js"),
        platform: "browser",
        target: "es2022",
        logLevel: "info",
      });

      await esbuild.build({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/content/page/index.ts")],
        bundle: true,
        format: "iife",
        outfile: resolve(outDir, "content/page.js"),
        platform: "browser",
        target: "es2022",
        logLevel: "info",
      });

      await esbuild.build({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/content/links/index.ts")],
        bundle: true,
        format: "iife",
        outfile: resolve(outDir, "content/links.js"),
        platform: "browser",
        target: "es2022",
        logLevel: "info",
      });

      await esbuild.build({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/content/annotations/index.ts")],
        bundle: true,
        format: "iife",
        outfile: resolve(outDir, "content/annotations.js"),
        platform: "browser",
        target: "es2022",
        logLevel: "info",
      });

      await esbuild.build({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/content/gmail/index.ts")],
        bundle: true,
        format: "iife",
        outfile: resolve(outDir, "content/gmail.js"),
        platform: "browser",
        target: "es2022",
        logLevel: "info",
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), bundleExtensionScripts()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: "index.html",
        options: "options.html",
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
