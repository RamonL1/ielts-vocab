"use client";
import { useState, useEffect } from "react";
import { Word } from "@/data/words";

function speak(text: string, lang = "en-US") {
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
        utter.lang = lang;
        utter.rate = lang === "zh-CN" ? 0.9 : 0.85;
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

interface Props {
  word: Word;
  topicId: string;
  onMaster: () => void;
  onLater: () => void;
  accentColor?: string;
}

function SpeakerBtn({ onClick, label, color, small }: { onClick: () => void; label?: string; color: string; small?: boolean }) {
  const size = small ? 11 : 13;
  const px = small ? "5px 10px" : "8px 14px";
  const fs = small ? 12 : 13;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: px, borderRadius: 999,
        border: "none", cursor: "pointer",
        background: `${color}12`,
        color: color, fontSize: fs, fontWeight: 600,
        flexShrink: 0,
        fontFamily: "inherit",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
      {label ?? "发音"}
    </button>
  );
}

export default function FlashCard({ word, onMaster, onLater, accentColor = "#2563EB" }: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    const timer = setTimeout(() => speak(word.word), 400);
    return () => clearTimeout(timer);
  }, [word.word]);

  return (
    <div style={{ maxWidth: 440, width: "100%", margin: "0 auto" }}>
      {/* Front */}
      <div
        className="flash-front animate-fade-up"
        onClick={() => !revealed && setRevealed(true)}
        style={{ cursor: revealed ? "default" : "pointer" }}
      >
        {/* Word row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
              {word.word}
            </h2>
            <p style={{ fontSize: 15, color: "var(--text3)", fontStyle: "italic", marginTop: 6, fontWeight: 400 }}>
              {word.phonetic}
            </p>
          </div>
          <SpeakerBtn onClick={() => speak(word.word)} color={accentColor} />
        </div>

        {/* English example — always shown */}
        {word.example && (
          <div style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(91,95,212,0.04)",
            borderLeft: `3px solid rgba(91,95,212,0.25)`,
            marginBottom: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.65, fontStyle: "italic", flex: 1 }}>
                {word.example}
              </p>
              <SpeakerBtn onClick={() => speak(word.example)} color={accentColor} label="例句" small />
            </div>
          </div>
        )}

        {/* Reveal hint */}
        {!revealed && (
          <div style={{
            padding: "14px 20px",
            borderRadius: 14,
            background: "rgba(91,95,212,0.07)",
            textAlign: "center",
            marginTop: "auto",
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: accentColor }}>
              点击查看中文释义
            </p>
          </div>
        )}
      </div>

      {/* Back */}
      {revealed && (
        <div
          className="flash-back animate-fade-up"
          style={{ marginTop: 12 }}
        >
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>
              释义
            </p>
            <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", lineHeight: 1.35, letterSpacing: "-0.3px" }}>
              {word.definition}
            </p>
          </div>

          {/* Chinese example */}
          {word.exampleCn && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>
                例句
              </p>
              <div style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(91,95,212,0.04)",
                borderLeft: `3px solid rgba(91,95,212,0.25)`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.65, flex: 1 }}>
                    {word.exampleCn}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={onLater}
              className="btn btn-ghost"
              style={{ flex: 1, border: "1.5px solid var(--border2)" }}
            >
              再想想
            </button>
            <button
              onClick={onMaster}
              className="btn btn-primary"
              style={{ flex: 2, background: accentColor }}
            >
              记住了 ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
