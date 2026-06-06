'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  // Already logged in?
  useEffect(() => {
    fetch('/api/config').then(r => {
      if (r.ok) router.replace(params.get('from') || '/');
    }).catch(() => {});
  }, [router, params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(params.get('from') || '/');
      } else {
        const d = await res.json();
        setError(d.error || '登录失败');
        setPassword('');
      }
    } catch {
      setError('网络错误，请重试');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)',
    }}>
      <div style={{
        width: 360, padding: '40px 36px', background: 'var(--bg-1)',
        border: '1px solid var(--hl-2)', borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--ac-1-soft)', border: '1px solid var(--ac-1-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="var(--ac-1)" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.02em' }}>QUASAR</div>
            <div style={{ fontSize: 11, color: 'var(--tx-3)' }}>AI 资产管理平台</div>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx-3)', display: 'block', marginBottom: 6 }}>访问密码</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="输入访问密码"
                autoFocus
                style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)',
                  display: 'flex', alignItems: 'center',
                }}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--bad)', padding: '8px 12px', background: 'var(--bad-soft)', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn btn--primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14 }}>
            {loading ? '验证中…' : '进入 Quasar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
