import { useEffect, useRef, useState } from "react";
import type { PlaygroundConfig } from "../lib/playground";
import frameDocument from "../lib/playground-frame.html?raw";
import javaTemplate from "../lib/java-frame.html?raw";
import javaIdb from "../lib/java-idb.generated.js?raw";
import javaWorker from "../lib/java-worker.js?raw";
const javaDocument = javaTemplate.replace(
  "/* WORKER_SOURCE */",
  JSON.stringify(javaIdb + "\n" + javaWorker),
);
import { javaSource } from "../lib/java-playground";
import PlaygroundEditor from "./PlaygroundEditor";
import "../styles/playground.css";

type TestResult = {
  label: string;
  output?: string;
  error?: string;
  passed?: boolean | null;
};
type RunResult = {
  error?: string;
  timeout?: boolean;
  logs?: string[];
  results?: TestResult[];
};
export default function CodePlayground({
  config,
  lang = "es",
}: {
  config: PlaygroundConfig;
  lang?: "es" | "en";
}) {
  const es = lang === "es",
    language = config.language ?? "java",
    isJava = language === "java";
  const [code, setCode] = useState(config.code),
    [args, setArgs] = useState(JSON.stringify(config.cases[0].args)),
    [result, setResult] = useState<RunResult | null>(null),
    [running, setRunning] = useState(false),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState(""),
    [frameKey, setFrameKey] = useState(0),
    [activeCase, setActiveCase] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null),
    currentRun = useRef(""),
    tests = useRef(config.cases),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = () => {
    clearTimeout(timer.current);
    currentRun.current = "";
    setRunning(false);
    setFrameKey((v) => v + 1);
    setReady(false);
  };
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (data?.type === "playground-ready") {
        setReady(true);
        return;
      }
      if (data?.id !== currentRun.current) return;
      if (data.type === "playground-status") {
        setStatus(
          data.status === "jvm-ready"
            ? "Cargando el compilador…"
            : data.status === "library-ready"
              ? "Preparando el programa…"
              : data.status === "runtime-script-loaded"
                ? "Iniciando la JVM…"
                : data.status === "loading"
                  ? es
                    ? "Preparando Java… La primera carga puede tardar unos segundos."
                    : "Preparing Java… The first load may take a moment."
                  : es
                    ? "Compilando y ejecutando Java…"
                    : "Compiling and running Java…",
        );
        return;
      }
      if (!["playground-result", "playground-java-result"].includes(data.type))
        return;
      clearTimeout(timer.current);
      currentRun.current = "";
      setRunning(false);
      if (data.type === "playground-java-result") {
        const output = data.output ?? "";
        if (data.error || output.startsWith("ERROR: ")) {
          setResult({ error: data.error ?? output.slice(7) });
          return;
        }
        const logs = output
          .split("\n")
          .filter(
            (line: string) => line && !/^__(RESULT|ERROR)_\d+__/.test(line),
          );
        setResult({
          logs,
          results: tests.current.map((test, i) => {
            const error = output
              .split("\n")
              .find((line: string) => line.startsWith(`__ERROR_${i}__`));
            const value = output
              .split("\n")
              .find((line: string) => line.startsWith(`__RESULT_${i}__`))
              ?.split(`__RESULT_${i}__`)[1];
            let passed: boolean | null = null;
            if (value !== undefined && Object.hasOwn(test, "expected")) {
              try {
                passed =
                  JSON.stringify(JSON.parse(value)) ===
                  JSON.stringify(test.expected);
              } catch {
                passed = false;
              }
            }
            return {
              label: test.label,
              output: value,
              error:
                error?.split(`__ERROR_${i}__`)[1] ??
                (value === undefined ? "No result returned." : undefined),
              passed,
            };
          }),
        });
      } else setResult(data);
    };
    window.addEventListener("message", receive);
    frame.current?.contentWindow?.postMessage({ type: "ping" }, "*");
    return () => {
      window.removeEventListener("message", receive);
      clearTimeout(timer.current);
    };
  }, [frameKey, es]);
  async function run(all: boolean) {
    try {
      const values = all ? [] : JSON.parse(args);
      if (!Array.isArray(values))
        throw new Error(
          es
            ? "Los argumentos deben ser un arreglo JSON."
            : "Arguments must be a JSON array.",
        );
      const runTests = all
        ? config.cases
        : [{ label: es ? "Tu prueba" : "Your test", args: values }];
      tests.current = runTests;
      const source = isJava
        ? javaSource(code, config.functionName, runTests, config.parameterTypes)
        : undefined;
      const id = crypto.randomUUID();
      currentRun.current = id;
      setRunning(true);
      setResult(null);
      setStatus(es ? "Preparando ejecución…" : "Preparing execution…");
      timer.current = setTimeout(
        () => {
          cancel();
          setResult({ timeout: true });
        },
        isJava ? 90000 : 3000,
      );
      if (isJava) {
        const response = await fetch("/java/playground-runner.jar");
        if (!response.ok) throw new Error("No se pudo cargar el entorno Java.");
        const jar = new Uint8Array(await response.arrayBuffer());
        if (currentRun.current !== id) return;
        frame.current?.contentWindow?.postMessage(
          {
            type: "run-java",
            id,
            source,
            jar,
            baseUrl: window.location.origin + "/",
          },
          "*",
        );
      } else
        frame.current?.contentWindow?.postMessage(
          {
            type: "run",
            id,
            code,
            functionName: config.functionName,
            cases: runTests,
          },
          "*",
        );
    } catch (error) {
      clearTimeout(timer.current);
      setRunning(false);
      setResult({ error: (error as Error).message });
    }
  }
  const passed =
    result?.results?.filter((test) => test.passed === true).length ?? 0;
  const checked =
    result?.results?.filter((test) => typeof test.passed === "boolean")
      .length ?? 0;
  return (
    <section className="code-lab" aria-label={`${config.title} sandbox`}>
      <header className="lab-heading">
        <div>
          <span className="lab-kicker">
            {es ? "Llévalo a la práctica" : "Put it into practice"}
          </span>
          <h2>{config.title}</h2>
          <p>
            {es
              ? "Cambia el código o los datos y observa cómo responde la solución."
              : "Change the code or inputs and see how the solution responds."}
          </p>
        </div>
        <span className="lab-language">
          <span /> {isJava ? "Java 21" : "JavaScript"}
        </span>
      </header>
      <div className="lab-workbench">
        <div className="lab-source">
          <div className="lab-filebar">
            <span className="lab-filename">
              <span className="lab-file-icon">{isJava ? "J" : "JS"}</span>
              {isJava ? "Solution.java" : "solution.js"}
            </span>
            <button
              type="button"
              disabled={running}
              onClick={() => {
                setCode(config.code);
                setArgs(JSON.stringify(config.cases[0].args));
                setResult(null);
              }}
              title={
                es ? "Restablecer código y datos" : "Reset code and inputs"
              }
            >
              {es ? "Restablecer" : "Reset"} ↺
            </button>
          </div>
          <PlaygroundEditor
            value={code}
            onChange={setCode}
            language={language}
            label={es ? "Código de la solución" : "Solution code"}
          />
          <div className="lab-editor-footer">
            <span>
              {es
                ? "Tab: indentar · Shift+Tab: desindentar"
                : "Tab: indent · Shift+Tab: outdent"}
            </span>
            <span>
              {code.split("\n").length} {es ? "líneas" : "lines"}
            </span>
          </div>
        </div>
        <div className="lab-tests">
          <div className="lab-panel-title">
            {es ? "Casos de prueba" : "Test cases"}
            <span>{config.cases.length}</span>
          </div>
          <div
            className="lab-case-tabs"
            aria-label={es ? "Ejemplos" : "Examples"}
          >
            {config.cases.map((test, i) => (
              <button
                key={i}
                type="button"
                className={activeCase === i ? "is-active" : ""}
                onClick={() => {
                  setActiveCase(i);
                  setArgs(JSON.stringify(test.args));
                  setResult(null);
                }}
              >
                <span>{test.label}</span>
              </button>
            ))}
          </div>
          <label className="lab-input-label">
            {es ? "Argumentos" : "Arguments"}
            <span>JSON</span>
            <textarea
              aria-label={es ? "Argumentos (JSON)" : "Arguments (JSON)"}
              value={args}
              onChange={(event) => setArgs(event.target.value)}
              spellCheck={false}
              rows={3}
            />
          </label>
          <p className="lab-input-hint">
            {config.functionName}(
            {(config.parameterTypes ?? ["nums", "target"]).join(", ")})
          </p>
          <div className="lab-results" aria-live="polite">
            <div className="lab-panel-title">
              {es ? "Salida" : "Output"}
              {checked > 0 && (
                <span className="lab-result-count">
                  {passed}/{checked} {passed === checked ? "✓" : ""}
                </span>
              )}
            </div>
            {!result && (
              <div className="lab-idle">
                <span>{running ? "◌" : ">_"}</span>
                <p>
                  {running
                    ? status
                    : es
                      ? "Ejecuta tu código para ver el resultado."
                      : "Run your code to see the result."}
                </p>
              </div>
            )}
            {result?.timeout && (
              <p className="lab-error">
                {es
                  ? "La ejecución se detuvo al superar el tiempo límite. Puedes corregir el código y volver a probar."
                  : "Execution stopped after reaching its time limit. You can edit the code and try again."}
              </p>
            )}
            {result?.error && <div className="lab-error">{result.error}</div>}
            {result?.results?.map((test, i) => (
              <div className="lab-result" key={i}>
                <div>
                  <span
                    className={
                      test.error || test.passed === false
                        ? "lab-fail"
                        : "lab-pass"
                    }
                  >
                    {test.error || test.passed === false ? "×" : "✓"}
                  </span>
                  <span>{test.label}</span>
                </div>
                <code>{test.error ?? test.output}</code>
                {test.passed === false && (
                  <small>
                    {es
                      ? "El resultado no coincide con el esperado."
                      : "Result does not match the expected value."}
                  </small>
                )}
              </div>
            ))}
            {!!result?.logs?.length && (
              <div className="lab-console">
                <span>{isJava ? "System.out" : "console.log"}</span>
                <div>{result.logs.join("\n")}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="lab-toolbar">
        <span>
          {isJava
            ? es
              ? "Java real, en tu navegador"
              : "Real Java, in your browser"
            : es
              ? "Se ejecuta en tu navegador"
              : "Runs in your browser"}
          {isJava && (
            <>
              {" "}
              ·{" "}
              <a href="https://cheerpj.com" target="_blank" rel="noreferrer">
                Built with CheerpJ
              </a>
            </>
          )}
        </span>
        <div>
          {running ? (
            <button type="button" className="lab-stop" onClick={cancel}>
              {es ? "Detener" : "Stop"} ■
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!ready}
                className="lab-run-all"
                onClick={() => run(true)}
              >
                {es ? "Probar todos" : "Run all"}
              </button>
              <button
                type="button"
                disabled={!ready}
                className="lab-run"
                onClick={() => run(false)}
              >
                ▷ {es ? "Ejecutar" : "Run"}
              </button>
            </>
          )}
        </div>
      </footer>
      <iframe
        key={frameKey}
        ref={frame}
        srcDoc={isJava ? javaDocument : frameDocument}
        sandbox="allow-scripts"
        title="Isolated runtime"
        hidden
        onLoad={() => {
          setReady(true);
          frame.current?.contentWindow?.postMessage({ type: "ping" }, "*");
        }}
      />
    </section>
  );
}
