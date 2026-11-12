import test from "node:test";
import assert from "node:assert/strict";
import { playgroundFromBlock } from "../src/lib/playground.ts";
const code = (text, language = "plain text") => ({
  type: "code",
  code: { language, rich_text: [{ plain_text: text }] },
});
const toggle = (children, title = "Sandbox: Two Sum") => ({
  type: "toggle",
  toggle: { rich_text: [{ plain_text: title }] },
  children,
});
const settings = {
  language: "javascript",
  functionName: "twoSum",
  cases: [{ label: "Duplicate", args: [[3, 3], 6], expected: [0, 1] }],
};
test("recognizes Notion configuration regardless of highlighting language or block order", () => {
  for (const children of [
    [
      code("function twoSum() {}", "plain text"),
      code(JSON.stringify(settings), "java"),
    ],
    [
      code(JSON.stringify(settings), "json"),
      code("function twoSum() {}", "javascript"),
    ],
  ]) {
    assert.deepEqual(playgroundFromBlock(toggle(children)), {
      title: "Two Sum",
      functionName: "twoSum",
      language: "javascript",
      parameterTypes: undefined,
      code: "function twoSum() {}",
      cases: settings.cases,
    });
  }
});
test("does not convert ordinary toggles or malformed settings", () => {
  assert.equal(playgroundFromBlock(toggle([], "Ordinary note")), undefined);
  assert.equal(playgroundFromBlock(toggle([code("{}")])), undefined);
  assert.equal(
    playgroundFromBlock(
      toggle([
        code("function twoSum() {}"),
        code(JSON.stringify({ ...settings, functionName: "x);alert(1)" })),
      ]),
    ),
    undefined,
  );
  assert.equal(
    playgroundFromBlock(
      toggle([
        code("function twoSum() {}"),
        code(JSON.stringify({ ...settings, cases: [{ args: "invalid" }] })),
      ]),
    ),
    undefined,
  );
});

import { javaLiteral, javaSource } from "../src/lib/java-playground.ts";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("Java arguments preserve arrays, negatives and strings without code injection", () => {
  assert.equal(javaLiteral([3, -2, 4], "int[]"), "new int[]{3, -2, 4}");
  assert.equal(
    javaLiteral('";System.exit(0);//', "String"),
    JSON.stringify('";System.exit(0);//'),
  );
  assert.throws(() => javaLiteral({}, "Object"));
  assert.throws(() => javaSource("", "f();evil", []));
});
test("generated harness compiles real Java and runs a changed algorithm", () => {
  const dir = mkdtempSync(join(tmpdir(), "portfolio-java-test-"));
  try {
    const code =
      "class Solution { public int[] twoSum(int[] nums,int target) { for(int i=0;i<nums.length;i++)for(int j=i+1;j<nums.length;j++)if(nums[i]+nums[j]==target)return new int[]{i,j};return new int[]{}; } }";
    writeFileSync(
      join(dir, "Main.java"),
      javaSource(
        code,
        "twoSum",
        [
          { args: [[3, 2, 4], 6] },
          { args: [[3, 3], 6] },
          { args: [[-3, 4, 3], 0] },
        ],
        ["int[]", "int"],
      ),
    );
    execFileSync("javac", ["-d", dir, join(dir, "Main.java")]);
    const result = execFileSync("java", ["-cp", dir, "Main"], {
      encoding: "utf8",
    });
    assert.match(result, /__RESULT_0__\[1,2\]/);
    assert.match(result, /__RESULT_1__\[0,1\]/);
    assert.match(result, /__RESULT_2__\[0,2\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
