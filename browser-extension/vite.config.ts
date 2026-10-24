import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = fileURLToPath(new URL(".", import.meta.url));

const pathAliasPlugin: esbuild.Plugin = {
  name: "path-alias",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => ({
      path: resolve(root, "src", args.path.slice(2)),
    }));
    build.onResolve({ filter: /^cn$/ }, () => ({
      path: resolve(root, "node_modules/cn/dist/index.js"),
    }));
  },
};

const contentScriptBuild = {
  bundle: true as const,
  format: "iife" as const,
  platform: "browser" as const,
  target: "es2022",
  logLevel: "info" as const,
  jsx: "automatic" as const,
  loader: { ".ts": "ts", ".tsx": "tsx" } as Record<string, esbuild.Loader>,
  plugins: [pathAliasPlugin],
};

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
        ...contentScriptBuild,
        outfile: resolve(outDir, "content/page.js"),
      });

      await esbuild.build({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/content/links/index.ts")],
        ...contentScriptBuild,
        outfile: resolve(outDir, "content/links.js"),
      });

      await esbuild.build({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/content/annotations/index.ts")],
        ...contentScriptBuild,
        outfile: resolve(outDir, "content/annotations.js"),
      });

      const tailwind = spawnSync(
        "npx",
        [
          "@tailwindcss/cli",
          "-i",
          resolve(root, "src/content/annotations/content-ui.css"),
          "-o",
          resolve(outDir, "content/annotations.css"),
        ],
        { cwd: root, stdio: "inherit" },
      );
      if (tailwind.status !== 0) {
        throw new Error("Failed to compile content annotation styles.");
      }

      await esbuild.build({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/content/gmail/index.ts")],
        ...contentScriptBuild,
        outfile: resolve(outDir, "content/gmail.js"),
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
