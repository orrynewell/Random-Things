import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves at https://<user>.github.io/<repo>/
// The repo name is "Random-Things"; lowercase form works as well.
export default defineConfig({
  plugins: [react()],
  base: "/Random-Things/",
});
