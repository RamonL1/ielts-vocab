"use client";
import Link from "next/link";
import { Topic } from "@/data/words";
import { getTopicProgress } from "@/lib/progress";

export default function TopicCard({ topic }: { topic: Topic }) {
  const { mastered, total } = getTopicProgress(
    topic.id,
    topic.words.map((w) => w.word)
  );
  const pct = total === 0 ? 0 : Math.round((mastered / total) * 100);

  return (
    <Link href={`/topics/${topic.id}`} className="block group">
      <div
        className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200
          hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: topic.color }}
          >
            {topic.name[0]}
          </div>
          <span className="text-xs text-stone-400 font-medium">
            {mastered}/{total}
          </span>
        </div>

        <h3 className="font-serif text-lg font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors">
          {topic.name}
        </h3>
        <p className="text-sm text-stone-500 mb-3">{topic.nameCn}</p>

        {/* Progress bar */}
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: topic.color }}
          />
        </div>
        <p className="text-xs text-stone-400 mt-1.5">{pct}% 掌握</p>
      </div>
    </Link>
  );
}
