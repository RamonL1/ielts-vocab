"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import type { CloudUser, WordProgress } from "./auth";

const AUTH_FUNCTION_URL = "/api/auth";

interface AuthContextValue {
  user: CloudUser | null;
  loading: boolean;
  isMember: boolean;
  memberExpiresAt: string | null;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  signup: (username: string, password: string, inviteCode: string) => Promise<{ error?: string }>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ error?: string }>;
  setWordProgress: (topicId: string, word: string, mastered: boolean, correct: boolean) => Promise<void>;
  getWordProgress: (topicId: string, word: string) => WordProgress | null;
  updatePlan: (updates: Partial<CloudUser>) => Promise<void>;
  setDailyCount: (count: number) => Promise<{ error?: string }>;
  activatePlan: (keyCode: string) => Promise<{ error?: string; plan?: string; memberExpiresAt?: string }>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [memberExpiresAt, setMemberExpiresAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, WordProgress>>({});
  const [loading, setLoading] = useState(true);

  const uid = () => localStorage.getItem("ielts_uid");
  const uname = () => localStorage.getItem("ielts_uname");

  const loadProgress = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("progress")
      .select("*")
      .eq("user_id", userId);
    if (data) {
      const map: Record<string, WordProgress> = {};
      for (const r of data) {
        map[`${r.topic_id}:${r.word}`] = r as WordProgress;
      }
      setProgress(map);
    }
  }, []);

  const loadUser = useCallback(async () => {
    const storedId = uid();
    const storedName = uname();
    if (!storedId || !storedName) { setLoading(false); return; }

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", storedId)
      .single();

    if (data) {
      const { data: plan } = await supabase
        .from("daily_plan")
        .select("*")
        .eq("user_id", storedId)
        .single();

      const memberActive = data.member_expires_at
        ? new Date(data.member_expires_at) > new Date()
        : false;
      setIsMember(memberActive);
      setMemberExpiresAt(data.member_expires_at ?? null);

      setUser({
        id: data.id,
        username: data.username,
        daily_count: plan?.daily_count ?? 50,
        xp: plan?.xp ?? 0,
        streak: plan?.streak ?? 0,
        hearts: plan?.hearts ?? 5,
        level: plan?.level ?? 1,
        words_today: plan?.words_today ?? 0,
        last_practice_date: plan?.last_practice_date ?? null,
      });
      await loadProgress(storedId);
    }
    setLoading(false);
  }, [loadProgress]);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (username: string, password: string): Promise<{ error?: string }> => {
    const res = await fetch(AUTH_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return { error: data.error || "登录失败" };

    localStorage.setItem("ielts_uid", data.userId);
    localStorage.setItem("ielts_uname", data.username);
    setIsMember(data.isMember);
    setMemberExpiresAt(data.memberExpiresAt ?? null);
    setUser({
      id: data.userId,
      username: data.username,
      daily_count: 50,
      xp: 0,
      streak: 0,
      hearts: 5,
      level: 1,
      words_today: 0,
      last_practice_date: null,
    });
    await loadProgress(data.userId);
    return {};
  };

  const signup = async (username: string, password: string, inviteCode: string): Promise<{ error?: string }> => {
    if (username.trim().length < 2) return { error: "用户名至少2个字符" };
    if (password.length < 6) return { error: "密码至少6个字符" };
    if (!inviteCode.trim()) return { error: "请输入邀请码" };
    const res = await fetch(AUTH_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signup", username, password, inviteCode }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return { error: data.error || "注册失败" };

    localStorage.setItem("ielts_uid", data.userId);
    localStorage.setItem("ielts_uname", data.username);
    setIsMember(true);
    setMemberExpiresAt(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
    setUser({
      id: data.userId,
      username: data.username,
      daily_count: 50,
      xp: 0,
      streak: 0,
      hearts: 5,
      level: 1,
      words_today: 0,
      last_practice_date: null,
    });
    await loadProgress(data.userId);
    return {};
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<{ error?: string }> => {
    if (!user) return { error: "未登录" };
    if (newPassword.length < 6) return { error: "新密码至少6个字符" };
    const res = await fetch(AUTH_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", userId: user.id, oldPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return { error: data.error || "修改失败" };
    return {};
  };

  const logout = () => {
    localStorage.removeItem("ielts_uid");
    localStorage.removeItem("ielts_uname");
    setUser(null);
    setIsMember(false);
    setMemberExpiresAt(null);
    setProgress({});
    setLoading(false);
  };

  const setWordProgress = async (
    topicId: string, word: string, mastered: boolean, correct: boolean
  ) => {
    if (!user) return;
    const key = `${topicId}:${word}`;
    const existing = progress[key];
    const patch = {
      mastered: mastered || existing?.mastered || false,
      correct_count: (existing?.correct_count ?? 0) + (correct ? 1 : 0),
      wrong_count: (existing?.wrong_count ?? 0) + (correct ? 0 : 1),
      last_reviewed: new Date().toISOString(),
    };
    await supabase.from("progress").upsert({
      user_id: user.id, topic_id: topicId, word, ...patch,
    }, { onConflict: "user_id,topic_id,word" });
    setProgress((prev) => ({
      ...prev,
      [key]: { topic_id: topicId, word, ...patch, last_reviewed: patch.last_reviewed } as WordProgress,
    }));
  };

  const getWordProgress = (topicId: string, word: string): WordProgress | null => {
    return progress[`${topicId}:${word}`] || null;
  };

  const updatePlan = async (updates: Partial<CloudUser>) => {
    if (!user) return;
    await supabase.from("daily_plan").update({
      daily_count: updates.daily_count,
      xp: updates.xp,
      streak: updates.streak,
      hearts: updates.hearts,
      level: updates.level,
      words_today: updates.words_today,
      last_practice_date: updates.last_practice_date,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  };

  const setDailyCount = async (count: number): Promise<{ error?: string }> => {
    if (!user) return { error: "未登录" };
    const res = await fetch(AUTH_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_daily_count", userId: user.id, dailyCount: count }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return { error: data.error || "设置失败" };
    setUser((prev) => prev ? { ...prev, daily_count: data.dailyCount } : prev);
    return {};
  };

  const activatePlan = async (keyCode: string): Promise<{ error?: string; plan?: string; memberExpiresAt?: string }> => {
    if (!user) return { error: "未登录" };
    const res = await fetch(AUTH_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate_plan", userId: user.id, keyCode }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return { error: data.error || "激活失败" };
    setIsMember(true);
    setMemberExpiresAt(data.memberExpiresAt);
    return { plan: data.plan, memberExpiresAt: data.memberExpiresAt };
  };

  return (
    <AuthContext.Provider value={{
      user, loading, isMember,
      login, signup, logout,
      setWordProgress, getWordProgress,
      updatePlan, setDailyCount, activatePlan, changePassword, memberExpiresAt,
      refresh: loadUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
