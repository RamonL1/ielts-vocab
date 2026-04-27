"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import SpellingQuiz from "@/components/SpellingQuiz";
import { TOPICS } from "@/data/words";
import { Word } from "@/data/words";
import { useAuth } from "@/lib/AuthContext";

type WrongEntry = {
  topicId: string;
  topicName: string;
  word: string;
  definition: string;
};

function ChevronLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "#D97706" : "none"}
      stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "#DC2626" : "none"}
      stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function FireIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#D97706">
      <path d="M12 2C9.5 6 7 8 7 12c0 2.8 2.2 5 5 5s5-2.2 5-5c0-1.5-.7-2.8-1.8-3.8C14.2 7.5 13 6 13 4c0 0 3 1 3 5 0 2.2-1.8 4-4 4s-4-1.8-4-4c0-3 2.5-5 5-7z" />
    </svg>
  );
}

export default function ReviewPage() {
  const { user, getWordProgress, setWordProgress, updatePlan, isMember } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [wrongList, setWrongList] = useState<WrongEntry[]>([]);
  const [started, setStarted] = useState(false);

  const recordXP = async () => {
    if (!user) return;
    const today = new Date().toDateString();
    const isNewDay = user.last_practice_date !== today;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = user.last_practice_date === yesterday.toDateString();
    const newStreak = isNewDay ? (wasYesterday ? user.streak + 1 : 1) : user.streak;
    const newXP = user.xp + 10;
    const newLevel = Math.floor(newXP / 100) + 1;
    await updatePlan({ xp: newXP, streak: newStreak, last_practice_date: today, level: newLevel });
  };

  const loseHeart = async () => {
    if (!user) return;
    await updatePlan({ hearts: Math.max(0, user.hearts - 1) });
  };

  useEffect(() => {
    setMounted(true);
    const wrongs: WrongEntry[] = [];
    for (const topic of TOPICS) {
      for (const w of topic.words) {
        const prog = getWordProgress(topic.id, w.word);
        if (prog && (prog.wrong_count ?? 0) > 0 && !prog.mastered) {
          wrongs.push({ topicId: topic.id, topicName: topic.nameCn, word: w.word, definition: w.definition });
        }
      }
    }
    wrongs.sort(() => Math.random() - 0.5);
    setWrongList(wrongs);
  }, [user]);

  const reviewWords: Word[] = wrongList.map((entry) => {
    const topic = TOPICS.find((t) => t.id === entry.topicId);
    const wordData = topic?.words.find((w) => w.word === entry.word);
    return {
      word: entry.word,
      phonetic: wordData?.phonetic ?? "/",
      definition: entry.definition,
      example: wordData?.example ?? "",
      exampleCn: wordData?.exampleCn ?? "",
    };
  });

  const getTopicIdForWord = (word: string) => {
    for (const entry of wrongList) {
      if (entry.word === word) return entry.topicId;
    }
    return "review";
  };

  const handleCorrect = (word: string) => {
    const tid = getTopicIdForWord(word);
    setWordProgress(tid, word, true, true);
    recordXP();
  };

  const handleWrong = (word: string) => {
    // 不重复累加 wrong_count，只扣心
    loseHeart();
  };

  const accentColor = "#D97706";

  // Member gate
  if (!isMember && mounted) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>👑</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
          开通会员后解锁
        </h2>
        <p style={{ fontSize: 15, color: "var(--text3)", marginBottom: 28, maxWidth: 300 }}>
          一年有效期，永久保存学习进度，解锁全部功能
        </p>
        <button
          onClick={() => window.location.href = "/"}
          style={{ background: "linear-gradient(90deg, #F59E0B, #E8800C)", color: "#fff", border: "none", borderRadius: 14, padding: "15px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          开通会员
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingBottom: 40 }}>
      {/* Nav */}
      <div className="nav-bar">
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px", height: 52, display: "flex", alignItems: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--accent)" }}>
            <ChevronLeft />
            <span style={{ fontSize: 15, fontWeight: 600 }}>返回</span>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 0" }} className="animate-fade-up">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `${accentColor}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, flexShrink: 0,
          }}>
            📝
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--text)", marginBottom: 3 }}>
              错题复习
            </h1>
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              {wrongList.length === 0 ? "暂无错题，继续保持！" : `共 ${wrongList.length} 个需要复习的词`}
            </p>
          </div>
        </div>

        {mounted && user && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {user.streak > 0 && (
              <span className="badge badge-orange">
                <FireIcon /> {user.streak}
              </span>
            )}
            <span className="badge badge-orange">
              <StarIcon filled /> {user.xp} XP
            </span>
            <span className="badge badge-red">
              <HeartIcon filled /> {user.hearts}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 0" }}>

        {wrongList.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
              太棒了！
            </h2>
            <p className="subtitle" style={{ marginBottom: 24 }}>
              所有单词都已掌握，没有错题需要复习
            </p>
            <Link href="/" className="btn btn-primary">
              返回首页继续学习
            </Link>
          </div>
        )}

        {!started && wrongList.length > 0 && (
          <div className="animate-fade-up">
            <div className="card" style={{ padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>📝</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                准备开始复习
              </h2>
              <p className="subtitle" style={{ marginBottom: 20 }}>
                共 <strong style={{ color: "var(--warning)" }}>{wrongList.length}</strong> 个之前拼错的词
              </p>

              {/* Word preview pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 24 }}>
                {wrongList.slice(0, 12).map((entry) => (
                  <span
                    key={entry.word}
                    style={{
                      padding: "4px 12px", borderRadius: 999,
                      background: "rgba(0,0,0,0.05)",
                      color: "var(--text2)", fontSize: 13, fontWeight: 500,
                    }}
                  >
                    {entry.word}
                  </span>
                ))}
                {wrongList.length > 12 && (
                  <span style={{
                    padding: "4px 12px", borderRadius: 999,
                    background: "rgba(0,0,0,0.05)",
                    color: "var(--text3)", fontSize: 13, fontWeight: 500,
                  }}>
                    +{wrongList.length - 12}
                  </span>
                )}
              </div>

              <button
                onClick={() => setStarted(true)}
                className="btn btn-primary btn-full"
                style={{ background: accentColor, fontSize: 17, padding: "16px" }}
              >
                开始复习
              </button>
            </div>
          </div>
        )}

        {started && (
          <div className="animate-fade-up">
            <SpellingQuiz
              words={reviewWords}
              topicId="review"
              onCorrect={handleCorrect}
              onWrong={handleWrong}
              getWordTopicId={getTopicIdForWord}
              accentColor={accentColor}
            />
          </div>
        )}
      </div>
    </div>
  );
}
