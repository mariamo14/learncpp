// Progress is the only "state" this static site has, so it all lives in
// localStorage. No backend, nothing to host: an exercise slug goes into
// `completedExercises` the moment every test case passes, and lesson /
// module / overall completion are always derived from that set plus the
// counts the caller supplies (never stored redundantly, so they can't
// drift out of sync with the content).

const STORAGE_KEY = "learncpp:progress:v1";
const CHANGE_EVENT = "learncpp:progress-change";

export interface ProgressData {
  version: 1;
  completedExercises: string[];
  updatedAt: string;
}

function emptyProgress(): ProgressData {
  return { version: 1, completedExercises: [], updatedAt: new Date().toISOString() };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadProgress(): ProgressData {
  if (!isBrowser()) return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.completedExercises)) return emptyProgress();
    return { version: 1, completedExercises: parsed.completedExercises, updatedAt: parsed.updatedAt ?? new Date().toISOString() };
  } catch {
    return emptyProgress();
  }
}

function save(data: ProgressData) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: data }));
}

export function isExerciseComplete(slug: string): boolean {
  return loadProgress().completedExercises.includes(slug);
}

export function markExerciseComplete(slug: string): ProgressData {
  const data = loadProgress();
  if (!data.completedExercises.includes(slug)) {
    data.completedExercises.push(slug);
    data.updatedAt = new Date().toISOString();
    save(data);
  }
  return data;
}

export function resetProgress(): ProgressData {
  const data = emptyProgress();
  save(data);
  return data;
}

/** Subscribe to progress changes made anywhere on the current page. Returns an unsubscribe function. */
export function onProgressChange(callback: (data: ProgressData) => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = (event: Event) => callback((event as CustomEvent<ProgressData>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export function completionRatio(slugs: string[], completed: string[]): number {
  if (slugs.length === 0) return 0;
  const done = slugs.filter((s) => completed.includes(s)).length;
  return done / slugs.length;
}

export function exportProgress(): void {
  if (!isBrowser()) return;
  const data = loadProgress();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `learncpp-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importProgress(file: File): Promise<{ ok: true; data: ProgressData } | { ok: false; error: string }> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.completedExercises)) {
      return { ok: false, error: "That file doesn't look like a learncpp progress export." };
    }
    const cleaned: ProgressData = {
      version: 1,
      completedExercises: parsed.completedExercises.filter((s: unknown) => typeof s === "string"),
      updatedAt: new Date().toISOString(),
    };
    save(cleaned);
    return { ok: true, data: cleaned };
  } catch {
    return { ok: false, error: "Couldn't parse that file as JSON." };
  }
}
