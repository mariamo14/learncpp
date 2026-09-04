# learncpp

An interactive, auto-graded C++ course you run entirely in the browser: a short reading, a live worked example,
then exercises you write, run, and submit against hidden test cases. Static site, no backend to host or maintain --
deploys straight to GitHub Pages.

## What's here right now

The engine is done and three modules are written end to end:

- **Module 1 -- C Foundations**: 7 lessons (your first program, variables & types, operators & expressions,
  logical operators & the ternary, control flow, bitwise operators, `printf`/`scanf`/overflow) -- deliberately
  split fine-grained, one new idea per lesson, after feedback that an early draft assumed too much and moved too
  fast, then broadened for fuller topic coverage (bitwise/logical operators, `switch`, `do`/`while`) after feedback
  that it still skipped real exam-relevant material. 23 auto-graded exercises.
- **Module 2 -- Functions, Arrays & Pointers**: 7 lessons (pointer basics on their own before combining them with
  anything else, functions & pointer out-parameters, const-correctness, arrays & pointer arithmetic including 2D
  arrays, C-strings, dynamic memory, recursion). 24 exercises.
- **Module 3 -- Build Tooling & Debugging Literacy**: 4 lessons (the compilation pipeline & reading real
  compiler/linker errors, the preprocessor -- macros, the classic unparenthesized-macro bug, conditional
  compilation, header guards -- build systems & CMake including internal linkage via `static`, debugging with
  gdb/lldb & memory tools). 15 exercises, several with intentionally-broken starter code you fix by reading a real
  error rather than writing from scratch.
- Split-screen lesson view, CodeSignal-style exercise view, progressive hints, gated reference solutions.
- Sidebar with per-lesson checkmarks and an overall progress bar.
- Progress persists in `localStorage`, with export/import to a JSON file (there's no server, so this is the only
  backup mechanism -- export before you clear browser data).

Modules 4-10 exist as roadmap entries (title, description, "coming soon") on the home page but have no lesson
content yet. Content-only PRs adding one module at a time is the intended way to fill them in -- the engine doesn't
need to change for that, only files under `src/content/`.

## Content originality

All lesson text, exercise prompts, starter code, and reference solutions in this repo are written from scratch. The
topic sequence (C basics → OOP → templates → STL → applied numerics, with a dedicated tooling/debugging module
early on) is the same broad shape used by most C++ curricula, and nothing here paraphrases or structurally mirrors
any specific course's text, exercises, or demo code.

## How code execution actually works

The spec for this project called for the public [Piston](https://github.com/engineer-man/piston) API
(`emkc.org/api/v2/piston`) as the run backend, since it's the commonly cited zero-setup option for this pattern.
**That's no longer usable**: as of February 2026 its `/execute` endpoint went whitelist-only and now returns a 401
for any unregistered caller (confirmed live while building this -- `/runtimes` still works, `/execute` doesn't).

This repo uses [Compiler Explorer](https://godbolt.org)'s public API instead ([`src/lib/execute.ts`](src/lib/execute.ts)):
same shape of problem (POST source + stdin, get back stdout/stderr/exit code), no auth required, and it sends
`Access-Control-Allow-Origin: *` so it works from a static site on any origin. Every reference solution's test
cases were verified against it while writing this README.

The run backend sits behind a small `RunBackend` interface with one method, specifically so it can be swapped again
(a self-hosted Judge0, a whitelisted Piston instance, whatever's available next) without touching the grading
logic in [`src/lib/grade.ts`](src/lib/grade.ts) or any component.

**Offline / backend-down behavior**: if the run backend is unreachable, `Run` and `Submit` show a clear inline
error instead of hanging or silently failing -- there is no retry loop and no fake success state.

## Stack

- [Astro](https://astro.build) (static output) with content collections for lessons/exercises/modules
  (`src/content.config.ts`) -- adding a lesson or exercise is "add an `.mdx` file with frontmatter," not "write more
  app code."
- React islands (`client:load`) for the interactive pieces only: the code editor, run/grade workspace, sidebar, and
  progress bar. Everything else is static HTML.
- [CodeMirror 6](https://codemirror.net/) with C++ syntax highlighting for the editor.
- Tailwind v4 for styling.
- GitHub Actions → GitHub Pages for deployment ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)),
  triggered on push to `main`.

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:4321/learncpp/` (the `/learncpp` base path is configured in `astro.config.mjs` to match
where GitHub Pages will serve this from -- see below).

```bash
npm run build    # -> ./dist
npm run preview  # serve the production build locally
```

## Deploying

Push to `main` and the `Deploy to GitHub Pages` workflow builds and publishes automatically. One-time setup in the
repo's GitHub settings: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

If you fork this to a different repo name (or a `<user>.github.io` user-site repo), update `site`/`base` in
`astro.config.mjs` to match, and the `withBase()` helper in `src/lib/site.ts` will pick it up everywhere links are
generated.

## Adding a lesson or exercise

Everything is content, not code:

```
src/content/
  modules/<module-slug>.json          # title, order, description, status
  lessons/<module-slug>/<lesson>.mdx  # frontmatter: title, module, order, summary, example{ language, code, stdin }
  exercises/<module-slug>/<lesson>/<exercise>.mdx
    # frontmatter: title, lesson, order, difficulty, language, starter, tests[], hints[], solution
    # body: the problem statement (rendered as markdown)
```

`tests[]` entries are `{ name, stdin, expectedOutput, hidden }`. Non-hidden ("sample") tests show the learner the
exact stdin/expected/actual diff on failure; hidden ones only ever report pass/fail, per the spec's "no leaking
hidden test details" requirement. Put at least one non-hidden sample test in every exercise -- it's also what the
`Run` button (as opposed to `Submit`) executes against.

The schema is enforced by Zod in `src/content.config.ts`; a malformed frontmatter field fails the build with a
clear error rather than silently rendering wrong.

## Known limitations

- Compiler Explorer is a shared free resource with no uptime SLA, same as Piston was -- expect occasional
  rate-limiting or downtime, which surfaces as the inline backend-error message described above.
- No live in-browser debugger (real `gdb`/`lldb` in a browser is heavy and out of scope here, per the original
  spec). Module 3 (Build Tooling & Debugging Literacy, not yet written) is intended to teach debugger concepts via
  annotated read-only transcripts and compiler-error reading rather than a live stepper.
- Grading compares normalized stdout only (trailing whitespace/newline differences are ignored); it does not check
  stderr content, memory safety, or performance.
