export interface PlaygroundConfig {
  title: string;
  language?: "java" | "javascript";
  parameterTypes?: string[];
  functionName: string;
  code: string;
  cases: { label: string; args: unknown[]; expected?: unknown }[];
}

// A Notion toggle titled "Sandbox: …" contains a JS block and a JSON settings block.
export function playgroundFromBlock(
  block: Record<string, any>,
): PlaygroundConfig | undefined {
  if (block.type !== "toggle") return undefined;
  const title = (block.toggle?.rich_text ?? [])
    .map((part: any) => part.plain_text ?? "")
    .join("");
  if (!/^sandbox(?:\s*:|$)/i.test(title.trim())) return undefined;
  const codeBlocks = (block.children ?? []).filter(
    (child: any) => child.type === "code",
  );
  const text = (child: any) =>
    (child?.code?.rich_text ?? [])
      .map((part: any) => part.plain_text ?? "")
      .join("");
  // Match settings by their content so the Notion syntax-highlighting choice is optional.
  const settings = codeBlocks.find((child: any) => {
    try {
      const value = JSON.parse(text(child));
      return (
        value &&
        typeof value.functionName === "string" &&
        Array.isArray(value.cases)
      );
    } catch {
      return false;
    }
  });
  const source = codeBlocks.find((child: any) => child !== settings);
  try {
    const config = JSON.parse(text(settings));
    if (!source || !/^[A-Za-z_$][\w$]*$/.test(config.functionName))
      return undefined;
    if (
      !Array.isArray(config.cases) ||
      !config.cases.length ||
      config.cases.some((item: any) => !Array.isArray(item.args))
    )
      return undefined;
    return {
      title: title.replace(/^sandbox\s*:?\s*/i, "").trim() || "Sandbox",
      functionName: config.functionName,
      language:
        config.language === "javascript"
          ? "javascript"
          : config.language === "java" || source.code.language === "java"
            ? "java"
            : "javascript",
      parameterTypes: config.parameterTypes,
      code: text(source),
      cases: config.cases.map((item: any, i: number) => ({
        ...item,
        label: String(item.label ?? `#${i + 1}`),
      })),
    };
  } catch {
    return undefined;
  }
}
