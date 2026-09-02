import { useRef, useState } from "react";
import { exportProgress, importProgress, resetProgress } from "../lib/progress";

export default function ProgressTools() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await importProgress(file);
    setMessage(result.ok ? `Imported ${result.data.completedExercises.length} completed exercises.` : result.error);
  }

  function handleReset() {
    if (!window.confirm("Clear all local progress? This can't be undone unless you have an exported backup.")) return;
    resetProgress();
    setMessage("Progress cleared.");
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => exportProgress()}
          className="px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Export progress
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Import progress
        </button>
        <button type="button" onClick={handleReset} className="px-2 py-1 rounded border border-rose-800 text-rose-400 hover:bg-rose-950/40">
          Reset
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
      </div>
      {message && <p className="text-slate-500">{message}</p>}
    </div>
  );
}
