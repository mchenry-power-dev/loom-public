import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Only a validated public commit identifier enters this artifact. No other
// process values or build-machine metadata are serialized.
function buildIdentity(): Plugin {
  const candidate = process.env.VITE_DEMO_COMMIT ?? "";
  const commit = /^[a-f\d]{40}$/i.test(candidate)
    ? candidate.toLowerCase()
    : "local";
  return {
    name: "loom-demo-build-identity",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ commit }) + "\n",
      });
    },
  };
}

export default defineConfig({
  base: "/loom-public/",
  plugins: [react(), buildIdentity()],
  // Secondary routes and exporters load on demand. Avoid redundant modulepreload
  // hints, which WebKit can retain as unused after an in-app route transition.
  build: { sourcemap: false, modulePreload: false },
});
