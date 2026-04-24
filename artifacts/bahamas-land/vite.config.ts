import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { chatMiddleware } from "./server/chatMiddleware";

const port = process.env.PORT ? Number(process.env.PORT) : 5173;

const chatApiPlugin = (): PluginOption => ({
  name: "bahamas-chat-api",
  configureServer(server) {
    server.middlewares.use(chatMiddleware);
  },
  configurePreviewServer(server) {
    server.middlewares.use(chatMiddleware);
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
