"use client";
import { useState } from "react";

type Code = { id: string; code: string; plan: string; plan_name: string; used_by: string | null; used_at: string | null; created_at: string };
type PlanKey = { id: string; plan: string; key_code: string; used_by: string | null; used_at: string | null; created_at: string };

const API = "/api/auth";

async function apiCall(body: Record<string, unknown>) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

const PLAN_NAMES: Record<string, string> = { monthly: "月卡", quarterly: "季卡", yearly: "年卡" };
const PLAN_COLORS: Record<string, string> = { monthly: "#3B82F6", quarterly: "#8B5CF6", yearly: "#059669" };
const CODE_COLORS: Record<string, string> = { monthly: "#3B82F6", quarterly: "#8B5CF6", yearly: "#059669" };

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<Code[]>([]);
  const [planKeys, setPlanKeys] = useState<PlanKey[]>([]);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [newCodePlan, setNewCodePlan] = useState("yearly");
  const [newKeys, setNewKeys] = useState<string[]>([]);
  const [newKeyPlan, setNewKeyPlan] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<"invite" | "plan">("invite");

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    const data = await apiCall({ action: "admin_list", secret: password });
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setLoggedIn(true);
    setCodes(data.codes || []);
    // Load plan keys too
    const keyData = await apiCall({ action: "admin_list_plan_keys", secret: password });
    if (!keyData.error) setPlanKeys(keyData.keys || []);
  };

  const handleGenerate = async (count: number) => {
    setLoading(true);
    setError("");
    setNewCodes([]);
    const data = await apiCall({ action: "admin_generate", secret: password, count, plan: newCodePlan });
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setNewCodes(data.codes || []);
    const listData = await apiCall({ action: "admin_list", secret: password });
    if (!listData.error) setCodes(listData.codes || []);
  };

  const handleGeneratePlan = async (plan: string, count: number) => {
    setLoading(true);
    setError("");
    setNewKeys([]);
    setNewKeyPlan(PLAN_NAMES[plan]);
    const data = await apiCall({ action: "admin_generate_plan_keys", secret: password, plan, count });
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setNewKeys(data.keys || []);
    const listData = await apiCall({ action: "admin_list_plan_keys", secret: password });
    if (!listData.error) setPlanKeys(listData.keys || []);
  };

  const handleRefresh = async () => {
    if (tab === "invite") {
      const data = await apiCall({ action: "admin_list", secret: password });
      if (!data.error) setCodes(data.codes || []);
    } else {
      const data = await apiCall({ action: "admin_list_plan_keys", secret: password });
      if (!data.error) setPlanKeys(data.keys || []);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#F5F6FA", fontFamily: "var(--font-dm, system-ui)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1A1D2E", marginBottom: 6 }}>
            管理后台
          </h1>
          <p style={{ color: "#888", fontSize: 14 }}>生成和管理邀请码 / 会员卡</p>
        </div>

        {!loggedIn ? (
          <div className="card" style={{ padding: "32px 28px" }}>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
              请输入管理员密钥
            </p>
            <input
              type="password"
              placeholder="管理员密钥"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{
                width: "100%", padding: "14px 16px",
                border: `2px solid ${error ? "#DC2626" : "#E5E7EB"}`,
                borderRadius: 14, fontSize: 16, boxSizing: "border-box",
                outline: "none", marginBottom: 16,
              }}
              onFocus={e => { e.target.style.borderColor = "#5B5FD4"; }}
              onBlur={e => { e.target.style.borderColor = error ? "#DC2626" : "#E5E7EB"; }}
            />
            {error && <p style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={handleLogin} disabled={loading}
              style={{ width: "100%", padding: "15px", background: loading ? "#9B9FD4" : "#5B5FD4", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "验证中..." : "进入后台"}
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { key: "invite" as const, label: "邀请码" },
                { key: "plan" as const, label: "会员卡" },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    flex: 1, padding: "12px",
                    background: tab === t.key ? "#5B5FD4" : "#fff",
                    color: tab === t.key ? "#fff" : "#666",
                    border: "none", borderRadius: 12,
                    fontSize: 15, fontWeight: 700, cursor: "pointer",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* === 邀请码 === */}
            {tab === "invite" && (
              <>
                <div className="card" style={{ padding: "28px 24px", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1D2E", marginBottom: 16 }}>生成邀请码</h2>

                  {/* 类型选择 */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {[
                      { plan: "monthly", name: "月度", color: "#3B82F6" },
                      { plan: "quarterly", name: "季度", color: "#8B5CF6" },
                      { plan: "yearly", name: "年度", color: "#059669" },
                    ].map(item => (
                      <button key={item.plan} onClick={() => setNewCodePlan(item.plan)}
                        style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: newCodePlan === item.plan ? `2px solid ${item.color}` : "2px solid #E5E7EB", background: newCodePlan === item.plan ? `${item.color}10` : "#fff", fontSize: 13, fontWeight: 700, color: newCodePlan === item.plan ? item.color : "#666", cursor: "pointer" }}>
                        {item.name}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[1, 5, 10].map(n => (
                      <button key={n} onClick={() => handleGenerate(n)} disabled={loading}
                        style={{ flex: 1, padding: "13px 16px", background: "#5B5FD4", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
                        生成 {n} 个
                      </button>
                    ))}
                  </div>
                  {newCodes.length > 0 && (
                    <div style={{ marginTop: 20, background: "#F0FDF4", border: "2px solid #86EFAC", borderRadius: 14, padding: "16px 20px" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 10 }}>新生成的{newCodePlan === "monthly" ? "月度" : newCodePlan === "quarterly" ? "季度" : "年度"}邀请码（每个只能用一次）：</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {newCodes.map(c => (
                          <div key={c} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #86EFAC", borderRadius: 8, padding: "8px 14px" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: "#166534", fontFamily: "monospace" }}>{c}</span>
                            <button onClick={() => navigator.clipboard.writeText(c)}
                              style={{ background: "none", border: "none", color: "#166534", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                              复制
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {error && <p style={{ color: "#DC2626", fontSize: 13, marginTop: 12 }}>{error}</p>}
                </div>

                <div className="card" style={{ padding: "28px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1D2E" }}>邀请码列表</h2>
                    <button onClick={handleRefresh} style={{ background: "none", border: "none", color: "#5B5FD4", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>刷新 ↻</button>
                  </div>
                  {codes.length === 0 ? (
                    <p style={{ color: "#888", fontSize: 14, textAlign: "center", padding: "20px 0" }}>暂无邀请码</p>
                  ) : (
                    <div style={{ maxHeight: 400, overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
                            <th style={{ textAlign: "left", padding: "8px 6px", color: "#888", fontWeight: 600 }}>邀请码</th>
                            <th style={{ textAlign: "left", padding: "8px 6px", color: "#888", fontWeight: 600 }}>类型</th>
                            <th style={{ textAlign: "left", padding: "8px 6px", color: "#888", fontWeight: 600 }}>状态</th>
                            <th style={{ textAlign: "left", padding: "8px 6px", color: "#888", fontWeight: 600 }}>时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {codes.map(c => (
                            <tr key={c.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                              <td style={{ padding: "10px 6px", fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, color: "#1A1D2E" }}>{c.code}</td>
                              <td style={{ padding: "10px 6px" }}>
                                <span style={{ background: `${CODE_COLORS[c.plan] ?? "#059669"}18`, color: CODE_COLORS[c.plan] ?? "#059669", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                                  {c.plan_name ?? "年度"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 6px" }}>
                                {c.used_by ? (
                                  <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>已使用</span>
                                ) : (
                                  <span style={{ background: "#DCFCE7", color: "#16A34A", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>可用</span>
                                )}
                              </td>
                              <td style={{ padding: "10px 6px", color: "#888", fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString("zh-CN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* === 会员卡 === */}
            {tab === "plan" && (
              <>
                <div className="card" style={{ padding: "28px 24px", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1D2E", marginBottom: 16 }}>生成会员卡</h2>

                  {[
                    { plan: "monthly", name: "月卡", color: "#3B82F6", desc: "1个月有效期" },
                    { plan: "quarterly", name: "季卡", color: "#8B5CF6", desc: "3个月有效期" },
                    { plan: "yearly", name: "年卡", color: "#059669", desc: "12个月有效期" },
                  ].map(item => (
                    <div key={item.plan} style={{ marginBottom: 16, background: "#F9FAFB", borderRadius: 14, padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                          <span style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.name}</span>
                          <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{item.desc}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[1, 5, 10].map(n => (
                          <button key={n} onClick={() => handleGeneratePlan(item.plan, n)} disabled={loading}
                            style={{ flex: 1, padding: "10px", background: item.color, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
                            生成 {n} 个
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {newKeys.length > 0 && (
                    <div style={{ marginTop: 16, background: "#F0FDF4", border: "2px solid #86EFAC", borderRadius: 14, padding: "16px 20px" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 10 }}>
                        新生成的{newKeyPlan}（每个只能用一次）：
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {newKeys.map(k => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #86EFAC", borderRadius: 8, padding: "8px 14px" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, color: "#166534", fontFamily: "monospace" }}>{k}</span>
                            <button onClick={() => navigator.clipboard.writeText(k)}
                              style={{ background: "none", border: "none", color: "#166534", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                              复制
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {error && <p style={{ color: "#DC2626", fontSize: 13, marginTop: 12 }}>{error}</p>}
                </div>

                <div className="card" style={{ padding: "28px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1D2E" }}>会员卡列表</h2>
                    <button onClick={handleRefresh} style={{ background: "none", border: "none", color: "#5B5FD4", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>刷新 ↻</button>
                  </div>
                  {planKeys.length === 0 ? (
                    <p style={{ color: "#888", fontSize: 14, textAlign: "center", padding: "20px 0" }}>暂无会员卡</p>
                  ) : (
                    <div style={{ maxHeight: 400, overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
                            <th style={{ textAlign: "left", padding: "8px 6px", color: "#888", fontWeight: 600 }}>卡密</th>
                            <th style={{ textAlign: "left", padding: "8px 6px", color: "#888", fontWeight: 600 }}>类型</th>
                            <th style={{ textAlign: "left", padding: "8px 6px", color: "#888", fontWeight: 600 }}>状态</th>
                            <th style={{ textAlign: "left", padding: "8px 6px", color: "#888", fontWeight: 600 }}>时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planKeys.map(k => (
                            <tr key={k.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                              <td style={{ padding: "10px 6px", fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, color: "#1A1D2E", fontSize: 12 }}>{k.key_code}</td>
                              <td style={{ padding: "10px 6px" }}>
                                <span style={{ background: `${PLAN_COLORS[k.plan]}18`, color: PLAN_COLORS[k.plan], padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                                  {PLAN_NAMES[k.plan]}
                                </span>
                              </td>
                              <td style={{ padding: "10px 6px" }}>
                                {k.used_by ? (
                                  <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>已使用</span>
                                ) : (
                                  <span style={{ background: "#DCFCE7", color: "#16A34A", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>可用</span>
                                )}
                              </td>
                              <td style={{ padding: "10px 6px", color: "#888", fontSize: 12 }}>{new Date(k.created_at).toLocaleDateString("zh-CN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        .card { background: #fff; border-radius: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
      `}</style>
    </div>
  );
}
