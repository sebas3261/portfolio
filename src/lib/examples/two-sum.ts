import type { PlaygroundConfig } from "../playground";
export const twoSumPlayground: PlaygroundConfig = {
  title: "Prueba Two Sum",
  functionName: "twoSum",
  language: "java",
  parameterTypes: ["int[]", "int"],
  code: "import java.util.HashMap;\nimport java.util.Map;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n\n            if (seen.containsKey(complement)) {\n                return new int[] {seen.get(complement), i};\n            }\n            seen.put(nums[i], i);\n        }\n        return new int[] {};\n    }\n}",
  cases: [
    {
      label: "Ejemplo clásico",
      args: [[2, 7, 11, 15], 9],
      expected: [0, 1],
    },
    {
      label: "Otro orden",
      args: [[3, 2, 4], 6],
      expected: [1, 2],
    },
    {
      label: "Duplicados",
      args: [[3, 3], 6],
      expected: [0, 1],
    },
    {
      label: "Negativos",
      args: [[-3, 4, 3, 90], 0],
      expected: [0, 2],
    },
  ],
};
