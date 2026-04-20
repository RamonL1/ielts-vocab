"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { TOPICS } from "@/data/words";
import { useAuth } from "@/lib/AuthContext";

const TOPIC_ICONS = ["📖","💻","🌍","🏥","💰","🏛️","🎭","⚖️","📺","🔬"];
const TOPIC_COLORS = [
  "#2563EB","#7C3AED","#059669","#DC2626",
  "#D97706","#7C3AED","#DB2777","#0891B2",
  "#D97706","#0D9488",
];

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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
function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ProgressRing({ pct, size = 80, color = "#2563EB" }: {
  pct: number; size?: number; color?: string;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" />
    </svg>
  );
}

// Login screen
function LoginScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const name = username.trim();
    const pwd = password;
    if (!name) { setError("请输入用户名"); return; }
    if (name.length < 2) { setError("用户名至少2个字符"); return; }
    if (name.length > 20) { setError("用户名最多20个字符"); return; }
    if (!pwd) { setError("请输入密码"); return; }
    if (mode === "signup" && pwd.length < 6) { setError("密码至少6个字符"); return; }
    setLoading(true);
    setError("");
    try {
      let result: { error?: string } | undefined;
      if (mode === "login") {
        result = await login(name, pwd);
      } else {
        result = await signup(name, pwd, inviteCode);
      }
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
    } catch {
      setError("操作失败，请重试");
    }
    setLoading(false);
  };

  const inputStyle = (hasError: boolean) => ({
    width: "100%", padding: "14px 16px",
    border: `2px solid ${hasError ? "#DC2626" : "var(--border2)"}`,
    borderRadius: 14, fontSize: 16, background: "#fff",
    outline: "none", transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
  });

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 8 }}>
          IELTS 词汇
        </h1>
        <p style={{ fontSize: 15, color: "var(--text3)" }}>雅思词汇学习 · 仅限邀请注册</p>
      </div>

      <div className="card" style={{ width: "100%", maxWidth: 360, padding: "28px 24px" }}>
        {mode === "signup" && (
          <div style={{ background: "rgba(91,95,212,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "var(--text2)" }}>
              注册需提供有效邀请码，请联系管理员获取
            </p>
          </div>
        )}

        {/* Tab */}
        <div style={{ display: "flex", gap: 0, background: "var(--bg2)", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setPassword(""); setInviteCode(""); }}
              style={{
                flex: 1, padding: "9px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                background: mode === m ? "#fff" : "transparent",
                color: mode === m ? "var(--text)" : "var(--text3)",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}>
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 8 }}>
            用户名
          </label>
          <input
            type="text"
            placeholder="设置用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            maxLength={20}
            style={inputStyle(false)}
            onFocus={(e) => { e.target.style.borderColor = "#5B5FD4"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border2)"; }}
          />
        </div>

        <div style={{ marginBottom: mode === "signup" ? 14 : 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 8 }}>
            密码
          </label>
          <input
            type="password"
            placeholder="输入密码（至少6位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={inputStyle(false)}
            onFocus={(e) => { e.target.style.borderColor = "#5B5FD4"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border2)"; }}
          />
        </div>

        {mode === "signup" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 8 }}>
              邀请码 <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="输入邀请码"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ ...inputStyle(false), letterSpacing: 2, fontWeight: 600, textAlign: "center" }}
              onFocus={(e) => { e.target.style.borderColor = "#5B5FD4"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border2)"; }}
            />
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
              请联系管理员获取邀请码
            </p>
          </div>
        )}

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "15px",
            background: loading ? "#9B9FD4" : "#5B5FD4",
            color: "#fff", border: "none", borderRadius: 14,
            fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "处理中..." : mode === "login" ? "登录" : "注册账号"}
        </button>

        <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 14 }}>
          {mode === "login" ? "还没有账号？"
            : "已有账号？"}
          {" "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setPassword(""); setInviteCode(""); }}
            style={{ background: "none", border: "none", color: "#5B5FD4", fontWeight: 600, fontSize: 12, cursor: "pointer", padding: 0 }}>
            {mode === "login" ? "立即注册" : "去登录"}
          </button>
        </p>
      </div>
    </div>
  );
}

// Settings modal
function SettingsModal({ onClose, onLogout }: {
  onClose: () => void;
  onLogout: () => void;
  onMember: () => void;
}) {
  const { user, isMember, memberExpiresAt, changePassword, setDailyCount, activatePlan } = useAuth();
  const [showPwChange, setShowPwChange] = useState(false);
  const [showPlanChange, setShowPlanChange] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [activateKey, setActivateKey] = useState("");
  const [activateError, setActivateError] = useState("");
  const [activateSuccess, setActivateSuccess] = useState("");
  const [activateLoading, setActivateLoading] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [planCount, setPlanCount] = useState(user?.daily_count ?? 50);
  const [planError, setPlanError] = useState("");
  const [planSuccess, setPlanSuccess] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);

  const handlePwChange = async () => {
    if (!newPw || newPw.length < 6) { setPwError("新密码至少6位"); return; }
    setPwLoading(true);
    setPwError("");
    const res = await changePassword(oldPw, newPw);
    setPwLoading(false);
    if (res?.error) { setPwError(res.error); return; }
    setPwSuccess(true);
    setOldPw(""); setNewPw("");
    setTimeout(() => { setShowPwChange(false); setPwSuccess(false); }, 2000);
  };

  const handlePlanChange = async () => {
    if (planCount < 1 || planCount > 500) { setPlanError("每日学习词数需在 1-500 之间"); return; }
    setPlanLoading(true);
    setPlanError("");
    const res = await setDailyCount(planCount);
    setPlanLoading(false);
    if (res?.error) { setPlanError(res.error); return; }
    setPlanSuccess(true);
    setTimeout(() => { setShowPlanChange(false); setPlanSuccess(false); }, 2000);
  };

  const handleActivate = async () => {
    if (!activateKey.trim()) { setActivateError("请输入卡密"); return; }
    setActivateLoading(true);
    setActivateError("");
    setActivateSuccess("");
    const res = await activatePlan(activateKey.trim());
    setActivateLoading(false);
    if (res?.error) { setActivateError(res.error); return; }
    setActivateSuccess(`激活成功！已开通${res.plan}，到期时间：${formatDate(res.memberExpiresAt ?? null)}`);
    setActivateKey("");
    setTimeout(() => { setShowActivate(false); setActivateSuccess(""); }, 3000);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "未知";
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }} onClick={onClose} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#FFFFFF", borderRadius: "24px 24px 0 0",
        padding: "28px 24px 44px", zIndex: 101,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
        maxWidth: 680, margin: "0 auto",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ width: 40, height: 4, background: "rgba(0,0,0,0.15)", borderRadius: 999 }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A1D2E", marginBottom: 24 }}>
          设置
        </h2>

        {/* Member status */}
        <div style={{
          background: "linear-gradient(135deg, #1A1D2E, #2D2A5A)",
          borderRadius: 16, padding: "16px 18px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 28 }}>👑</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {isMember ? "会员有效" : "会员已过期"}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                到期时间：{formatDate(memberExpiresAt)}
              </p>
            </div>
          </div>
          {!isMember && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              会员到期后需联系管理员续期
            </p>
          )}
        </div>

        {/* Change password */}
        <button onClick={() => setShowPwChange(!showPwChange)}
          style={{
            width: "100%", padding: "16px", borderRadius: 16, marginBottom: 16,
            background: "#F5F6FA", border: "2px solid var(--border)",
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          }}>
          <span style={{ fontSize: 20 }}>🔑</span>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>修改密码</p>
            <p style={{ fontSize: 11, color: "var(--text3)" }}>设置一个新的登录密码</p>
          </div>
        </button>

        {showPwChange && (
          <div style={{ background: "#F5F6FA", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>当前密码</label>
              <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)}
                placeholder="输入当前密码"
                style={{ width: "100%", padding: "10px 14px", border: "2px solid var(--border2)", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>新密码</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder="至少6位"
                style={{ width: "100%", padding: "10px 14px", border: "2px solid var(--border2)", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
            </div>
            {pwError && <p style={{ fontSize: 12, color: "#DC2626", marginBottom: 10 }}>{pwError}</p>}
            {pwSuccess && <p style={{ fontSize: 12, color: "#059669", marginBottom: 10, fontWeight: 600 }}>密码修改成功！</p>}
            <button onClick={handlePwChange} disabled={pwLoading}
              style={{ width: "100%", padding: "11px", background: "#5B5FD4", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: pwLoading ? "not-allowed" : "pointer" }}>
              {pwLoading ? "修改中..." : "确认修改"}
            </button>
          </div>
        )}

        {/* Daily plan */}
        <button onClick={() => { setShowPlanChange(!showPlanChange); setPlanCount(user?.daily_count ?? 50); }}
          style={{
            width: "100%", padding: "16px", borderRadius: 16, marginBottom: showPlanChange ? 0 : 16,
            background: "#F5F6FA", border: "2px solid var(--border)",
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          }}>
          <span style={{ fontSize: 20 }}>📚</span>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>每日学习计划</p>
            <p style={{ fontSize: 11, color: "var(--text3)" }}>当前：每日 {user?.daily_count ?? 50} 词</p>
          </div>
        </button>

        {showPlanChange && (
          <div style={{ background: "#F5F6FA", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 10 }}>选择每日学习词数</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[50, 100, 200].map((n) => (
                <button key={n} onClick={() => setPlanCount(n)}
                  style={{ flex: 1, padding: "12px 8px", borderRadius: 10, border: planCount === n ? "2px solid #5B5FD4" : "2px solid var(--border2)", background: planCount === n ? "rgba(91,95,212,0.1)" : "#fff", fontSize: 14, fontWeight: 700, color: planCount === n ? "#5B5FD4" : "var(--text)", cursor: "pointer" }}>
                  {n}词
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min={1}
                max={500}
                value={planCount}
                onChange={(e) => setPlanCount(Number(e.target.value))}
                placeholder="自定义"
                style={{ flex: 1, padding: "10px 14px", border: "2px solid var(--border2)", borderRadius: 10, fontSize: 15, fontWeight: 700, boxSizing: "border-box", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 13, color: "var(--text3)", whiteSpace: "nowrap" }}>词/天（1-500）</span>
            </div>
            {planError && <p style={{ fontSize: 12, color: "#DC2626", marginBottom: 10, marginTop: 8 }}>{planError}</p>}
            {planSuccess && <p style={{ fontSize: 12, color: "#059669", marginBottom: 10, fontWeight: 600, marginTop: 8 }}>设置成功！</p>}
            <button onClick={handlePlanChange} disabled={planLoading}
              style={{ width: "100%", padding: "11px", background: "#5B5FD4", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: planLoading ? "not-allowed" : "pointer", marginTop: 12 }}>
              {planLoading ? "保存中..." : "保存设置"}
            </button>
          </div>
        )}

        {/* 激活会员卡 */}
        <button onClick={() => setShowActivate(!showActivate)}
          style={{
            width: "100%", padding: "16px", borderRadius: 16, marginBottom: showActivate ? 0 : 16,
            background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
            border: "2px solid #F59E0B",
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          }}>
          <span style={{ fontSize: 20 }}>🎫</span>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#92400E" }}>激活会员卡</p>
            <p style={{ fontSize: 11, color: "#B45309" }}>使用卡密开通月卡/季卡/年卡</p>
          </div>
        </button>

        {showActivate && (
          <div style={{ background: "#FEF3C7", borderRadius: 16, padding: "16px", marginBottom: 16, border: "2px solid #F59E0B" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#92400E", marginBottom: 10 }}>输入会员卡密（管理员提供）</p>
            <input
              type="text"
              value={activateKey}
              onChange={(e) => setActivateKey(e.target.value.toUpperCase())}
              placeholder="例如：YEA-XXXXXXXXXXXX"
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              style={{ width: "100%", padding: "12px 14px", border: "2px solid #F59E0B", borderRadius: 10, fontSize: 15, fontWeight: 700, boxSizing: "border-box", outline: "none", fontFamily: "monospace", letterSpacing: 1, marginBottom: 10, background: "#fff" }}
            />
            {activateError && <p style={{ fontSize: 12, color: "#DC2626", marginBottom: 10 }}>{activateError}</p>}
            {activateSuccess && <p style={{ fontSize: 12, color: "#059669", marginBottom: 10, fontWeight: 600 }}>{activateSuccess}</p>}
            <button onClick={handleActivate} disabled={activateLoading}
              style={{ width: "100%", padding: "11px", background: "#F59E0B", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: activateLoading ? "not-allowed" : "pointer" }}>
              {activateLoading ? "激活中..." : "立即激活"}
            </button>
          </div>
        )}

        <button
          onClick={onLogout}
          style={{
            width: "100%", padding: "16px", borderRadius: 16,
            background: "#FEF2F2", border: "2px solid #FEE2E2",
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", marginBottom: 12,
          }}
        >
          <LogoutIcon />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#DC2626" }}>退出登录</span>
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "16px", borderRadius: 16,
            background: "#F5F6FA", border: "none",
            fontSize: 16, fontWeight: 600, color: "#1A1D2E",
            cursor: "pointer",
          }}
        >
          关闭
        </button>
      </div>
    </>
  );
}

export default function HomePage() {
  const { user, loading, logout, isMember } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const TOTAL_WORDS = TOPICS.reduce((s, t) => s + t.words.length, 0);
  const dailyCount = user?.daily_count ?? 50;

  // Count mastered words and wrong words from cloud
  const { getWordProgress } = useAuth();
  const globalMastered = mounted && user ? TOPICS.reduce((sum, t) => {
    return sum + t.words.filter((w) => getWordProgress(t.id, w.word)?.mastered).length;
  }, 0) : 0;
  const wrongBookCount = mounted && user ? TOPICS.reduce((sum, t) => {
    return sum + t.words.filter((w) => {
      const p = getWordProgress(t.id, w.word);
      return p && (p.wrong_count ?? 0) > 0 && !p.mastered;
    }).length;
  }, 0) : 0;


  const pct = TOTAL_WORDS === 0 ? 0 : Math.round((globalMastered / TOTAL_WORDS) * 100);
  const xp = user?.xp ?? 0;
  const level = user?.level ?? 1;
  const streak = user?.streak ?? 0;
  const hearts = user?.hearts ?? 5;

  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <p style={{ color: "var(--text3)", fontSize: 15 }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingBottom: 80 }}>

      {/* Nav */}
      <div className="nav-bar">
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--text)" }}>
              IELTS 词汇
            </h1>
            <p style={{ fontSize: 11, color: "var(--text3)" }}>👤 {user.username}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge badge-orange"><StarIcon filled /> {xp} XP</span>
            {streak > 0 && <span className="badge badge-orange"><FireIcon /> {streak}</span>}
            <span className="badge badge-red"><HeartIcon filled /> {hearts}</span>
            <button
              onClick={() => setShowSettings(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: "4px", display: "flex", alignItems: "center" }}
            >
              <GearIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 20px 24px" }} className="animate-fade-up">
        <div className="card" style={{ padding: "28px 24px", background: "linear-gradient(135deg, #EEF0FF 0%, #F8F7FF 100%)", border: "none", boxShadow: "var(--shadow-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <ProgressRing pct={pct} size={92} color="#5B5FD4" />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 21, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{pct}</span>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500, marginTop: 2 }}>%</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "1px",
                  textTransform: "uppercase" as const, color: "#5B5FD4",
                  background: "rgba(91,95,212,0.12)", padding: "3px 10px", borderRadius: 999,
                }}>
                  IELTS 词汇
                </span>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>云端同步</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px", color: "var(--text)", marginBottom: 6 }}>
                词汇掌握进度
              </h2>
              <p className="subtitle" style={{ marginBottom: 12 }}>
                已掌握 <strong style={{ color: "#5B5FD4" }}>{globalMastered}</strong> / {TOTAL_WORDS} 词
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 5, background: "rgba(91,95,212,0.12)", borderRadius: 999 }}>
                  <div style={{
                    height: "100%", width: `${Math.min((xp / 100) * 100, 100)}%`,
                    background: "linear-gradient(90deg, #5B5FD4, #8B5CF6)",
                    borderRadius: 999, transition: "width 0.6s ease",
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#5B5FD4", whiteSpace: "nowrap" }}>
                  Lv.{level}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Topics */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ color: "var(--text2)" }}>学习主题</h3>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>每日 {dailyCount} 词</span>
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          {TOPICS.map((topic, idx) => {
            const topicWords = topic.words.map((w) => w.word);
            const m = mounted ? topicWords.filter((w) => getWordProgress(topic.id, w)?.mastered).length : 0;
            const tPct = topicWords.length === 0 ? 0 : Math.round((m / topicWords.length) * 100);
            const done = m > 0 && tPct === 100;
            const color = TOPIC_COLORS[idx];

            return (
              <Link key={topic.id} href={`/topics/${topic.id}`} style={{ textDecoration: "none", display: "block" }}>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "15px 18px",
                    borderBottom: idx < TOPICS.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.18s, transform 0.18s", cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(91,95,212,0.04)";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: `${color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 21, flexShrink: 0,
                    boxShadow: `0 2px 8px ${color}20`,
                  }}>
                    {TOPIC_ICONS[idx]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
                        {topic.nameCn}
                      </span>
                      {done && <span style={{ color: "var(--success)", display: "flex", alignItems: "center" }}><CheckIcon /></span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                      <p style={{ fontSize: 12, color: "var(--text3)" }}>
                        {topic.name} · {topicWords.length} 词
                      </p>
                      <span style={{ fontSize: 11, fontWeight: 600, color: color }}>{tPct}%</span>
                    </div>
                    <div style={{ height: 4, background: `${color}18`, borderRadius: 999 }}>
                      <div style={{
                        height: "100%", width: `${tPct}%`,
                        background: color, borderRadius: 999,
                        transition: "width 0.5s ease",
                        boxShadow: `0 0 6px ${color}50`,
                      }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: done ? "var(--success)" : color }}>
                      {m}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--text3)" }}>/{topicWords.length}</span>
                    </span>
                    <span style={{ color: "var(--text3)" }}><ArrowRight /></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Wrong words book */}
      {mounted && wrongBookCount > 0 && (
        <div style={{ maxWidth: 680, margin: "16px auto 0", padding: "0 20px" }}>
          <div className="card" style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "16px 18px",
            background: "linear-gradient(135deg, #FEF2F2, #FFF7ED)",
            border: "1.5px solid #FECACA",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(220,38,38,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>
              📕
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#DC2626", marginBottom: 2 }}>错题本</p>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>
                反复出错的单词 · 共 <strong style={{ color: "#DC2626" }}>{wrongBookCount}</strong> 个
              </p>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onLogout={logout} onMember={() => {}} />
      )}

      {/* Bottom tab bar */}
      <div className="tab-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", justifyContent: "space-around" }}>
          <Link href="/" style={{ textDecoration: "none", flex: 1 }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "8px 0", color: "var(--accent)",
            }}>
              <span style={{ fontSize: 22, opacity: 1 }}>🏠</span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>
                首页
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
