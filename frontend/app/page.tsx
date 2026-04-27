'use client';

import { useState, useCallback } from 'react';
import {
  useSorobanTx,
  UserRejectedError,
  type TxState,
  type TxPhaseCallbacks,
} from '@/lib/use-soroban-tx';

// ─── Constants ────────────────────────────────────────────────────────────────

const STELLAR_EXPERT_BASE = 'https://stellar.expert/explorer/testnet/tx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

const TX_STEPS = ['Initiate', 'Sign', 'Submit', 'Pending', 'Confirmed'] as const;

function stepIndexForState(state: TxState): number {
  switch (state.status) {
    case 'idle':       return 0;
    case 'signing':    return 1;
    case 'submitting': return 2;
    case 'pending':    return 3;
    case 'success':    return 4;
    case 'error':      return -1;
  }
}

// ─── TxStatusPanel ────────────────────────────────────────────────────────────

interface TxStatusPanelProps {
  state: TxState;
  onReset: () => void;
  onRetry: () => void;
}

function TxStatusPanel({ state, onReset, onRetry }: TxStatusPanelProps) {
  if (state.status === 'idle') return null;

  const activeStep = stepIndexForState(state);
  const isError = state.status === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-neutral-800/80 border border-neutral-700/50 rounded-xl p-6 space-y-5 shadow-2xl backdrop-blur-sm"
    >
      {!isError && (
        <div className="flex items-center gap-1" aria-label="Transaction progress">
          {TX_STEPS.map((step, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            return (
              <div key={step} className="flex items-center gap-1 flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <div
                    className={[
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0',
                      isDone
                        ? 'bg-blue-500 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400/50 ring-offset-2 ring-offset-neutral-800'
                        : 'bg-neutral-700 text-neutral-500',
                    ].join(' ')}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isDone ? '\u2713' : i + 1}
                  </div>
                  <span className={[
                    'text-xs hidden sm:block whitespace-nowrap',
                    isActive ? 'text-blue-400 font-medium' : isDone ? 'text-neutral-400' : 'text-neutral-600',
                  ].join(' ')}>
                    {step}
                  </span>
                </div>
                {i < TX_STEPS.length - 1 && (
                  <div className={[
                    'h-0.5 flex-1 mb-4 transition-all duration-500',
                    isDone ? 'bg-blue-500' : 'bg-neutral-700',
                  ].join(' ')} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {state.status === 'signing' && (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0 animate-pulse">
            <span className="text-yellow-400 text-lg" aria-hidden="true">🔐</span>
          </div>
          <div>
            <p className="font-semibold text-neutral-100">Check your wallet</p>
            <p className="text-sm text-neutral-400 mt-0.5">
              A signing prompt is waiting in your wallet extension. Review the transaction details and approve to continue.
            </p>
          </div>
        </div>
      )}

      {state.status === 'submitting' && (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <svg className="animate-spin w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-neutral-100">Submitting to Stellar</p>
            <p className="text-sm text-neutral-400 mt-0.5">
              Broadcasting your signed transaction to the Soroban network via Horizon.
            </p>
          </div>
        </div>
      )}

      {state.status === 'pending' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <svg className="animate-spin w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-100">Transaction pending</p>
              <p className="text-sm text-neutral-400 mt-0.5">Your transaction is on-chain and awaiting ledger confirmation.</p>
            </div>
          </div>
          <div className="bg-neutral-900/60 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-neutral-400 truncate" aria-label="Transaction hash">
              {truncateHash(state.hash)}
            </span>
            <a href={`${STELLAR_EXPERT_BASE}/${state.hash}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline shrink-0 transition-colors">
              View on Explorer ↗
            </a>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <span className="text-green-400 text-lg" aria-hidden="true">✓</span>
            </div>
            <div>
              <p className="font-semibold text-green-400">Task registered successfully</p>
              <p className="text-sm text-neutral-400 mt-0.5">Your automation task is now live on-chain and will be executed by a keeper.</p>
            </div>
          </div>
          <div className="bg-neutral-900/60 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-neutral-400 truncate" aria-label="Transaction hash">
              {truncateHash(state.hash)}
            </span>
            <a href={`${STELLAR_EXPERT_BASE}/${state.hash}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline shrink-0 transition-colors">
              View on Explorer ↗
            </a>
          </div>
          <button onClick={onReset}
            className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-100 font-medium py-2 rounded-lg transition-colors text-sm">
            Register Another Task
          </button>
        </div>
      )}

      {state.status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <span className="text-red-400 text-lg" aria-hidden="true">✕</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-red-400">
                {state.reason === 'user_rejected'      && 'Signature rejected'}
                {state.reason === 'submission_failed'  && 'Submission failed'}
                {state.reason === 'transaction_failed' && 'Transaction failed on-chain'}
                {state.reason === 'timeout'            && 'Transaction timed out'}
              </p>
              <p className="text-sm text-neutral-400 mt-0.5 break-words">{state.message}</p>
              {state.reason === 'user_rejected' && (
                <p className="text-xs text-neutral-500 mt-1">Your funds were not moved. You can safely try again.</p>
              )}
              {state.reason === 'timeout' && (
                <p className="text-xs text-neutral-500 mt-1">The transaction was dropped before confirmation. No funds were deducted.</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {state.reason !== 'user_rejected' ? (
              <>
                <button onClick={onRetry}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors text-sm">
                  Try Again
                </button>
                <button onClick={onReset}
                  className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-100 font-medium py-2 rounded-lg transition-colors text-sm">
                  Start Over
                </button>
              </>
            ) : (
              <button onClick={onRetry}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors text-sm">
                Sign Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form & Executor ──────────────────────────────────────────────────────────

interface TaskForm {
  contractAddress: string;
  functionName: string;
  interval: string;
  gasBalance: string;
}

const EMPTY_FORM: TaskForm = { contractAddress: '', functionName: '', interval: '', gasBalance: '' };

/** Demo executor — replace with real Soroban SDK signing + Horizon submission */
function buildMockExecutor(_form: TaskForm) {
  return async (callbacks: TxPhaseCallbacks): Promise<string> => {
    await delay(1800);
    callbacks.onSubmitting();
    await delay(1200);
    const hash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    callbacks.onPending(hash);
    await delay(2500);
    return hash;
  };
}

// ─── Home Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const { state, execute, reset } = useSorobanTx();

  const isInFlight =
    state.status === 'signing' ||
    state.status === 'submitting' ||
    state.status === 'pending';
  const isTerminal = state.status === 'success' || state.status === 'error';

  const handleRegisterTask = useCallback(async () => {
    if (isInFlight || isTerminal) return;
    await execute(buildMockExecutor(form));
  }, [execute, form, isInFlight, isTerminal]);

  const handleReset = useCallback(() => {
    reset();
    setForm(EMPTY_FORM);
  }, [reset]);

  const handleRetry = useCallback(async () => {
    reset();
    await delay(50);
    await execute(buildMockExecutor(form));
  }, [execute, form, reset]);

  const handleFieldChange = useCallback(
    (field: keyof TaskForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">S</div>
            <h1 className="text-xl font-bold tracking-tight">SoroTask</h1>
          </div>
          <button className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md font-medium hover:bg-neutral-200 transition-colors">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Create Automation Task</h2>

            {!isTerminal && (
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 space-y-4 shadow-xl">
                <div>
                  <label htmlFor="contractAddress" className="block text-sm font-medium text-neutral-400 mb-1">Target Contract Address</label>
                  <input id="contractAddress" type="text" placeholder="C..."
                    value={form.contractAddress} onChange={handleFieldChange('contractAddress')}
                    disabled={isInFlight} aria-label="Target contract address"
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label htmlFor="functionName" className="block text-sm font-medium text-neutral-400 mb-1">Function Name</label>
                  <input id="functionName" type="text" placeholder="harvest_yield"
                    value={form.functionName} onChange={handleFieldChange('functionName')}
                    disabled={isInFlight} aria-label="Contract function name"
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="interval" className="block text-sm font-medium text-neutral-400 mb-1">Interval (seconds)</label>
                    <input id="interval" type="number" placeholder="3600"
                      value={form.interval} onChange={handleFieldChange('interval')}
                      disabled={isInFlight} aria-label="Execution interval in seconds"
                      className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label htmlFor="gasBalance" className="block text-sm font-medium text-neutral-400 mb-1">Gas Balance (XLM)</label>
                    <input id="gasBalance" type="number" placeholder="10"
                      value={form.gasBalance} onChange={handleFieldChange('gasBalance')}
                      disabled={isInFlight} aria-label="Gas balance in XLM"
                      className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                </div>
                <button
                  onClick={handleRegisterTask}
                  disabled={isInFlight}
                  aria-disabled={isInFlight}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors mt-2 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isInFlight ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {state.status === 'signing'    && 'Waiting for wallet…'}
                      {state.status === 'submitting' && 'Submitting to Stellar…'}
                      {state.status === 'pending'    && 'Awaiting confirmation…'}
                    </>
                  ) : 'Register Task'}
                </button>
              </div>
            )}

            <TxStatusPanel state={state} onReset={handleReset} onRetry={handleRetry} />
          </section>

          {/* Your Tasks Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your Tasks</h2>
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 min-h-[300px] flex flex-col items-center justify-center text-neutral-500 shadow-xl">
              <p>No tasks registered yet.</p>
            </div>
          </section>
        </div>

        {/* Execution Logs */}
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-bold">Execution Logs</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-700/50 shadow-xl">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-800/80 text-neutral-200 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Task ID</th>
                  <th className="px-6 py-4 font-medium">Target</th>
                  <th className="px-6 py-4 font-medium">Keeper</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Tx Hash</th>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-900/50">
                <tr className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-neutral-300">#1024</td>
                  <td className="px-6 py-4 font-mono">CC...A12B</td>
                  <td className="px-6 py-4 font-mono">GA...99X</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      Success
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <a href={`${STELLAR_EXPERT_BASE}/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2`}
                      target="_blank" rel="noopener noreferrer"
                      className="font-mono text-blue-400 hover:text-blue-300 underline transition-colors">
                      a1b2c3d4…a1b2
                    </a>
                  </td>
                  <td className="px-6 py-4">2 mins ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
