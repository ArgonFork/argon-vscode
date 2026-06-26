import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("../out/webview", import.meta.url)),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL("src/index.tsx", import.meta.url)),
      output: {
        format: "iife",
        name: "ArgonWebview",
        entryFileNames: "index.js",
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "index.css" : "[name][extname]",
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
