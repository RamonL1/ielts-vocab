"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Word } from "@/data/words";
import { recordWord } from "@/lib/progress";

interface Props {
  words: Word[];
  topicId: string;
  onCorrect: (word: string) => void;
  onWrong: (word: string) => void;
  getWordTopicId?: (word: string) => string;
  accentColor?: string;
}

type Phase = "answering" | "correct" | "wrong" | "done" | "skip";

function speak(text: string) {
  if (typeof window === "undefined") return;

  // Try multiple TTS sources for better compatibility
  const tryUrls = [
    // Youdao TTS (high quality, reliable)
    `https://dict.youdao.com/dictvoice?type=1&audio=${encodeURIComponent(text)}`,
    // Google TTS
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`,
  ];

  const tryPlay = (index = 0) => {
    if (index >= tryUrls.length) {
      // Fallback to browser TTS
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "en-US";
        utter.rate = 0.9;
        // Try to find a better voice
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v =>
          v.lang.startsWith("en") && (v.name.includes("English") || v.name.includes("US") || v.name.includes("Premium") || v.name.includes("Samantha"))
        );
        if (enVoice) utter.voice = enVoice;
        window.speechSynthesis.speak(utter);
      }
      return;
    }

    const audio = new Audio(tryUrls[index]);
    audio.play().catch(() => tryPlay(index + 1));
  };

  tryPlay();
}

function SpeakerBtn({ onClick, active, color }: { onClick: () => void; active: boolean; color: string }) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "8px 16px", borderRadius: 999,
        border: "none", cursor: active ? "default" : "pointer",
        background: active ? `${color}14` : `${color}10`,
        color: color, fontSize: 13, fontWeight: 600,
        transition: "all 0.18s",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {!active && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
        {active && <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>}
      </svg>
      {active ? "播放中..." : "听发音"}
    </button>
  );
}

function CorrectIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function WrongIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function SpellingQuiz({
  words, topicId, onCorrect, onWrong, getWordTopicId, accentColor = "#2563EB",
}: Props) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [focused, setFocused] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState("");
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = words[idx];
  const progress = words.length === 0 ? 0 : Math.round((idx / words.length) * 100);

  const focusInput = useCallback(() => setTimeout(() => inputRef.current?.focus(), 80), []);

  useEffect(() => {
    if (phase === "answering" && current) {
      const t = setTimeout(() => { setSpeaking(true); speak(current.word); setTimeout(() => setSpeaking(false), 1000); }, 350);
      return () => clearTimeout(t);
    }
  }, [idx, phase, current]);

  useEffect(() => { focusInput(); }, [idx, focusInput]);

  function normalise(s: string) {
    return s.trim().toLowerCase().replace(/[^a-z]/g, "");
  }

  function submit() {
    if (!input.trim()) return;
    const correct = normalise(input) === normalise(current.word);
    const realTopic = getWordTopicId ? getWordTopicId(current.word) : topicId;
    recordWord(realTopic, current.word, correct, current.definition);
    if (correct) { setPhase("correct"); onCorrect(current.word); }
    else { setWrongAnswer(input); setPhase("wrong"); onWrong(current.word); }
  }

  function skip() {
    setPhase("skip"); setWrongAnswer(input);
  }

  function advance() {
    if (autoAdvanceTimer.current) { clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(0);
    if (idx + 1 >= words.length) { setPhase("done"); }
    else { setIdx((i) => i + 1); setInput(""); setWrongAnswer(""); setPhase("answering"); }
  }

  // Prevent window Enter listener from firing on the SAME keystroke that submitted
  const justSubmitted = useRef(false);
  function handleKeyDown(e: React.KeyboardEvent) {
    justSubmitted.current = false;
    if (e.key === "Enter") {
      e.preventDefault();
      if (phase === "answering" && input.trim()) {
        justSubmitted.current = true;
        submit();
      } else {
        advance();
      }
    }
  }

  // After correct: auto-advance after 5 seconds
  useEffect(() => {
    if (phase !== "correct") return;
    autoAdvanceTimer.current = setTimeout(() => {
      if (idx + 1 >= words.length) setPhase("done");
      else { setIdx((i) => i + 1); setInput(""); setWrongAnswer(""); setPhase("answering"); }
    }, 5000);
    return () => { if (autoAdvanceTimer.current) { clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null; } };
  }, [phase, idx, words.length]);

  // After wrong / skip: auto-advance after 10 seconds with countdown
  useEffect(() => {
    if (phase !== "wrong" && phase !== "skip") {
      setCountdown(0);
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      return;
    }
    setCountdown(10);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    autoAdvanceTimer.current = setTimeout(() => {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      if (idx + 1 >= words.length) setPhase("done");
      else { setIdx((i) => i + 1); setInput(""); setWrongAnswer(""); setPhase("answering"); }
    }, 10000);
    return () => {
      if (autoAdvanceTimer.current) { clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    };
  }, [phase, idx, words.length]);

  // Global Enter to advance after feedback (when input is not visible)
  useEffect(() => {
    if (phase === "answering") return;
    function onKey(e: KeyboardEvent) {
      // Skip if the input's handleKeyDown just submitted on this same keystroke
      if (justSubmitted.current) { justSubmitted.current = false; return; }
      if (e.key === "Enter") { e.preventDefault(); advance(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, words.length]);

  if (words.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <p className="subtitle">全部掌握 🎉</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="animate-scale-in" style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🏆</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>挑战完成！</h2>
        <p className="subtitle" style={{ marginBottom: 24 }}>完成 {words.length} 个词的拼写练习</p>
        <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 999 }}>
          <div style={{ height: "100%", width: "100%", background: accentColor, borderRadius: 999 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Progress */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span className="caption" style={{ fontWeight: 600, color: "var(--text2)" }}>进度</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
            {idx + 1} / {words.length}
          </span>
        </div>
        <div style={{ height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 999 }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: accentColor, borderRadius: 999,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Card */}
      <div
        className={`card ${phase === "correct" ? "animate-pop" : phase === "wrong" ? "animate-shake" : ""}`}
        style={{
          padding: 28,
          border: phase === "correct" ? "1.5px solid var(--success)" : phase === "wrong" ? "1.5px solid var(--danger)" : "1px solid var(--border2)",
        }}
      >
        {/* Speaker */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <SpeakerBtn onClick={() => { if (!speaking) { setSpeaking(true); speak(current.word); setTimeout(() => setSpeaking(false), 1200); } }} active={speaking} color={accentColor} />
        </div>

        {/* Label */}
        <p className="label" style={{ textAlign: "center", marginBottom: 6 }}>拼写这个单词</p>

        {/* Definition */}
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 16, letterSpacing: "-0.3px" }}>
          {current.definition}
        </p>

        {/* Typing area */}
        {phase === "answering" && (
          <div style={{
            position: "relative",
            height: 64,
            marginBottom: 8,
            cursor: "text",
            borderRadius: 12,
            border: focused ? `2px solid ${accentColor}` : "2px solid transparent",
            transition: "border-color 0.15s",
          }}
            onClick={() => inputRef.current?.focus()}
          >
            {/* Underscores + blue letters — centered */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
              fontSize: 28, fontWeight: 700,
              fontFamily: "'DM Mono', 'Courier New', monospace",
              color: accentColor,
              letterSpacing: "8px",
              userSelect: "none",
            }}>
              {current.word.split("").map((ch, i) => (
                <span key={i} style={{
                  display: "inline-flex", flexDirection: "column", alignItems: "center",
                  width: ch === " " ? 20 : 28,
                }}>
                  {/* letter above underscore */}
                  <span style={{ marginBottom: 4 }}>{input[i] ?? ""}</span>
                  {/* underscore below */}
                  {ch === " " ? (
                    <span style={{ width: 20 }} />
                  ) : (
                    <span style={{ borderBottom: `2.5px solid ${accentColor}`, width: 24 }} />
                  )}
                </span>
              ))}
            </div>

            {/* Invisible input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                background: focused ? `${accentColor}08` : "transparent",
                border: focused ? `2px solid ${accentColor}` : "2px solid transparent",
                borderRadius: 12,
                outline: "none",
                fontSize: 28, fontWeight: 700,
                fontFamily: "'DM Mono', 'Courier New', monospace",
                color: "transparent",
                textAlign: "center",
                letterSpacing: "8px",
                caretColor: "transparent",
                transition: "border-color 0.15s, background 0.15s",
              }}
            />
          </div>
        )}
        <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 6 }}>
          输入答案后按回车键提交
        </p>

        {/* Correct */}
        {phase === "correct" && (
          <div className="animate-fade-up" style={{ textAlign: "center", padding: "8px 0" }}>
            <CorrectIcon />
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--success)", marginTop: 8 }}>正确！</p>
            <p style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic", marginTop: 10 }}>
              {current.example}
            </p>
            {current.exampleCn && (
              <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>
                {current.exampleCn}
              </p>
            )}
          </div>
        )}

        {/* Wrong */}
        {(phase === "wrong" || phase === "skip") && (
          <div className="animate-fade-up" style={{ textAlign: "center", padding: "8px 0" }}>
            <WrongIcon />
            <p style={{ fontSize: 17, fontWeight: 700, color: "var(--danger)", marginTop: 6, marginBottom: 14 }}>
              {phase === "skip" ? "已跳过" : "回答错误"}
            </p>

            {/* Correct spelling — most prominent */}
            <div style={{
              padding: "20px 24px", borderRadius: 16,
              background: "#05966910",
              border: "2px solid #059669",
              marginBottom: 14,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
                正确拼写
              </p>
              <p style={{ fontSize: 30, fontWeight: 800, color: "#059669", letterSpacing: "1px", lineHeight: 1 }}>
                {current.word}
              </p>
              <p style={{ fontSize: 14, color: "var(--text3)", fontStyle: "italic", marginTop: 6 }}>
                {current.phonetic}
              </p>
            </div>

            {/* Your answer */}
            {wrongAnswer && (
              <div style={{
                padding: "12px 20px", borderRadius: 12,
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.2)",
                marginBottom: 14,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>
                  你的拼写
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text3)", textDecoration: "line-through" }}>
                  {wrongAnswer}
                </p>
              </div>
            )}

            {/* Example */}
            <p style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic", marginTop: 8 }}>
              {current.example}
            </p>
            {current.exampleCn && (
              <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>
                {current.exampleCn}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Submit / Skip */}
      {phase === "answering" && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={skip}
            className="btn btn-ghost"
            style={{ flex: 1, border: "1.5px solid var(--border2)", fontSize: 15, padding: "14px" }}
          >
            跳过
          </button>
          <button
            onClick={submit}
            disabled={!input.trim()}
            className="btn btn-primary"
            style={{ flex: 2, background: accentColor, fontSize: 17, padding: "14px" }}
          >
            回车提交 ↵
          </button>
        </div>
      )}

      {(phase === "correct" || phase === "wrong" || phase === "skip") && (
        <>
          <button
            onClick={advance}
            className="btn btn-primary btn-full"
            style={{ background: accentColor, fontSize: 17, padding: "16px" }}
          >
            下一题 ↵
          </button>
          {(phase === "wrong" || phase === "skip") && countdown > 0 && (
            <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", margin: 0 }}>
              {countdown}秒后自动跳转，或按回车键
            </p>
          )}
        </>
      )}
    </div>
  );
}
