import { useRef, useState } from "react";
import CodeEditor, { type CodeEditorHandle } from "./CodeEditor";
import { runCode, type Language } from "../lib/execute";
import { gradeExercise, type GradeReport, type TestCase } from "../lib/grade";
import { markExerciseComplete } from "../lib/progress";

interface ExerciseWorkspaceProps {
  slug: string;
  starter: string;
  tests: TestCase[];
  hints: string[];
  solution: string;
  language: Language;
}

type Mode = "idle" | "running" | "grading";

export default function ExerciseWorkspace({ slug, starter, tests, hints, solution, language }: ExerciseWorkspaceProps) {
  const editorRef = useRef<CodeEditorHandle | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [report, setReport] = useState<GradeReport | null>(null);
  const [revealedHints, setRevealedHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [justPassed, setJustPassed] = useState(false);

  const sampleTest = tests.find((t) => !t.hidden) ?? tests[0];

  async function handleRun() {
    setMode("running");
    setRunOutput(null);
    const source = editorRef.current?.getContent() ?? starter;
    const result = await runCode(source, sampleTest.stdin, language);
    setMode("idle");
    if (result.backendError) {
      setRunOutput(result.backendErrorMessage ?? "Couldn't reach the run backend.");
      return;
    }
    const parts = [];
    if (result.compileOutput.trim()) parts.push(result.compileOutput.trim());
    if (result.stdout) parts.push(result.stdout);
    if (result.stderr.trim()) parts.push(result.stderr.trim());
    setRunOutput(parts.join("\n") || "(no output)");
  }

  async function handleSubmit() {
    setMode("grading");
    setReport(null);
    const source = editorRef.current?.getContent() ?? starter;
    const result = await gradeExercise(source, tests, language);
    setMode("idle");
    setReport(result);
    if (result.allPassed) {
      markExerciseComplete(slug);
      setJustPassed(true);
    }
  }

  function handleReset() {
    editorRef.current?.setContent(starter);
    setRunOutput(null);
    setReport(null);
  }

  const canShowSolution = showSolution || (report?.allPassed ?? false);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-slate-400">Your solution</span>
          <div className="flex gap-2">
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
              disabled={mode !== "idle"}
              className="text-xs px-3 py-1 rounded border border-cyan-600 text-cyan-300 hover:bg-cyan-950 disabled:opacity-60"
            >
              {mode === "running" ? "Running…" : "Run"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mode !== "idle"}
              className="text-xs px-3 py-1 rounded bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-900 font-semibold disabled:opacity-60"
            >
              {mode === "grading" ? "Grading…" : "Submit"}
            </button>
          </div>
        </div>

        <CodeEditor ref={editorRef} initialValue={starter} onChange={() => {}} minHeight="280px" />

        {sampleTest && (
          <p className="text-[11px] text-slate-500">
            "Run" uses the sample stdin{sampleTest.stdin ? ` (${JSON.stringify(sampleTest.stdin)})` : " (none)"}. "Submit" checks
            your code against all {tests.length} test case{tests.length === 1 ? "" : "s"}.
          </p>
        )}

        {runOutput !== null && (
          <div className="rounded-md border border-slate-700 bg-slate-950 p-2 text-xs font-mono whitespace-pre-wrap text-slate-300">
            {runOutput}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Test results</h3>
          {!report && <p className="text-xs text-slate-500">Submit your solution to run it against all test cases.</p>}
          {report?.backendError && (
            <p className="text-xs text-rose-300 border border-rose-800 bg-rose-950/40 rounded-md p-2">
              {report.backendErrorMessage ?? "Couldn't reach the run backend. Try again in a moment."}
            </p>
          )}
          {report?.compileFailed && (
            <div className="text-xs text-rose-300 border border-rose-800 bg-rose-950/40 rounded-md p-2 font-mono whitespace-pre-wrap">
              {report.compileOutput}
            </div>
          )}
          {report && !report.backendError && !report.compileFailed && (
            <ul className="flex flex-col gap-2">
              {report.results.map((r, i) => (
                <li
                  key={i}
                  className={`rounded-md border p-2 text-xs ${
                    r.passed ? "border-emerald-800 bg-emerald-950/30" : "border-rose-800 bg-rose-950/30"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <span className={r.passed ? "text-emerald-400" : "text-rose-400"}>{r.passed ? "✓ PASS" : "✗ FAIL"}</span>
                    <span className="text-slate-300">{r.hidden ? `Hidden case ${i + 1}` : r.name}</span>
                  </div>
                  {!r.passed && r.detail && (
                    <div className="mt-1 font-mono text-slate-400 whitespace-pre-wrap">
                      {r.detail.stdin && <div>stdin: {r.detail.stdin}</div>}
                      <div>expected: {r.detail.expected || "(empty)"}</div>
                      <div>actual: {r.detail.actual || "(empty)"}</div>
                    </div>
                  )}
                  {!r.passed && r.runtimeError && (
                    <div className="mt-1 font-mono text-rose-300 whitespace-pre-wrap">{r.runtimeError}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {justPassed && (
            <p className="mt-2 text-sm font-semibold text-emerald-400">All tests passed! Marked as complete.</p>
          )}
        </div>

        {hints.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Hints</h3>
            <ul className="flex flex-col gap-2">
              {hints.slice(0, revealedHints).map((hint, i) => (
                <li key={i} className="rounded-md border border-amber-800 bg-amber-950/20 p-2 text-xs text-amber-100">
                  {hint}
                </li>
              ))}
            </ul>
            {revealedHints < hints.length && (
              <button
                type="button"
                onClick={() => setRevealedHints((n) => n + 1)}
                className="mt-2 text-xs px-2 py-1 rounded border border-amber-700 text-amber-300 hover:bg-amber-950/40"
              >
                Show hint {revealedHints + 1} of {hints.length}
              </button>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Reference solution</h3>
          {!canShowSolution && (
            <button
              type="button"
              onClick={() => setShowSolution(true)}
              className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Show solution (try it yourself first!)
            </button>
          )}
          {canShowSolution && (
            <pre className="rounded-md border border-slate-700 bg-slate-950 p-2 text-xs font-mono whitespace-pre-wrap text-slate-300 overflow-x-auto">
              {solution}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
