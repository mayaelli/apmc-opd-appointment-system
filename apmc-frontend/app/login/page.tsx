'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError('Invalid credentials');
        return;
      }

      router.push(data.redirectTo);
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-sm shadow-md p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/Amai_Pakpak_Medical_Center_seal_upscayl_4x_upscayl-standard-4x.png"
            alt="Amai Pakpak Medical Center seal"
            width={60}
            height={60}
            className="object-contain mb-3"
          />
          <h1 className="font-bold text-xl text-slate-900 text-center">Staff Login</h1>
          <p className="text-sm text-slate-500 text-center mt-1">
            APMC Outpatient Department — Staff Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block uppercase tracking-widest text-xs text-slate-500 font-semibold mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-sm px-4 py-3 text-sm text-slate-900 focus:outline-none"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block uppercase tracking-widest text-xs text-slate-500 font-semibold mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-sm px-4 py-3 text-sm text-slate-900 focus:outline-none"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 w-full rounded-sm uppercase tracking-wide transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          For password resets, contact the OPD Administrator.
        </p>
      </div>
    </div>
  );
}
