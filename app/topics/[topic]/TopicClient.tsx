"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { TOPICS, Word } from "@/data/words";
import { useAuth } from "@/lib/AuthContext";
import FlashCard from "@/components/FlashCard";
import SpellingQuiz from "@/components/SpellingQuiz";

const TOPIC_ICONS = ["📖","💻","🌍","🏥","💰","🏛️","🎭","⚖️","📺","🔬"];
const TOPIC_COLORS = [
  "#2563EB","#7C3AED","#059669","#DC2626",
  "#D97706","#7C3AED","#DB2777","#0891B2",
  "#D97706","#0D9488",
];

function ChevronLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#D97706"
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

function Confetti() {
  const colors = ["#5B5FD4","#059669","#D97706","#DB2777","#0891B2","#7C3AED"];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 60 - 20}%`,
          width: 8 + Math.random() * 8,
          height: 8 + Math.random() * 8,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          background: colors[Math.floor(Math.random() * colors.length)],
          animation: `confetti-fall ${1.2 + Math.random()}s ease-in both`,
          animationDelay: `${Math.random() * 0.4}s`,
        }} />
      ))}
    </div>
  );
}

function CompletionModal({ onClose, onSpelling, onHome, color, count }: {
  onClose: () => void; onSpelling: () => void; onHome: () => void;
  color: string; count: number;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 20px",
      backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 28,
        padding: "36px 28px 28px", maxWidth: 360, width: "100%",
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        textAlign: "center", position: "relative", overflow: "hidden",
      }} onClick={(e) => e.stopPropagation()} className="animate-scale-in">
        <Confetti />
        <div style={{ fontSize: 56, marginBottom: 12, position: "relative" }}>🏆</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.4px" }}>
          今日任务完成！
        </h2>
        <p style={{ fontSize: 15, color: "var(--text2)", marginBottom: 6 }}>
          太棒了，你已掌握 <strong style={{ color, fontSize: 17 }}>{count}</strong> 个单词
        </p>
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 28 }}>
          明天继续新的单词吧
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onSpelling} className="btn btn-primary btn-full"
            style={{ background: color, fontSize: 16, padding: "14px" }}>
            ✍️ 去拼写练习
          </button>
          <button onClick={onHome} className="btn btn-ghost btn-full"
            style={{ fontSize: 15, padding: "12px" }}>
            返回首页
          </button>
        </div>
        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}

export default function TopicClient({ topicId }: { topicId: string }) {
  const { user, setWordProgress, getWordProgress, updatePlan, isMember } = useAuth();
  const [showMemberGate, setShowMemberGate] = useState(false);
  const [tab, setTab] = useState<"flashcards" | "spelling">("flashcards");
  const [mounted, setMounted] = useState(false);
  const [cardIdx, setCardIdx] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const [sessionDailyWords, setSessionDailyWords] = useState<Word[]>([]);
  const [sessionMastered, setSessionMastered] = useState(0);
  const initRef = useRef(false);

  const topic = TOPICS.find((t) => t.id === topicId);
  const topicIdx = TOPICS.findIndex((t) => t.id === topicId);
  const color = TOPIC_COLORS[topicIdx] ?? "#2563EB";
  const dailyCount = user?.daily_count ?? 50;

  // Lock today's daily words on mount (from cloud data)
  useEffect(() => {
    if (!topic || !user || initRef.current) return;
    initRef.current = true;
    setMounted(true);

    const today = new Date().toDateString();
    const isNewDay = user.last_practice_date !== today;

    // Reset words_today if it's a new day
    if (isNewDay && user.words_today > 0) {
      updatePlan({ words_today: 0, last_practice_date: today });
    }

    const allWords = topic.words;
    // Find words not yet mastered (from cloud)
    const unmastered = allWords.filter((w) => !getWordProgress(topicId, w.word)?.mastered);
    const daily = unmastered.slice(0, dailyCount);
    setSessionDailyWords(daily);

    // Restore today's progress from words_today (across all topics)
    const restored = isNewDay ? 0 : (user.words_today ?? 0);
    setSessionMastered(restored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, topicId]);

  if (!topic) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <p className="subtitle">未找到该主题</p>
      </div>
    );
  }

  // Member gate
  if (!isMember && mounted) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>👑</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
          开通会员后解锁
        </h2>
        <p style={{ fontSize: 15, color: "var(--text3)", marginBottom: 28, maxWidth: 300 }}>
          一年有效期，永久保存学习进度，解锁全部主题
        </p>
        <button
          onClick={() => window.location.href = "/"}
          style={{ background: "linear-gradient(90deg, #F59E0B, #E8800C)", color: "#fff", border: "none", borderRadius: 14, padding: "15px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          开通会员
        </button>
      </div>
    );
  }

  const shuffledDaily = useMemo(() => [...sessionDailyWords].sort(() => Math.random() - 0.5), [sessionDailyWords]);
  const allDone = sessionDailyWords.length > 0 && sessionMastered >= dailyCount;
  const dailyRemaining = sessionDailyWords.length - sessionMastered;
  const currentWord = sessionDailyWords[cardIdx];

  const recordXP = useCallback(async () => {
    if (!user) return;
    const today = new Date().toDateString();
    const isNewDay = user.last_practice_date !== today;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = user.last_practice_date === yesterday.toDateString();
    const newStreak = isNewDay ? (wasYesterday ? user.streak + 1 : 1) : user.streak;
    const newXP = user.xp + 10;
    const newLevel = Math.floor(newXP / 100) + 1;
    const newWordsToday = isNewDay ? 1 : (user.words_today ?? 0) + 1;
    await updatePlan({ xp: newXP, streak: newStreak, last_practice_date: today, level: newLevel, words_today: newWordsToday });
  }, [user, updatePlan]);

  const loseHeartFn = useCallback(async () => {
    if (!user) return;
    await updatePlan({ hearts: Math.max(0, user.hearts - 1) });
  }, [user, updatePlan]);

  const handleMaster = useCallback(async () => {
    if (!currentWord) return;
    await setWordProgress(topicId, currentWord.word, true, true);
    await recordXP();
    const next = sessionMastered + 1;
    setSessionMastered(next);
    if (next >= dailyCount) { setShowDone(true); return; }
    if (cardIdx + 1 >= sessionDailyWords.length) setCardIdx(0);
    else setCardIdx((i) => i + 1);
  }, [currentWord, sessionMastered, cardIdx, sessionDailyWords.length, dailyCount, topicId, setWordProgress, recordXP]);

  const handleLater = useCallback(() => {
    if (cardIdx + 1 >= sessionDailyWords.length) setCardIdx(0);
    else setCardIdx((i) => i + 1);
  }, [cardIdx, sessionDailyWords.length]);

  const handleCorrect = useCallback(async (_word: string) => {
    if (!currentWord) return;
    await setWordProgress(topicId, currentWord.word, true, true);
    await recordXP();
    const next = sessionMastered + 1;
    setSessionMastered(next);
    if (next >= dailyCount) setShowDone(true);
  }, [currentWord, sessionMastered, dailyCount, topicId, setWordProgress, recordXP]);

  const handleWrong = useCallback(async (_word: string) => {
    if (!currentWord) return;
    await setWordProgress(topicId, currentWord.word, false, false);
    await loseHeartFn();
  }, [currentWord, topicId, setWordProgress, loseHeartFn]);

  const remaining = Math.max(0, dailyCount - sessionMastered);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingBottom: 40 }}>
      {showDone && (
        <CompletionModal
          count={dailyCount} color={color}
          onClose={() => setShowDone(false)}
          onSpelling={() => { setShowDone(false); setTab("spelling"); }}
          onHome={() => { setShowDone(false); window.location.href = "/"; }}
        />
      )}
      <div className="nav-bar">
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--accent)" }}>
            <ChevronLeft />
            <span style={{ fontSize: 15, fontWeight: 600 }}>返回</span>
          </Link>
          {mounted && user && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="badge badge-orange"><StarIcon /> {user.xp} XP</span>
              <span className="badge badge-red"><HeartIcon filled /> {user.hearts}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 0" }} className="animate-fade-up">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `${color}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, flexShrink: 0,
          }}>
            {TOPIC_ICONS[topicIdx]}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--text)", marginBottom: 3 }}>
              {topic.nameCn}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              {topic.name} · 今日 {dailyCount} 词
            </p>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="caption" style={{ fontWeight: 600, color: "var(--text2)" }}>今日进度</span>
            <span style={{ fontSize: 14, fontWeight: 700, color }}>
              {sessionMastered} / {dailyCount}
            </span>
          </div>
          <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 999 }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, (sessionMastered / dailyCount) * 100)}%`,
              background: allDone ? "#059669" : color,
              borderRadius: 999, transition: "width 0.4s ease",
            }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, paddingBottom: 1 }}>
          {[
            { key: "flashcards" as const, label: "单词卡", icon: "📇" },
            { key: "spelling" as const, label: "拼写练习", icon: "✍️" },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`pill ${tab === key ? "pill-active" : "pill-inactive"}`}
              style={{ flex: 1, justifyContent: "center" }}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 0" }}>
        {tab === "flashcards" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }} className="animate-fade-up">
            {sessionDailyWords.length === 0 && !mounted ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div className="skeleton" style={{ width: 200, height: 20, margin: "0 auto" }} />
              </div>
            ) : sessionDailyWords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>全部已掌握！</h2>
                <p className="subtitle" style={{ marginBottom: 24 }}>去拼写练习巩固一下吧</p>
                <button onClick={() => setTab("spelling")} className="btn btn-primary" style={{ background: color }}>
                  去拼写练习 ✍️
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
                  {remaining > 0
                    ? `待学习 ${dailyRemaining} / ${dailyCount} · 已掌握 ${sessionMastered} · 还有 ${remaining} 词`
                    : `已掌握 ${sessionMastered} 词 · 今日完成 ✅`}
                </p>
                {currentWord && (
                  <FlashCard
                    key={`${currentWord.word}-${cardIdx}`}
                    word={currentWord}
                    topicId={topicId}
                    onMaster={handleMaster}
                    onLater={handleLater}
                    accentColor={color}
                  />
                )}
                <button onClick={handleLater} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "var(--text3)", fontWeight: 500, padding: "4px 8px",
                }}>
                  跳过这个 ›
                </button>
              </>
            )}
          </div>
        )}
        {tab === "spelling" && (
          <div className="animate-fade-up">
            <SpellingQuiz
              words={shuffledDaily}
              topicId={topicId}
              onCorrect={handleCorrect}
              onWrong={handleWrong}
              accentColor={color}
            />
          </div>
        )}
      </div>
    </div>
  );
}
