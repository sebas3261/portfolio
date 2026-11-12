let runtime;
let Runner;
let requestId;
const send = (data) => self.postMessage(data);
async function initialize(bytes, baseUrl) {
  importScripts("https://cjrtnc.leaningtech.com/5.0/loader.js");
  send({
    type: "playground-status",
    id: requestId,
    status: "runtime-script-loaded",
  });
  await cheerpjInit({
    version: 21,
    status: "none",
    clipboardMode: "java",
    overrideDocumentBase: baseUrl,
  });
  send({ type: "playground-status", id: requestId, status: "jvm-ready" });
  cheerpOSAddStringFile("/str/playground-runner.jar", bytes);
  const lib = await cheerpjRunLibrary("/str/playground-runner.jar");
  Runner = await lib.PlaygroundRunner;
}
self.onmessage = async ({ data }) => {
  if (data?.type !== "run-java") return;
  requestId = data.id;
  try {
    send({ type: "playground-status", id: data.id, status: "loading" });
    runtime ??= initialize(data.jar, data.baseUrl);
    await runtime;
    send({ type: "playground-status", id: data.id, status: "compiling" });
    const output = await Runner.run(data.source);
    send({
      type: "playground-java-result",
      id: data.id,
      output: String(output),
    });
  } catch (error) {
    runtime = undefined;
    send({
      type: "playground-java-result",
      id: data.id,
      error: String(error?.message ?? error),
    });
  }
};
