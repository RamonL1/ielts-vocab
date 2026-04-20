"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

export interface CloudUser {
  id: string;
  username: string;
  daily_count: number;
  xp: number;
  streak: number;
  hearts: number;
  level: number;
  words_today: number;
  last_practice_date: string | null;
}

export interface WordProgress {
  topic_id: string;
  word: string;
  mastered: boolean;
  correct_count: number;
  wrong_count: number;
  last_reviewed: string;
}

export function useAuth() {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, WordProgress>>({});
  const [syncing, setSyncing] = useState(false);

  // Load local user ID
  const getLocalUserId = () => localStorage.getItem("ielts_user_id");
  const setLocalUserId = (id: string) => localStorage.setItem("ielts_user_id", id);

  const getLocalUsername = () => localStorage.getItem("ielts_username");
  const setLocalUsername = (name: string) => localStorage.setItem("ielts_username", name);

  const loadProgress = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("progress")
      .select("*")
      .eq("user_id", userId);
    if (data) {
      const map: Record<string, WordProgress> = {};
      for (const row of data) {
        map[`${row.topic_id}:${row.word}`] = row as WordProgress;
      }
      setProgress(map);
    }
  }, []);

  const loadUser = useCallback(async () => {
    const username = getLocalUsername();
    const userId = getLocalUserId();
    if (!username || !userId) { setLoading(false); return; }

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      const { data: plan } = await supabase
        .from("daily_plan")
        .select("*")
        .eq("user_id", userId)
        .single();

      const cloudUser: CloudUser = {
        id: data.id,
        username: data.username,
        daily_count: plan?.daily_count ?? 50,
        xp: plan?.xp ?? 0,
        streak: plan?.streak ?? 0,
        hearts: plan?.hearts ?? 5,
        level: plan?.level ?? 1,
        words_today: plan?.words_today ?? 0,
        last_practice_date: plan?.last_practice_date ?? null,
      };
      setUser(cloudUser);
      await loadProgress(userId);
    }
    setLoading(false);
  }, [loadProgress]);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = useCallback(async (username: string) => {
    setSyncing(true);
    try {
      let userId = getLocalUserId();

      // Try to find existing user by username
      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (existing) {
        userId = existing.id as string;
        setLocalUserId(userId);
        setLocalUsername(username);
      } else {
        // Create new user
        const { data: newUser, error } = await supabase
          .from("users")
          .insert({ username })
          .select()
          .single();
        if (error || !newUser) throw error || new Error("Failed to create user");
        userId = newUser.id as string;
        setLocalUserId(userId);
        setLocalUsername(username);

        // Create default daily plan
        await supabase.from("daily_plan").insert({ user_id: userId, daily_count: 50 });
      }

      // Reload user data
      await loadUser();
    } finally {
      setSyncing(false);
    }
  }, [loadUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("ielts_user_id");
    localStorage.removeItem("ielts_username");
    setUser(null);
    setProgress({});
  }, []);

  const updateUserPlan = useCallback(async (updates: Partial<CloudUser>) => {
    if (!user) return;
    await supabase
      .from("daily_plan")
      .update({
        daily_count: updates.daily_count,
        xp: updates.xp,
        streak: updates.streak,
        hearts: updates.hearts,
        level: updates.level,
        words_today: updates.words_today,
        last_practice_date: updates.last_practice_date,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  }, [user]);

  const setWordProgress = useCallback(async (
    topicId: string, word: string, mastered: boolean, correct: boolean
  ) => {
    if (!user) return;
    const key = `${topicId}:${word}`;
    const existing = progress[key];
    const updates = {
      mastered: mastered || existing?.mastered || false,
      correct_count: (existing?.correct_count ?? 0) + (correct ? 1 : 0),
      wrong_count: (existing?.wrong_count ?? 0) + (correct ? 0 : 1),
      last_reviewed: new Date().toISOString(),
    };

    await supabase.from("progress").upsert({
      user_id: user.id,
      topic_id: topicId,
      word,
      ...updates,
    }, { onConflict: "user_id,topic_id,word" });

    setProgress((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), topic_id: topicId, word, ...updates, last_reviewed: updates.last_reviewed } as WordProgress,
    }));
  }, [user, progress]);

  const getWordProgress = useCallback((topicId: string, word: string): WordProgress | null => {
    return progress[`${topicId}:${word}`] || null;
  }, [progress]);

  return { user, loading, login, logout, updateUserPlan, setWordProgress, getWordProgress, syncing };
}
