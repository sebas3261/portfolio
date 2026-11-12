export function javaLiteral(value: unknown, type?: string): string {
  if (Array.isArray(value)) {
    const arrayType = type ?? "int[]";
    if (!/^(?:int|long|double|boolean|String)(?:\[\])+$/.test(arrayType))
      throw new Error("Unsupported Java array type.");
    return `new ${arrayType}{${value.map((item) => javaLiteral(item, arrayType.slice(0, -2))).join(", ")}}`;
  }
  if (typeof value === "number" && Number.isFinite(value))
    return String(value) + (type === "long" ? "L" : "");
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string")
    return JSON.stringify(value).replace(/\\u2028|\\u2029/g, " ");
  if (value === null) return "null";
  throw new Error("Use numbers, strings, booleans, or arrays as arguments.");
}
export function javaSource(
  code: string,
  functionName: string,
  cases: { args: unknown[] }[],
  types?: string[],
) {
  if (!/^[A-Za-z_$][\w$]*$/.test(functionName))
    throw new Error("Invalid method name.");
  const solution = /\bclass\s+Solution\b/.test(code)
    ? code.replace(/\bpublic\s+class\s+Solution\b/, "class Solution")
    : `class Solution {\n${code}\n}`;
  return `import java.util.*;\n${solution}\npublic class Main {
 public static String json(Object v) {
  if(v==null)return "null";
  if(v.getClass().isArray()){StringJoiner out=new StringJoiner(",","[","]");for(int i=0;i<java.lang.reflect.Array.getLength(v);i++)out.add(json(java.lang.reflect.Array.get(v,i)));return out.toString();}
  if(v instanceof Number||v instanceof Boolean)return v.toString();
  return "\\\""+v.toString().replace("\\\\","\\\\\\\\").replace("\\\"","\\\\\\\"").replace("\\n","\\\\n")+"\\\"";
 }
 public static void main(String[] args) {
 ${cases.map((test, i) => `try { Object result = new Solution().${functionName}(${test.args.map((v, j) => javaLiteral(v, types?.[j])).join(", ")}); System.out.println("__RESULT_${i}__"+json(result)); } catch(Throwable e) { System.out.println("__ERROR_${i}__"+e); }`).join("\n")}
 }
}`;
}
