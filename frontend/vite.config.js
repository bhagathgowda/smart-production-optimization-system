import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const modulePath = id.replaceAll("\\", "/");
          if (modulePath.includes("/node_modules/three/")) return "three-vendor";
          if (modulePath.includes("/node_modules/recharts/") || modulePath.includes("/node_modules/d3-") || modulePath.includes("/node_modules/victory-vendor/")) return "charts";
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(modulePath)) return "react-vendor";
        },
      },
    },
  },
});
