import { useEffect, useState } from "react";
import { loadProgress, onProgressChange, type ProgressData } from "../lib/progress";
import { withBase } from "../lib/site";

export interface NavLesson {
  slug: string; // "01-c-foundations/01-variables-and-operators"
  title: string;
  exerciseSlugs: string[];
}

export interface NavModule {
  slug: string; // "01-c-foundations"
  title: string;
  description: string;
  status: "available" | "coming-soon";
  lessons: NavLesson[];
}

interface SidebarProps {
  modules: NavModule[];
  currentLessonSlug?: string;
}

export default function Sidebar({ modules, currentLessonSlug }: SidebarProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
    return onProgressChange(setProgress);
  }, []);

  const completed = progress?.completedExercises ?? [];

  return (
    <nav className="flex flex-col gap-4 text-sm">
      {modules.map((mod) => {
        const allExercises = mod.lessons.flatMap((l) => l.exerciseSlugs);
        const doneCount = allExercises.filter((s) => completed.includes(s)).length;
        return (
          <div key={mod.slug}>
            <div className="flex items-center justify-between px-2">
              <span className="font-semibold text-slate-200">{mod.title}</span>
              {mod.status === "coming-soon" ? (
                <span className="text-[10px] uppercase tracking-wide rounded-full border border-slate-700 text-slate-500 px-2 py-0.5">
                  soon
                </span>
              ) : allExercises.length > 0 ? (
                <span className="text-[10px] text-slate-500">
                  {doneCount}/{allExercises.length}
                </span>
              ) : null}
            </div>
            {mod.status === "available" && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {mod.lessons.map((lesson) => {
                  const lessonDone =
                    lesson.exerciseSlugs.length > 0 && lesson.exerciseSlugs.every((s) => completed.includes(s));
                  const isCurrent = lesson.slug === currentLessonSlug;
                  return (
                    <li key={lesson.slug}>
                      <a
                        href={withBase(`/lessons/${lesson.slug}/`)}
                        className={`flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-800 ${
                          isCurrent ? "bg-slate-800 text-cyan-300" : "text-slate-300"
                        }`}
                      >
                        <span className={`text-xs ${lessonDone ? "text-emerald-400" : "text-slate-600"}`}>
                          {lessonDone ? "✓" : "○"}
                        </span>
                        <span className="truncate">{lesson.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
