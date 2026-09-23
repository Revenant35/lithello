import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiTarget = "http://localhost:4321";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": apiTarget,
      "/socket.io": {
        target: apiTarget,
        ws: true,
      },
    },
  },
});
