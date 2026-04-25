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
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy vendor libs into their own cached chunks so the
        // first load is small and route navigations stay smooth.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) return "vendor-react";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("wouter")) return "vendor-router";
          return "vendor";
        },
      },
    },
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
