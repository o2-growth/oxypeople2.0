import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode !== "production",
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // React core + every lib that does `import * as React from "react"`
          // MUST live in the same chunk; otherwise the consumer chunk loads
          // before React's namespace is populated and `React.forwardRef` is
          // undefined at runtime (Radix, Recharts, day-picker, dnd-kit,
          // react-hook-form, react-is etc. all hit this).
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("react-is") ||
            id.includes("scheduler") ||
            id.includes("@radix-ui") ||
            id.includes("recharts") ||
            id.includes("d3-") ||
            id.includes("react-day-picker") ||
            id.includes("@dnd-kit") ||
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("react-router") ||
            id.includes("lucide-react") ||
            id.includes("class-variance-authority") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("sonner")
          ) {
            return "vendor-react";
          }
          if (id.includes("@sentry")) return "vendor-sentry";
          if (id.includes("posthog-js")) return "vendor-posthog";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("reactflow") || id.includes("@reactflow")) return "vendor-reactflow";
          if (id.includes("html-to-image")) return "vendor-html-to-image";
          if (id.includes("date-fns")) return "vendor-dates";
          if (id.includes("zod")) return "vendor-zod";
          return "vendor-misc";
        },
      },
    },
  },
}));
