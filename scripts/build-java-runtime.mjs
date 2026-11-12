import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
await build({
  entryPoints: ["scripts/java/idb-entry.js"],
  bundle: true,
  minify: true,
  format: "iife",
  outfile: "src/lib/java-idb.generated.js",
});
const dir = mkdtempSync(join(tmpdir(), "portfolio-java-"));
try {
  execFileSync(
    "javac",
    [
      "--release",
      "8",
      "-Xlint:-options",
      "-d",
      dir,
      "scripts/java/PlaygroundRunner.java",
    ],
    { stdio: "inherit" },
  );
  execFileSync(
    "jar",
    ["cf", "public/java/playground-runner.jar", "-C", dir, "."],
    { stdio: "inherit" },
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
