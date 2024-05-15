await Bun.build({
  entrypoints: ["./src/index.ts"],
  root: ".",
  outdir: "./dist",
  target: "bun",
  format: "esm",
});
