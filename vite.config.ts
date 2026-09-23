import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { qrcode } from "vite-plugin-qrcode";

export default defineConfig({
  plugins: [
    react(),
    qrcode(), // Generates phone QR code in terminal
  ],
  server: {
    host: true, // Exposes dev server to local network for mobile preview
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});