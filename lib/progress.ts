export interface WordProgress {
  mastered: boolean;
  wrongCount: number;
  lastSeen: string; // ISO date
  definition?: string; // stored at wrong-time to avoid cross-topic mismatches
}

export type ProgressMap = Record<string, WordProgress>; // key: "topicId:word"

const KEY = "ielts_vocab_progress";

export function getProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProgress(progress: ProgressMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(progress));
}

export function recordWord(topicId: string, word: string, correct: boolean, definition?: string): void {
  const progress = getProgress();
  const key = `${topicId}:${word}`;
  const existing = progress[key];
  progress[key] = {
    mastered: correct ? true : (existing?.mastered ?? false),
    wrongCount: correct
      ? (existing?.wrongCount ?? 0)
      : (existing?.wrongCount ?? 0) + 1,
    lastSeen: new Date().toISOString(),
    // Always store definition at wrong-time so review always shows the definition seen during quiz
    definition: definition ?? existing?.definition ?? "",
  };
  saveProgress(progress);
}

export function getTopicProgress(topicId: string, words: string[]): {
  mastered: number;
  total: number;
} {
  const progress = getProgress();
  const mastered = words.filter((w) => progress[`${topicId}:${w}`]?.mastered).length;
  return { mastered, total: words.length };
}

export function getGlobalProgress(): { mastered: number; total: number } {
  const progress = getProgress();
  const mastered = Object.values(progress).filter((p) => p.mastered).length;
  return { mastered, total: 0 }; // total filled in by caller
}

export function getWrongWords(
  topicId: string,
  wordList: { word: string }[]
): { word: string }[] {
  const progress = getProgress();
  return wordList.filter((w) => {
    const p = progress[`${topicId}:${w.word}`];
    return p && p.wrongCount > 0;
  });
}

export function getAllWrongWords(topics: { id: string; name: string; words: { word: string; definition?: string }[] }[]): {
  topicId: string;
  topicName: string;
  word: string;
  definition: string;
}[] {
  const progress = getProgress();
  const result: { topicId: string; topicName: string; word: string; definition: string }[] = [];
  for (const topic of topics) {
    for (const w of topic.words) {
      const p = progress[`${topic.id}:${w.word}`];
      if (p && p.wrongCount > 0) {
        result.push({
          topicId: topic.id,
          topicName: topic.name,
          word: w.word,
          definition: p.definition ?? w.definition ?? w.word,
        });
      }
    }
  }
  return result;
}

export function resetProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
