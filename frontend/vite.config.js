import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const modulePath = id.replaceAll("\\", "/");
          if (modulePath.includes("/node_modules/recharts/") || modulePath.includes("/node_modules/d3-") || modulePath.includes("/node_modules/victory-vendor/")) return "charts";
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(modulePath)) return "react-vendor";
        },
      },
    },
  },
});
