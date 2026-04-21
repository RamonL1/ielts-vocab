// Next.js API Route for auth
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ilrreynuygmxarptaymn.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscnJleW51eWdteGFycHRheW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMjE4MDAsImV4cCI6MjA2MjY5NzgwMH0.KkQX4JN4e1WmK4xkOgZo4eWkJxT5W-V9oXRGzpvKmHU";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "ramon123";

async function sf(method: string, path: string, body?: unknown) {
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

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, km, 256);
  const sh = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hh = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${sh}:${hh}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [sh, st] = stored.split(":");
  if (!sh || !st) return false;
  const salt = new Uint8Array(sh.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, km, 256);
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("") === st;
}

function genCode(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(arr).map(n => chars[n % chars.length]).join("");
}

function getClientIP(request: Request): string {
  return request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
}

function getLockDuration(count: number): number {
  if (count >= 20) return 600;
  if (count >= 10) return 60;
  if (count >= 5) return 30;
  return 0;
}

function getRemainingLockSeconds(lockedUntil: string | null): number {
  if (!lockedUntil) return 0;
  const remaining = Math.floor((new Date(lockedUntil).getTime() - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

async function checkLoginBlock(ip: string): Promise<{ blocked: boolean; remaining: number; attemptCount: number }> {
  const rows = await sf("GET", `login_attempts?ip=eq.${encodeURIComponent(ip)}&order=id.desc&limit=1`);
  if (!Array.isArray(rows) || rows.length === 0) return { blocked: false, remaining: 0, attemptCount: 0 };
  const record = rows[0] as unknown as { attempt_count: number; locked_until: string | null };
  const remaining = getRemainingLockSeconds(record.locked_until);
  if (remaining > 0) return { blocked: true, remaining, attemptCount: record.attempt_count };
  return { blocked: false, remaining: 0, attemptCount: record.attempt_count };
}

async function recordFailedLogin(ip: string): Promise<{ attemptCount: number; lockedUntil: string | null; remaining: number }> {
  const rows = await sf("GET", `login_attempts?ip=eq.${encodeURIComponent(ip)}&order=id.desc&limit=1`);
  let attemptCount = 0;
  let lastId: string | null = null;
  if (Array.isArray(rows) && rows.length > 0) {
    const rec = rows[0] as unknown as { id: string; attempt_count: number; locked_until: string | null };
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

async function recordSuccessLogin(ip: string): Promise<void> {
  const rows = await sf("GET", `login_attempts?ip=eq.${encodeURIComponent(ip)}&order=id.desc&limit=1`);
  if (Array.isArray(rows) && rows.length > 0) {
    const rec = rows[0] as unknown as { id: string; locked_until: string | null };
    if (getRemainingLockSeconds(rec.locked_until) <= 0) await sf("DELETE", `login_attempts?id=eq.${rec.id}`);
  }
}

function calcExpiresAt(plan: string, existing?: string | null): Date {
  const now = new Date();
  const base = existing && new Date(existing) > now ? new Date(existing) : now;
  if (plan === "monthly") base.setMonth(base.getMonth() + 1);
  else if (plan === "quarterly") base.setMonth(base.getMonth() + 3);
  else if (plan === "yearly") base.setFullYear(base.getFullYear() + 1);
  return base;
}

export async function POST(request: Request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Content-Type": "application/json",
  };

  try {
    const ip = getClientIP(request);
    const body = await request.json() as unknown as { action: string; [k: string]: unknown };

    // ADMIN: Generate invite codes
    if (body.action === "admin_generate") {
      const { secret, count, plan } = body as unknown as unknown as { secret: string; count?: number; plan?: string };
      if (secret !== ADMIN_SECRET) return new Response(JSON.stringify({ error: "无权" }), { status: 403, headers: corsHeaders });
      const n = Math.min(Math.max(count || 1, 1), 20);
      const validPlan = ["monthly","quarterly","yearly"].includes(plan ?? "") ? plan! : "yearly";
      const planNames: Record<string, string> = { monthly: "月度", quarterly: "季度", yearly: "年度" };
      const codes: string[] = [];
      for (let i = 0; i < n; i++) {
        const code = genCode(8);
        await sf("POST", "invite_codes", { code, plan: validPlan, plan_name: planNames[validPlan] });
        codes.push(code);
      }
      return new Response(JSON.stringify({ success: true, plan: planNames[validPlan], codes }), { status: 200, headers: corsHeaders });
    }

    // ADMIN: List invite codes
    if (body.action === "admin_list") {
      const { secret } = body as unknown as { secret: string };
      if (secret !== ADMIN_SECRET) return new Response(JSON.stringify({ error: "无权" }), { status: 403, headers: corsHeaders });
      const codes = await sf("GET", "invite_codes?order=created_at.desc&limit=50");
      return new Response(JSON.stringify({ success: true, codes }), { status: 200, headers: corsHeaders });
    }

    // ADMIN: Generate plan keys
    if (body.action === "admin_generate_plan_keys") {
      const { secret, plan, count } = body as unknown as { secret: string; plan: string; count?: number };
      if (secret !== ADMIN_SECRET) return new Response(JSON.stringify({ error: "无权" }), { status: 403, headers: corsHeaders });
      if (!["monthly","quarterly","yearly"].includes(plan)) return new Response(JSON.stringify({ error: "无效的会员类型" }), { status: 400, headers: corsHeaders });
      const n = Math.min(Math.max(count || 1, 1), 20);
      const planNames: Record<string, string> = { monthly: "月卡", quarterly: "季卡", yearly: "年卡" };
      const keys: string[] = [];
      for (let i = 0; i < n; i++) {
        const keyCode = `${plan.toUpperCase().slice(0,3)}-${genCode(12)}`;
        await sf("POST", "plan_keys", { plan, key_code: keyCode });
        keys.push(keyCode);
      }
      return new Response(JSON.stringify({ success: true, plan: planNames[plan], keys }), { status: 200, headers: corsHeaders });
    }

    // ADMIN: List plan keys
    if (body.action === "admin_list_plan_keys") {
      const { secret } = body as unknown as { secret: string };
      if (secret !== ADMIN_SECRET) return new Response(JSON.stringify({ error: "无权" }), { status: 403, headers: corsHeaders });
      const keys = await sf("GET", "plan_keys?order=created_at.desc&limit=50");
      return new Response(JSON.stringify({ success: true, keys }), { status: 200, headers: corsHeaders });
    }

    // Signup
    if (body.action === "signup") {
      const { username, password, inviteCode } = body as unknown as { username: string; password: string; inviteCode: string };
      if (!username || !password || !inviteCode) return new Response(JSON.stringify({ error: "缺少参数" }), { status: 400, headers: corsHeaders });
      if (username.length < 2) return new Response(JSON.stringify({ error: "用户名至少2个字符" }), { status: 400, headers: corsHeaders });
      if (password.length < 6) return new Response(JSON.stringify({ error: "密码至少6个字符" }), { status: 400, headers: corsHeaders });

      const codeUpper = inviteCode.toUpperCase().trim();
      const codes = await sf("GET", `invite_codes?code=eq.${codeUpper}&select=used_by,id,plan`);
      if (!Array.isArray(codes) || codes.length === 0) return new Response(JSON.stringify({ error: "邀请码无效" }), { status: 400, headers: corsHeaders });
      if (codes[0].used_by) return new Response(JSON.stringify({ error: "邀请码已被使用" }), { status: 400, headers: corsHeaders });
      const codeId = codes[0].id;
      const plan = codes[0].plan ?? "yearly";

      const existing = await sf("GET", `users?username=eq.${encodeURIComponent(username)}&select=id`);
      if (Array.isArray(existing) && existing.length > 0) return new Response(JSON.stringify({ error: "用户名已存在" }), { status: 400, headers: corsHeaders });

      const expiresAt = calcExpiresAt(plan);
      const user = await sf("POST", "users", {
        username,
        password_hash: await hashPassword(password),
        member_expires_at: expiresAt.toISOString(),
        invite_code: codeUpper,
      });
      const userId = Array.isArray(user) ? (user as Array<{id?:string}>)[0]?.id : (user as unknown as { id?: string }).id;
      if (!userId) return new Response(JSON.stringify({ error: "注册失败，请重试" }), { status: 500, headers: corsHeaders });

      await sf("POST", "daily_plan", { user_id: userId, daily_count: 50 });
      await sf("PATCH", `invite_codes?id=eq.${codeId}`, { used_by: userId, used_at: new Date().toISOString() });

      const planNames: Record<string, string> = { monthly: "月度", quarterly: "季度", yearly: "年度" };
      return new Response(JSON.stringify({ success: true, userId, username, plan: planNames[plan] ?? "年度" }), { status: 200, headers: corsHeaders });
    }

    // Login
    if (body.action === "login") {
      const { username, password } = body as unknown as { username: string; password: string };
      if (!username || !password) return new Response(JSON.stringify({ error: "缺少参数" }), { status: 400, headers: corsHeaders });

      const block = await checkLoginBlock(ip);
      if (block.blocked) {
        const mins = Math.floor(block.remaining / 60);
        const secs = block.remaining % 60;
        const waitText = mins > 0 ? `${mins}分${secs > 0 ? secs + "秒" : ""}` : `${secs}秒`;
        return new Response(JSON.stringify({ error: `登录失败次数过多，请${waitText}后再试`, remaining: block.remaining }), { status: 429, headers: corsHeaders });
      }

      const users = await sf("GET", `users?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash,member_expires_at`);
      if (!Array.isArray(users) || users.length === 0) {
        await recordFailedLogin(ip);
        return new Response(JSON.stringify({ error: "输入错误" }), { status: 401, headers: corsHeaders });
      }
      const u = users[0] as unknown as { id: string; username: string; password_hash: string; member_expires_at: string | null };
      if (!u.password_hash || !await verifyPassword(password, u.password_hash)) {
        const fail = await recordFailedLogin(ip);
        const secs = getRemainingLockSeconds(fail.lockedUntil);
        if (secs > 0) {
          const mins = Math.floor(secs / 60);
          const waitText = mins > 0 ? `${mins}分${secs % 60 > 0 ? (secs % 60) + "秒" : ""}` : `${secs}秒`;
          return new Response(JSON.stringify({ error: `登录失败次数过多，请${waitText}后再试`, remaining: secs }), { status: 429, headers: corsHeaders });
        }
        return new Response(JSON.stringify({ error: "输入错误" }), { status: 401, headers: corsHeaders });
      }

      await recordSuccessLogin(ip);
      const isMember = u.member_expires_at ? new Date(u.member_expires_at) > new Date() : false;
      return new Response(JSON.stringify({ success: true, userId: u.id, username: u.username, isMember, memberExpiresAt: u.member_expires_at }), { status: 200, headers: corsHeaders });
    }

    // Change password
    if (body.action === "change_password") {
      const { userId, oldPassword, newPassword } = body as unknown as { userId: string; oldPassword: string; newPassword: string };
      if (!userId || !oldPassword || !newPassword) return new Response(JSON.stringify({ error: "缺少参数" }), { status: 400, headers: corsHeaders });
      if (newPassword.length < 6) return new Response(JSON.stringify({ error: "新密码至少6个字符" }), { status: 400, headers: corsHeaders });
      const users = await sf("GET", `users?id=eq.${userId}&select=password_hash`);
      if (!Array.isArray(users) || users.length === 0) return new Response(JSON.stringify({ error: "用户不存在" }), { status: 404, headers: corsHeaders });
      const u = users[0] as unknown as { password_hash: string };
      if (!await verifyPassword(oldPassword, u.password_hash)) return new Response(JSON.stringify({ error: "原密码错误" }), { status: 401, headers: corsHeaders });
      await sf("PATCH", `users?id=eq.${userId}`, { password_hash: await hashPassword(newPassword) });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    // Set daily count
    if (body.action === "set_daily_count") {
      const { userId, dailyCount } = body as unknown as { userId: string; dailyCount: number };
      if (!userId) return new Response(JSON.stringify({ error: "缺少参数" }), { status: 400, headers: corsHeaders });
      const n = Math.min(Math.max(Number(dailyCount) || 50, 1), 500);
      await sf("PATCH", `daily_plan?user_id=eq.${userId}`, { daily_count: n });
      return new Response(JSON.stringify({ success: true, dailyCount: n }), { status: 200, headers: corsHeaders });
    }

    // Activate plan
    if (body.action === "activate_plan") {
      const { userId, keyCode } = body as unknown as { userId: string; keyCode: string };
      if (!userId || !keyCode) return new Response(JSON.stringify({ error: "缺少参数" }), { status: 400, headers: corsHeaders });
      const code = keyCode.trim().toUpperCase();

      const keys = await sf("GET", `plan_keys?key_code=eq.${encodeURIComponent(code)}&select=id,plan,used_by`);
      if (!Array.isArray(keys) || keys.length === 0) return new Response(JSON.stringify({ error: "卡密无效" }), { status: 400, headers: corsHeaders });
      if (keys[0].used_by) return new Response(JSON.stringify({ error: "卡密已被使用" }), { status: 400, headers: corsHeaders });

      const keyId = keys[0].id;
      const plan = keys[0].plan as string;

      const users = await sf("GET", `users?id=eq.${userId}&select=member_expires_at`);
      const u = (Array.isArray(users) && users.length > 0) ? users[0] as unknown as { member_expires_at: string | null } : { member_expires_at: null };
      const newExpires = calcExpiresAt(plan, u.member_expires_at);

      await sf("PATCH", `users?id=eq.${userId}`, { member_expires_at: newExpires.toISOString() });
      await sf("PATCH", `plan_keys?id=eq.${keyId}`, { used_by: userId, used_at: new Date().toISOString() });

      const planNames: Record<string, string> = { monthly: "月卡", quarterly: "季卡", yearly: "年卡" };
      return new Response(JSON.stringify({ success: true, plan: planNames[plan], memberExpiresAt: newExpires.toISOString() }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "未知操作" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
