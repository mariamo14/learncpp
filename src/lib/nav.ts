import { getCollection } from "astro:content";
import type { NavModule } from "../components/Sidebar";

/** Build the full module -> lesson -> exercise-slugs tree used by the sidebar, progress bar, and index page. */
export async function buildNav(): Promise<NavModule[]> {
  const [modules, lessons, exercises] = await Promise.all([
    getCollection("modules"),
    getCollection("lessons"),
    getCollection("exercises"),
  ]);

  const sortedModules = [...modules].sort((a, b) => a.data.order - b.data.order);

  return sortedModules.map((mod) => {
    const moduleSlug = mod.id.replace(/\.json$/, "");
    const moduleLessons = lessons
      .filter((l) => l.data.module === moduleSlug)
      .sort((a, b) => a.data.order - b.data.order);

    return {
      slug: moduleSlug,
      title: mod.data.title,
      description: mod.data.description,
      status: mod.data.status,
      lessons: moduleLessons.map((lesson) => ({
        slug: lesson.id,
        title: lesson.data.title,
        exerciseSlugs: exercises
          .filter((ex) => ex.data.lesson === lesson.id)
          .sort((a, b) => a.data.order - b.data.order)
          .map((ex) => ex.id),
      })),
    };
  });
}

export function allExerciseSlugs(modules: NavModule[]): string[] {
  return modules.flatMap((m) => m.lessons.flatMap((l) => l.exerciseSlugs));
}
