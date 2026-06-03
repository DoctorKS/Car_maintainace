import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useSession } from '@/lib/supabase/session';
import Spinner from '@/components/Spinner';

type Mode = 'signin' | 'signup';

const isIOSSafari = () =>
  typeof navigator !== 'undefined' &&
  /iP(ad|hone|od)/.test(navigator.userAgent) &&
  /Safari/.test(navigator.userAgent) &&
  !/CriOS|FxiOS/.test(navigator.userAgent);

export default function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-900">
        <Spinner />
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setInfo('สมัครสำเร็จ — โปรดตรวจอีเมลเพื่อยืนยัน');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-primary-900 px-6 text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-700 text-2xl font-extrabold">
            CX5
          </div>
          <h1 className="text-lg font-semibold">ตาราง maintainance</h1>
          <p className="text-xs text-white/70">CX-5 2016 ขข4699</p>
        </div>

        {!isSupabaseConfigured() && (
          <div className="mb-4 rounded-card bg-amber-500/20 p-3 text-xs text-amber-100">
            ⚠️ Supabase ยังไม่ได้ตั้งค่า — โปรดสร้างไฟล์{' '}
            <code className="rounded bg-black/30 px-1">.env.local</code> ตาม{' '}
            <code className="rounded bg-black/30 px-1">.env.example</code>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-white/70">อีเมล</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sub bg-primary-800 px-3 py-2.5 text-sm outline-none ring-2 ring-transparent focus:ring-primary-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/70">รหัสผ่าน</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sub bg-primary-800 px-3 py-2.5 text-sm outline-none ring-2 ring-transparent focus:ring-primary-400"
            />
          </label>
          {error && (
            <div className="rounded-sub bg-red-500/20 p-2 text-xs text-red-100">{error}</div>
          )}
          {info && (
            <div className="rounded-sub bg-green-500/20 p-2 text-xs text-green-100">{info}</div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center rounded-card bg-primary-600 px-4 py-3 text-sm font-semibold shadow-card active:scale-95 disabled:opacity-60"
          >
            {busy ? <Spinner /> : mode === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 w-full text-center text-xs text-white/70 underline-offset-2 hover:underline"
        >
          {mode === 'signin' ? 'ยังไม่มีบัญชี? สมัครเลย' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
        </button>

        {isIOSSafari() && (
          <div className="mt-6 rounded-card bg-primary-800 p-3 text-[11px] text-white/80">
            💡 เพื่อใช้งานเป็นแอป — กดปุ่ม <strong>แชร์</strong> ใน Safari แล้วเลือก{' '}
            <strong>เพิ่มลงหน้าจอหลัก</strong>
          </div>
        )}
      </div>
    </div>
  );
}
