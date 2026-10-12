import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
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
        entryPoints: [resolve(root, "src/background.ts")],
        bundle: true,
        format: "esm",
        outfile: resolve(outDir, "background.js"),
        platform: "browser",
        target: "es2022",
        logLevel: "info",
      });

      await esbuild.build({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/content/gmail.ts")],
        bundle: true,
        format: "iife",
        outfile: resolve(outDir, "content/gmail.js"),
        platform: "browser",
        target: "es2022",
        logLevel: "info",
      });

      await copyFile(
        resolve(root, "src/content/panel.css"),
        resolve(outDir, "content/panel.css"),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), bundleExtensionScripts()],
  base: "./",
  build: {
    rollupOptions: {
      input: {
        popup: "index.html",
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
