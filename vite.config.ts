import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tauri expects a fixed port; fail instead of silently picking another one,
// otherwise `devUrl` in tauri.conf.json would point at nothing.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  // Never expose env vars to the bundle: only VITE_-prefixed ones would be, and we define none.
  envPrefix: ["VITE_"],
  build: { target: "es2022", sourcemap: false },
});
