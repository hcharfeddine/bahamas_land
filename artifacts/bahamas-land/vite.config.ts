import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { chatMiddleware } from "./server/chatMiddleware";
import { rewardMiddleware } from "./server/rewardMiddleware";
import { playerMiddleware } from "./server/playerMiddleware";

const port = process.env.PORT ? Number(process.env.PORT) : 5173;

const chatApiPlugin = (): PluginOption => ({
  name: "bahamas-chat-api",
  configureServer(server) {
    server.middlewares.use(chatMiddleware);
    server.middlewares.use(rewardMiddleware);
    server.middlewares.use(playerMiddleware);
  },
  configurePreviewServer(server) {
    server.middlewares.use(chatMiddleware);
    server.middlewares.use(rewardMiddleware);
    server.middlewares.use(playerMiddleware);
  },
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    chatApiPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    // NOTE: do NOT add a custom `manualChunks` here. Splitting React /
    // react-dom / @tanstack / wouter into separate chunks can cause a
    // circular-init / TDZ failure on production builds and renders the
    // entire app blank. Vite + Rollup auto-split per dynamic import
    // (which we already use via React.lazy) is enough.
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
