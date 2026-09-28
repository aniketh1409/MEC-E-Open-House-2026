import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { qrcode } from "vite-plugin-qrcode";

export default defineConfig({
  plugins: [
    react(),
    qrcode(),
  ],
  server: {
    host: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // Full-page tests render the whole app in jsdom; give them headroom when the suite runs in parallel.
    testTimeout: 15_000,
  },
});