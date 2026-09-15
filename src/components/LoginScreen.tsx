import { usePrivy } from '@privy-io/react-auth';

export function LoginScreen() {
  const { login } = usePrivy();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card" style={{ backgroundColor: 'var(--color-surface-elevated)', borderColor: 'var(--color-surface-border)' }}>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl text-3xl font-black text-white" style={{ backgroundColor: 'var(--color-brand-base)' }}>
          A
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">AutoSchool360</h1>
        <p className="mt-1 text-sm font-medium text-brand">Vendor &amp; Delegate Admin Dashboard</p>
        <button
          onClick={() => void login({ loginMethods: ['email'] })}
          className="btn-brand mt-8 w-full"
        >
          Sign in with Email
        </button>
      </div>
    </div>
  );
}
