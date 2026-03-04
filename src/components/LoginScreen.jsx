import React, { useState } from 'react';

export default function LoginScreen({ onLogin, loading, error }) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLocalError('');
    if (!mobile.trim()) {
      setLocalError('Mobile number is required.');
      return;
    }
    if (!otp.trim()) {
      setLocalError('OTP is required.');
      return;
    }
    await onLogin(mobile, otp);
  }

  return (
    <section className="max-w-md mx-auto mt-6 relative overflow-hidden rounded-3xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-200 via-fuchsia-100 to-amber-100" />
      <div className="pointer-events-none absolute -top-14 -left-10 w-48 h-48 rounded-full bg-cyan-400/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -right-10 w-56 h-56 rounded-full bg-fuchsia-400/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -left-16 w-48 h-48 rounded-full bg-amber-300/40 blur-3xl" />

      <div className="pointer-events-none absolute top-5 right-5 rotate-[-20deg] opacity-35">
        <div className="w-14 h-14 rounded-full border-[5px] border-slate-400" />
        <div className="w-1 h-12 bg-slate-500 rounded-full mx-auto -mt-1" />
      </div>

      <div className="pointer-events-none absolute bottom-6 left-4 rotate-[18deg] opacity-35">
        <div className="relative w-14 h-20">
          <div className="absolute top-0 left-4 w-6 h-6 rounded-full border-2 border-slate-400 bg-white/90" />
          <div className="absolute top-4 left-3 w-8 h-8 rounded-full border border-slate-400/70 bg-white/80" />
          <div className="absolute top-6 left-1 w-12 h-10 bg-white/85 [clip-path:polygon(50%_0%,100%_100%,0%_100%)] border border-slate-300/70" />
        </div>
      </div>

      <div className="relative rounded-2xl border border-white/60 bg-white/80 p-5 sm:p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-slate-900">Login</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter your registered mobile number and OTP.
        </p>
        {(localError || error) && (
          <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {localError || error}
          </div>
        )}
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <input
            className="w-full px-3 py-2 border border-white/70 rounded-lg bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
          <input
            className="w-full px-3 py-2 border border-white/70 rounded-lg bg-white/90 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            placeholder="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button
            type="submit"
            className="w-full btn-primary disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </section>
  );
}
