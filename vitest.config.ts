import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` is a marker package that throws under non-react-server
      // runtimes. Tests run under happy-dom, so we swap in a no-op stub.
      // Production builds resolve via Next's react-server condition and never
      // hit this alias.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
