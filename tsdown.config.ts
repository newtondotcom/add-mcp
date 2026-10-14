import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/lib.ts"],
  format: "esm",
  dts: true,
  clean: true,
  // Published paths are dist/index.js and dist/lib.js.
  fixedExtension: false,
});
