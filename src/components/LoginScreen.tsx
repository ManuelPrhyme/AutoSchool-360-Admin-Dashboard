import { useTurnkey } from '@turnkey/react-wallet-kit';

export function LoginScreen() {
  const { handleLogin } = useTurnkey();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-black text-white">
          A
        </div>
        <h1 className="text-2xl font-bold text-white">AutoSchool360</h1>
        <p className="mt-1 text-sm font-medium text-indigo-400">Vendor &amp; Delegate Admin Dashboard</p>
        <button
          onClick={() => void handleLogin()}
          className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500"
        >
          Sign in with Email
        </button>
      </div>
    </div>
  );
}
