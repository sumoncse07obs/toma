import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://tomaapi.thedrivingtrafficformula.com",
        changeOrigin: true,
        secure: false,
        // If you need websockets too, uncomment:
        // ws: true,
        configure: (proxy /*, options*/) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const auth = req.headers["authorization"];
            if (auth) proxyReq.setHeader("authorization", auth);
          });
        },
      },
    },
  },
});
