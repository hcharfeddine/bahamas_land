import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { chatMiddleware } from "./server/chatMiddleware";
import { rewardMiddleware } from "./server/rewardMiddleware";
import { playerMiddleware } from "./server/playerMiddleware";
import { hintMiddleware } from "./server/hintMiddleware";

const port = process.env.PORT ? Number(process.env.PORT) : 5173;

const MONSTERS_SRC = path.resolve(import.meta.dirname, "../../monsters");

const monstersPlugin = (): PluginOption => ({
  name: "serve-monsters",
  configureServer(server) {
    server.middlewares.use("/monsters", (req, res, next) => {
      const fileName = (req.url ?? "").replace(/^\//, "");
      const filePath = path.join(MONSTERS_SRC, fileName);
      if (fileName && fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "model/gltf-binary");
        res.setHeader("Cache-Control", "public, max-age=86400");
        fs.createReadStream(filePath).pipe(res);
      } else {
        next();
      }
    });
  },
  closeBundle() {
    if (!fs.existsSync(MONSTERS_SRC)) return;
    const dest = path.resolve(import.meta.dirname, "dist/monsters");
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(MONSTERS_SRC)) {
      fs.copyFileSync(path.join(MONSTERS_SRC, file), path.join(dest, file));
    }
  },
});

const chatApiPlugin = (): PluginOption => ({
  name: "bahamas-chat-api",
  configureServer(server) {
    server.middlewares.use(chatMiddleware);
    server.middlewares.use(rewardMiddleware);
    server.middlewares.use(playerMiddleware);
    server.middlewares.use(hintMiddleware);
  },
  configurePreviewServer(server) {
    server.middlewares.use(chatMiddleware);
    server.middlewares.use(rewardMiddleware);
    server.middlewares.use(playerMiddleware);
    server.middlewares.use(hintMiddleware);
  },
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    chatApiPlugin(),
    monstersPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  optimizeDeps: {
    include: ["phaser"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    commonjsOptions: {
      include: [/phaser/, /node_modules/],
    },
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