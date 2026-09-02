import { useEffect, useState } from "react";
import { loadProgress, onProgressChange, completionRatio, type ProgressData } from "../lib/progress";

interface ProgressBarProps {
  allExerciseSlugs: string[];
}

export default function ProgressBar({ allExerciseSlugs }: ProgressBarProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
    return onProgressChange(setProgress);
  }, []);

  const ratio = completionRatio(allExerciseSlugs, progress?.completedExercises ?? []);
  const pct = Math.round(ratio * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{pct}%</span>
    </div>
  );
}
