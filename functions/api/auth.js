// Cloudflare Pages Function: auth + invite code management
const SUPABASE_URL = "https://ilrreynuygmxarptaymn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscnJleW51eWdteGFycHRheW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMjE4MDAsImV4cCI6MjA2MjY5NzgwMH0.KkQX4JN4e1WmK4xkOgZo4eWkJxT5W-V9oXRGzpvKmHU";
const ADMIN_SECRET = "ramon123";

async function sf(method, path, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const sh = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hh = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${sh}:${hh}`;
}

async function verifyPassword(password, stored) {
  const [sh, st] = stored.split(":");
  if (!sh || !st) return false;
  const salt = new Uint8Array(sh.match(/.{2}/g).map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("") === st;
}

function genCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(arr).map(n => chars[n % chars.length]).join("");
}

function makeRes(status, body) {
  const h = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Content-Type": "application/json" };
  return new Response(JSON.stringify(body), { status, headers: h });
}

function getClientIP(request) {
  return request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
}

function getLockDuration(count) {
  if (count >= 20) return 600;
  if (count >= 10) return 60;
  if (count >= 5) return 30;
  return 0;
}

function getRemainingLockSeconds(lockedUntil) {
  if (!lockedUntil) return 0;
  const remaining = Math.floor((new Date(lockedUntil).getTime() - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

async function checkLoginBlock(ip) {
  const rows = await sf("GET", `login_attempts?ip=eq.${encodeURIComponent(ip)}&order=id.desc&limit=1`);
  if (!Array.isArray(rows) || rows.length === 0) return { blocked: false, remaining: 0, attemptCount: 0 };
  const record = rows[0];
  const remaining = getRemainingLockSeconds(record.locked_until);
  if (remaining > 0) return { blocked: true, remaining, attemptCount: record.attempt_count };
  return { blocked: false, remaining: 0, attemptCount: record.attempt_count };
}

async function recordFailedLogin(ip) {
  const rows = await sf("GET", `login_attempts?ip=eq.${encodeURIComponent(ip)}&order=id.desc&limit=1`);
  let attemptCount = 0;
  let lastId = null;
  if (Array.isArray(rows) && rows.length > 0) {
    const rec = rows[0];
    if (getRemainingLockSeconds(rec.locked_until) <= 0) { attemptCount = 0; lastId = rec.id; }
    else return { attemptCount: rec.attempt_count, lockedUntil: rec.locked_until, remaining: getRemainingLockSeconds(rec.locked_until) };
  }
  attemptCount += 1;
  const lockDuration = getLockDuration(attemptCount);
  const lockedUntil = lockDuration > 0 ? new Date(Date.now() + lockDuration * 1000).toISOString() : null;
  if (lastId) await sf("PATCH", `login_attempts?id=eq.${lastId}`, { attempt_count: attemptCount, locked_until: lockedUntil, updated_at: new Date().toISOString() });
  else await sf("POST", "login_attempts", { ip, attempt_count: attemptCount, locked_until: lockedUntil });
  return { attemptCount, lockedUntil, remaining: lockDuration };
}

async function recordSuccessLogin(ip) {
  const rows = await sf("GET", `login_attempts?ip=eq.${encodeURIComponent(ip)}&order=id.desc&limit=1`);
  if (Array.isArray(rows) && rows.length > 0) {
    const rec = rows[0];
    if (getRemainingLockSeconds(rec.locked_until) <= 0) await sf("DELETE", `login_attempts?id=eq.${rec.id}`);
  }
}

function calcExpiresAt(plan, existing) {
  const now = new Date();
  const base = existing && new Date(existing) > now ? new Date(existing) : now;
  if (plan === "monthly") base.setMonth(base.getMonth() + 1);
  else if (plan === "quarterly") base.setMonth(base.getMonth() + 3);
  else if (plan === "yearly") base.setFullYear(base.getFullYear() + 1);
  return base;
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return makeRes(204, null);
  if (request.method !== "POST") return makeRes(405, { error: "Method not allowed" });

  const ip = getClientIP(request);

  try {
    const body = await request.json();

    // ADMIN: Generate invite codes
    if (body.action === "admin_generate") {
      const { secret, count, plan } = body;
      if (secret !== ADMIN_SECRET) return makeRes(403, { error: "无权" });
      const n = Math.min(Math.max(count || 1, 1), 20);
      const validPlan = ["monthly","quarterly","yearly"].includes(plan ?? "") ? plan : "yearly";
      const planNames = { monthly: "月度", quarterly: "季度", yearly: "年度" };
      const codes = [];
      for (let i = 0; i < n; i++) {
        const code = genCode(8);
        await sf("POST", "invite_codes", { code, plan: validPlan, plan_name: planNames[validPlan] });
        codes.push(code);
      }
      return makeRes(200, { success: true, plan: planNames[validPlan], codes });
    }

    // ADMIN: List invite codes
    if (body.action === "admin_list") {
      const { secret } = body;
      if (secret !== ADMIN_SECRET) return makeRes(403, { error: "无权" });
      const codes = await sf("GET", "invite_codes?order=created_at.desc&limit=50");
      return makeRes(200, { success: true, codes });
    }

    // ADMIN: Generate plan keys
    if (body.action === "admin_generate_plan_keys") {
      const { secret, plan, count } = body;
      if (secret !== ADMIN_SECRET) return makeRes(403, { error: "无权" });
      if (!["monthly","quarterly","yearly"].includes(plan)) return makeRes(400, { error: "无效的会员类型" });
      const n = Math.min(Math.max(count || 1, 1), 20);
      const planNames = { monthly: "月卡", quarterly: "季卡", yearly: "年卡" };
      const keys = [];
      for (let i = 0; i < n; i++) {
        const keyCode = `${plan.toUpperCase().slice(0,3)}-${genCode(12)}`;
        await sf("POST", "plan_keys", { plan, key_code: keyCode });
        keys.push(keyCode);
      }
      return makeRes(200, { success: true, plan: planNames[plan], keys });
    }

    // ADMIN: List plan keys
    if (body.action === "admin_list_plan_keys") {
      const { secret } = body;
      if (secret !== ADMIN_SECRET) return makeRes(403, { error: "无权" });
      const keys = await sf("GET", "plan_keys?order=created_at.desc&limit=50");
      return makeRes(200, { success: true, keys });
    }

    // Signup
    if (body.action === "signup") {
      const { username, password, inviteCode } = body;
      if (!username || !password || !inviteCode) return makeRes(400, { error: "缺少参数" });
      if (username.length < 2) return makeRes(400, { error: "用户名至少2个字符" });
      if (password.length < 6) return makeRes(400, { error: "密码至少6个字符" });

      const codeUpper = inviteCode.toUpperCase().trim();
      const codes = await sf("GET", `invite_codes?code=eq.${codeUpper}&select=used_by,id,plan`);
      if (!Array.isArray(codes) || codes.length === 0) return makeRes(400, { error: "邀请码无效" });
      if (codes[0].used_by) return makeRes(400, { error: "邀请码已被使用" });
      const codeId = codes[0].id;
      const plan = codes[0].plan || "yearly";

      const existing = await sf("GET", `users?username=eq.${encodeURIComponent(username)}&select=id`);
      if (Array.isArray(existing) && existing.length > 0) return makeRes(400, { error: "用户名已存在" });

      const expiresAt = calcExpiresAt(plan);
      const user = await sf("POST", "users", {
        username,
        password_hash: await hashPassword(password),
        member_expires_at: expiresAt.toISOString(),
        invite_code: codeUpper,
      });
      const userId = Array.isArray(user) ? user[0]?.id : user?.id;
      if (!userId) return makeRes(500, { error: "注册失败，请重试" });

      await sf("POST", "daily_plan", { user_id: userId, daily_count: 50 });
      await sf("PATCH", `invite_codes?id=eq.${codeId}`, { used_by: userId, used_at: new Date().toISOString() });

      const planNames = { monthly: "月度", quarterly: "季度", yearly: "年度" };
      return makeRes(200, { success: true, userId, username, plan: planNames[plan] || "年度" });
    }

    // Login
    if (body.action === "login") {
      const { username, password } = body;
      if (!username || !password) return makeRes(400, { error: "缺少参数" });

      const block = await checkLoginBlock(ip);
      if (block.blocked) {
        const mins = Math.floor(block.remaining / 60);
        const secs = block.remaining % 60;
        const waitText = mins > 0 ? `${mins}分${secs > 0 ? secs + "秒" : ""}` : `${secs}秒`;
        return makeRes(429, { error: `登录失败次数过多，请${waitText}后再试`, remaining: block.remaining });
      }

      const users = await sf("GET", `users?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash,member_expires_at`);
      if (!Array.isArray(users) || users.length === 0) {
        await recordFailedLogin(ip);
        return makeRes(401, { error: "输入错误" });
      }
      const u = users[0];
      if (!u.password_hash || !await verifyPassword(password, u.password_hash)) {
        const fail = await recordFailedLogin(ip);
        const secs = getRemainingLockSeconds(fail.lockedUntil);
        if (secs > 0) {
          const mins = Math.floor(secs / 60);
          const waitText = mins > 0 ? `${mins}分${secs % 60 > 0 ? (secs % 60) + "秒" : ""}` : `${secs}秒`;
          return makeRes(429, { error: `登录失败次数过多，请${waitText}后再试`, remaining: secs });
        }
        return makeRes(401, { error: "输入错误" });
      }

      await recordSuccessLogin(ip);
      const isMember = u.member_expires_at ? new Date(u.member_expires_at) > new Date() : false;
      return makeRes(200, { success: true, userId: u.id, username: u.username, isMember, memberExpiresAt: u.member_expires_at });
    }

    // Change password
    if (body.action === "change_password") {
      const { userId, oldPassword, newPassword } = body;
      if (!userId || !oldPassword || !newPassword) return makeRes(400, { error: "缺少参数" });
      if (newPassword.length < 6) return makeRes(400, { error: "新密码至少6个字符" });
      const users = await sf("GET", `users?id=eq.${userId}&select=password_hash`);
      if (!Array.isArray(users) || users.length === 0) return makeRes(404, { error: "用户不存在" });
      const u = users[0];
      if (!await verifyPassword(oldPassword, u.password_hash)) return makeRes(401, { error: "原密码错误" });
      await sf("PATCH", `users?id=eq.${userId}`, { password_hash: await hashPassword(newPassword) });
      return makeRes(200, { success: true });
    }

    // Set daily count
    if (body.action === "set_daily_count") {
      const { userId, dailyCount } = body;
      if (!userId) return makeRes(400, { error: "缺少参数" });
      const n = Math.min(Math.max(Number(dailyCount) || 50, 1), 500);
      await sf("PATCH", `daily_plan?user_id=eq.${userId}`, { daily_count: n });
      return makeRes(200, { success: true, dailyCount: n });
    }

    // Activate plan
    if (body.action === "activate_plan") {
      const { userId, keyCode } = body;
      if (!userId || !keyCode) return makeRes(400, { error: "缺少参数" });
      const code = keyCode.trim().toUpperCase();

      const keys = await sf("GET", `plan_keys?key_code=eq.${encodeURIComponent(code)}&select=id,plan,used_by`);
      if (!Array.isArray(keys) || keys.length === 0) return makeRes(400, { error: "卡密无效" });
      if (keys[0].used_by) return makeRes(400, { error: "卡密已被使用" });

      const keyId = keys[0].id;
      const plan = keys[0].plan;

      const users = await sf("GET", `users?id=eq.${userId}&select=member_expires_at`);
      const u = (Array.isArray(users) && users.length > 0) ? users[0] : { member_expires_at: null };
      const newExpires = calcExpiresAt(plan, u.member_expires_at);

      await sf("PATCH", `users?id=eq.${userId}`, { member_expires_at: newExpires.toISOString() });
      await sf("PATCH", `plan_keys?id=eq.${keyId}`, { used_by: userId, used_at: new Date().toISOString() });

      const planNames = { monthly: "月卡", quarterly: "季卡", yearly: "年卡" };
      return makeRes(200, { success: true, plan: planNames[plan], memberExpiresAt: newExpires.toISOString() });
    }

    return makeRes(400, { error: "未知操作" });
  } catch (e) {
    return makeRes(500, { error: String(e) });
  }
}
