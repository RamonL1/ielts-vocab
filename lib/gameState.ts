"use client";
import { useState, useEffect, useCallback } from "react";

export interface GameState {
  xp: number;
  streak: number;
  lastPracticeDate: string | null;
  hearts: number;
  level: number;
  wordsToday: number;
}

const KEY = "ielts_vocab_gamestate";

const DEFAULT_STATE: GameState = {
  xp: 0,
  streak: 0,
  lastPracticeDate: null,
  hearts: 5,
  level: 1,
  wordsToday: 0,
};

export function getGameState(): GameState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveGameState(state: GameState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function useGameState() {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);

  useEffect(() => {
    setState(getGameState());
  }, []);

  const today = new Date().toDateString();

  const recordXP = useCallback((amount: number) => {
    setState((prev) => {
      const isNewDay = prev.lastPracticeDate !== today;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday = prev.lastPracticeDate === yesterday.toDateString();

      let newStreak = isNewDay ? (wasYesterday ? prev.streak + 1 : 1) : prev.streak;
      const newXP = prev.xp + amount;
      const newLevel = Math.floor(newXP / 100) + 1;
      const newState: GameState = {
        ...prev,
        xp: newXP,
        streak: newStreak,
        lastPracticeDate: today,
        level: newLevel,
      };
      saveGameState(newState);
      return newState;
    });
  }, [today]);

  const loseHeart = useCallback(() => {
    setState((prev) => {
      const newHearts = Math.max(0, prev.hearts - 1);
      const newState = { ...prev, hearts: newHearts };
      saveGameState(newState);
      return newState;
    });
  }, []);

  const addHeart = useCallback(() => {
    setState((prev) => {
      const newState = { ...prev, hearts: Math.min(5, prev.hearts + 1) };
      saveGameState(newState);
      return newState;
    });
  }, []);

  const resetHearts = useCallback(() => {
    setState((prev) => {
      const newState = { ...prev, hearts: 5 };
      saveGameState(newState);
      return newState;
    });
  }, []);

  return { state, recordXP, loseHeart, addHeart, resetHearts };
}
