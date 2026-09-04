import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// A "module" is one of the ten top-level units in the curriculum
// (e.g. "01-c-foundations"). Metadata lives in a small JSON file per module.
const modules = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/modules" }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    description: z.string(),
    // Shown as a pill-style tag on the module card.
    status: z.enum(["available", "coming-soon"]).default("coming-soon"),
  }),
});

// A "lesson" is a single reading + worked-example page within a module.
// The MDX body is the left-pane lesson text; frontmatter carries routing
// and display metadata.
const lessons = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/lessons" }),
  schema: z.object({
    title: z.string(),
    module: z.string(), // slug of the parent module, e.g. "01-c-foundations"
    order: z.number(),
    summary: z.string(),
    // The single worked example shown in the right-hand live editor pane.
    example: z.object({
      language: z.enum(["c", "cpp"]).default("cpp"),
      code: z.string(),
      stdin: z.string().default(""),
    }),
  }),
});

const testCase = z.object({
  name: z.string(),
  stdin: z.string().default(""),
  expectedOutput: z.string(),
  // Sample cases show the learner the exact input/expected/actual diff on
  // failure. Hidden cases only ever report pass/fail, per the CodeSignal-
  // style "don't leak hidden test details" requirement.
  hidden: z.boolean().default(false),
});

// An "exercise" belongs to a lesson. The MDX body is the problem statement.
const exercises = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/exercises" }),
  schema: z.object({
    title: z.string(),
    lesson: z.string(), // slug of the parent lesson, e.g. "01-c-foundations/02-variables-and-types"
    order: z.number(),
    difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
    language: z.enum(["c", "cpp"]).default("cpp"),
    starter: z.string(),
    tests: z.array(testCase).min(1),
    hints: z.array(z.string()).default([]),
    solution: z.string(),
  }),
});

export const collections = { modules, lessons, exercises };
