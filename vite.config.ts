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
    chunkSizeWarningLimit: 1500,
    // No manualChunks: rolling our own kept splitting React-namespace
    // consumers (radix, recharts, dnd-kit, hook-form, react-router…)
    // into chunks that loaded before `react`'s namespace was populated,
    // throwing `Cannot read properties of undefined (reading 'forwardRef'
    // / 'createContext')` at runtime. Vite's default chunking handles
    // the dependency graph correctly out of the box.
  },
}));
