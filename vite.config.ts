import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import { builtinModules } from "module";

// Native modules that should not be bundled
const nativeModules = [
  "electron",
  "exceljs",
  "sharp",
  "jszip",
  "onnxruntime-node",
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            lib: {
              entry: "electron/main.ts",
              formats: ["cjs"],
            },
            rollupOptions: {
              external: nativeModules,
            },
          },
          resolve: {
            // Resolve native modules to external
            alias: {
              "onnxruntime-node": "onnxruntime-node",
            },
          },
        },
      },
      {
        // Preload script
        entry: "electron/preload.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: "dist-electron",
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: "dist",
  },
});
