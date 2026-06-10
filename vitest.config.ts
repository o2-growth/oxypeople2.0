import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Externalizado, o Zod é carregado pelo Node nativo e ignora o alias abaixo;
    // inline força o Zod a passar pelo pipeline do Vite (e respeitar o alias).
    server: { deps: { inline: ["zod"] } },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Zod 3.25 expõe `sourceDialects: ["@zod/source"]`, fazendo o Vitest resolver
      // o TS cru (./src/index.ts) em vez do build — a init circular do source quebra
      // `z.string` no ambiente de teste. Forçamos o entrypoint compilado.
      zod: path.resolve(__dirname, "./node_modules/zod/index.js"),
    },
  },
});
