import { useRef, useState } from "react";
import CodeEditor, { type CodeEditorHandle } from "./CodeEditor";
import { runCode, type Language } from "../lib/execute";

interface SnippetRunnerProps {
  code: string;
  stdin?: string;
  language?: Language;
}

type RunState = "idle" | "running" | "done" | "error";

export default function SnippetRunner({ code, stdin = "", language = "cpp" }: SnippetRunnerProps) {
  const editorRef = useRef<CodeEditorHandle | null>(null);
  const [state, setState] = useState<RunState>("idle");
  const [output, setOutput] = useState("");
  const [stdinValue, setStdinValue] = useState(stdin);
  const [showStdin, setShowStdin] = useState(stdin.length > 0);

  async function handleRun() {
    setState("running");
    const source = editorRef.current?.getContent() ?? code;
    const result = await runCode(source, stdinValue, language);
    if (result.backendError) {
      setState("error");
      setOutput(result.backendErrorMessage ?? "Couldn't reach the run backend.");
      return;
    }
    setState("done");
    const parts = [];
    if (result.compileOutput.trim()) parts.push(result.compileOutput.trim());
    if (result.stdout) parts.push(result.stdout);
    if (result.stderr.trim()) parts.push(result.stderr.trim());
    setOutput(parts.join("\n") || "(no output)");
  }

  function handleReset() {
    editorRef.current?.setContent(code);
    setOutput("");
    setState("idle");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-400">Try it</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowStdin((v) => !v)}
            className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            stdin
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={state === "running"}
            className="text-xs px-3 py-1 rounded bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-900 font-semibold disabled:opacity-60"
          >
            {state === "running" ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      <CodeEditor ref={editorRef} initialValue={code} onChange={() => {}} minHeight="160px" />

      {showStdin && (
        <textarea
          value={stdinValue}
          onChange={(e) => setStdinValue(e.target.value)}
          placeholder="stdin (optional)"
          rows={2}
          className="w-full rounded-md border border-slate-700 bg-slate-900 text-slate-200 text-xs font-mono p-2"
        />
      )}

      <div
        className={`rounded-md border p-2 text-xs font-mono whitespace-pre-wrap min-h-[3rem] ${
          state === "error" ? "border-rose-700 bg-rose-950/40 text-rose-200" : "border-slate-700 bg-slate-950 text-slate-300"
        }`}
      >
        {output || <span className="text-slate-500">Output will appear here.</span>}
      </div>
    </div>
  );
}
