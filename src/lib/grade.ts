import { runCode, type Language } from "./execute";

export interface TestCase {
  name: string;
  stdin: string;
  expectedOutput: string;
  hidden: boolean;
}

export interface TestResult {
  name: string;
  hidden: boolean;
  passed: boolean;
  /** Only populated for non-hidden cases -- hidden cases never leak stdin/expected/actual. */
  detail?: { stdin: string; expected: string; actual: string };
  runtimeError?: string;
}

export interface GradeReport {
  compileOutput: string;
  compileFailed: boolean;
  backendError: boolean;
  backendErrorMessage?: string;
  results: TestResult[];
  allPassed: boolean;
}

function normalize(output: string): string {
  // Trailing whitespace and a missing/extra final newline are the single
  // biggest source of false negatives in output-diffing graders, so we
  // normalize line endings and trim trailing blank space per line/overall
  // rather than asking every exercise author to get printf newlines exact.
  return output
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .trim();
}

export async function gradeExercise(
  code: string,
  tests: TestCase[],
  language: Language = "cpp",
): Promise<GradeReport> {
  // Run the first test to check compilation up front; if it fails to
  // compile there is no point burning the rate limit on the rest.
  const first = await runCode(code, tests[0].stdin, language);

  if (first.backendError) {
    return {
      compileOutput: "",
      compileFailed: false,
      backendError: true,
      backendErrorMessage: first.backendErrorMessage,
      results: [],
      allPassed: false,
    };
  }

  if (first.compileFailed) {
    return {
      compileOutput: first.compileOutput,
      compileFailed: true,
      backendError: false,
      results: [],
      allPassed: false,
    };
  }

  const results: TestResult[] = [];
  results.push(toResult(tests[0], first));

  for (const test of tests.slice(1)) {
    const run = await runCode(code, test.stdin, language);
    if (run.backendError) {
      return {
        compileOutput: "",
        compileFailed: false,
        backendError: true,
        backendErrorMessage: run.backendErrorMessage,
        results,
        allPassed: false,
      };
    }
    results.push(toResult(test, run));
  }

  return {
    compileOutput: first.compileOutput,
    compileFailed: false,
    backendError: false,
    results,
    allPassed: results.every((r) => r.passed),
  };
}

function toResult(test: TestCase, run: Awaited<ReturnType<typeof runCode>>): TestResult {
  const actual = normalize(run.stdout);
  const expected = normalize(test.expectedOutput);
  const passed = actual === expected && run.exitCode === 0;
  const result: TestResult = { name: test.name, hidden: test.hidden, passed };
  if (!test.hidden) {
    result.detail = { stdin: test.stdin, expected, actual };
  }
  if (run.exitCode !== 0 && run.stderr.trim()) {
    result.runtimeError = run.stderr.trim();
  }
  return result;
}
