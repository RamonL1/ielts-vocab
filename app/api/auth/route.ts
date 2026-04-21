import { NextResponse } from 'next/server';

export const runtime = 'edge';

const SUPABASE_URL = "https://ilrreynuygmxarptaymn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscnJleW51eWdteGFycHRheW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzY2NjMsImV4cCI6MjA5MTgxMjY2M30.t2CaMA85sNctOyg_3Rjqcb2h8ds7NJahqhtO0CMAJFE";
const ADMIN_SECRET = "ramon123";

// ── 基础工具函数 ──────────────────────────────────
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

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [sh, st] = stored.split(":");
  if (!sh || !st) return false;
  const salt = new Uint8Array(sh.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, km, 256);
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("") === st;
}

// ── 处理跨域预检 ──────────────────────────────────
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// ── 处理核心 POST 请求 ──────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json() as any;
    const { action } = body;

    // 1. 登录逻辑
    if (action === "login") {
      const { username, password } = body;
      if (!username || !password) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

      const users = await sf("GET", `users?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash,member_expires_at`);
      
      if (!Array.isArray(users) || users.length === 0) {
        return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
      }

      const u = users[0];
      const isMatch = await verifyPassword(password, u.password_hash);
      if (!isMatch) {
        return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
      }

      const isMember = u.member_expires_at ? new Date(u.member_expires_at) > new Date() : false;
      return NextResponse.json({ 
        success: true, 
        userId: u.id, 
        username: u.username, 
        isMember, 
        memberExpiresAt: u.member_expires_at 
      });
    }

    // 这里可以补充你的 signup 等其他逻辑...
    
    return NextResponse.json({ error: "未知操作或暂未实现" }, { status: 400 });

  } catch (error) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
