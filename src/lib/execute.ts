// Client for a remote "compile and run" backend, called straight from the
// browser since GitHub Pages is static-only and has no server we control.
//
// This originally targeted the public Piston instance at emkc.org, which is
// what most write-ups of this pattern point to. As of Feb 2026 that public
// instance closed its /execute endpoint to a manual whitelist (confirmed
// live: it now returns 401 with a message pointing at self-hosting), so it
// no longer works for an unauthenticated static site. We use Compiler
// Explorer's (godbolt.org) public API instead: same shape of problem (POST
// source + stdin, get back stdout/stderr/exit code), no auth, and it sends
// `Access-Control-Allow-Origin: *`, so it's usable from any origin. It's
// also the execution backend behind a lot of other public C++ tooling, so
// it's a reasonable bet to stay available.
//
// Everything that talks to it goes through the RunBackend interface below,
// so a self-hosted Judge0 (or a whitelisted Piston instance) can be dropped
// in later by implementing the same one method and changing `activeBackend`.

export type Language = "c" | "cpp";

export interface RunResult {
  stdout: string;
  stderr: string;
  /** Compiler diagnostics (errors and warnings), not program output. */
  compileOutput: string;
  /** True if the compiler failed to produce a binary at all. */
  compileFailed: boolean;
  /** Process exit code, if the program ran. Meaningless when compileFailed is true. */
  exitCode: number | null;
  /** True if the request itself failed (network error, backend down/blocked). */
  backendError: boolean;
  backendErrorMessage?: string;
}

export interface RunBackend {
  name: string;
  run(code: string, stdin: string, language: Language): Promise<RunResult>;
}

const GODBOLT_BASE = "https://godbolt.org/api";
// Pinned to a specific GCC version each, rather than a "latest stable" alias,
// so exercise output can't drift under us if Compiler Explorer's default
// version changes.
const COMPILER_ID: Record<Language, string> = { c: "cg142", cpp: "g142" };

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

function joinLines(lines: Array<{ text: string }> | undefined): string {
  if (!lines) return "";
  return stripAnsi(lines.map((l) => l.text).join("\n"));
}

const godboltBackend: RunBackend = {
  name: "Compiler Explorer (godbolt.org)",
  async run(code, stdin, language) {
    try {
      const res = await fetch(`${GODBOLT_BASE}/compiler/${COMPILER_ID[language]}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          source: code,
          options: {
            userArguments: "",
            compilerOptions: { executorRequest: true },
            filters: { execute: true },
            executeParameters: { args: [], stdin },
          },
        }),
      });

      if (!res.ok) {
        return {
          stdout: "",
          stderr: "",
          compileOutput: "",
          compileFailed: false,
          exitCode: null,
          backendError: true,
          backendErrorMessage: `Run backend returned HTTP ${res.status}. It may be rate-limited or down -- try again in a moment.`,
        };
      }

      const data = await res.json();
      const buildResult = data.buildResult ?? {};
      const compileFailed = data.didExecute === false || (typeof buildResult.code === "number" && buildResult.code !== 0);

      return {
        stdout: joinLines(data.stdout),
        stderr: joinLines(data.stderr),
        compileOutput: joinLines(buildResult.stderr),
        compileFailed,
        exitCode: typeof data.code === "number" && data.didExecute ? data.code : null,
        backendError: false,
      };
    } catch {
      return {
        stdout: "",
        stderr: "",
        compileOutput: "",
        compileFailed: false,
        exitCode: null,
        backendError: true,
        backendErrorMessage:
          "Could not reach the run backend. Check your connection -- the public Compiler Explorer API may also be temporarily unreachable.",
      };
    }
  },
};

export const activeBackend: RunBackend = godboltBackend;

export async function runCode(code: string, stdin: string, language: Language = "cpp"): Promise<RunResult> {
  return activeBackend.run(code, stdin, language);
}
