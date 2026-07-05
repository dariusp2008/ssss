// Config Vite STANDALONE pentru dezvoltare doar-frontend.
// Nu are nevoie de folderul server/. Toate apelurile /api sunt
// redirectate prin proxy către STAGING_API_URL din .env.
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.STAGING_API_URL || "http://localhost:5000";

  return {
    define: {
      __APP_VERSION__: JSON.stringify("dev"),
      __COMMIT_HASH__: JSON.stringify("dev"),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
