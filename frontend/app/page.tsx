'use client';

import { useState, useCallback } from 'react';
import {
  useSorobanTx,
  type TxState,
  type TxPhaseCallbacks,
} from '@/lib/use-soroban-tx';
import {
  formatFieldValue,
  initialValuesFromDefinitions,
  sanitizeValues,
  validateValues,
  type CustomFieldDefinition,
  type CustomFieldValues,
} from '@/lib/custom-fields';
import {
  CustomFieldsEditableRenderer,
  CustomFieldsReadOnlyRenderer,
} from '@/lib/custom-fields-renderer';

// ─── Constants ────────────────────────────────────────────────────────────────

const STELLAR_EXPERT_BASE = 'https://stellar.expert/explorer/testnet/tx';
const CUSTOM_FIELD_DEFINITIONS: CustomFieldDefinition[] = [
  {
    id: 'cf-team',
    key: 'team',
    label: 'Owning Team',
    type: 'text',
    required: true,
  },
  {
    id: 'cf-priority',
    key: 'priority',
    label: 'Priority',
    type: 'select',
    required: true,
    options: ['low', 'medium', 'high'],
  },
  {
    id: 'cf-budget',
    key: 'budget',
    label: 'Monthly Budget (USD)',
    type: 'number',
  },
  {
    id: 'cf-compliance',
    key: 'complianceRequired',
    label: 'Compliance Required',
    type: 'checkbox',
  },
  {
    id: 'cf-goLive',
    key: 'goLiveDate',
    label: 'Go-Live Date',
    type: 'date',
  },
  {
    id: 'cf-legacy',
    key: 'legacyTag',
    label: 'Legacy Tag',
    type: 'text',
    retired: true,
  },
];

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

interface TaskDraft {
  contractAddress: string;
  functionName: string;
  interval: string;
  gasBalance: string;
  customValues: CustomFieldValues;
}

interface TaskRecord {
  id: string;
  contractAddress: string;
  functionName: string;
  interval: string;
  gasBalance: string;
  customValues: CustomFieldValues;
  txHash: string;
  createdAt: string;
}

function createEmptyDraft(): TaskDraft {
  return {
    contractAddress: '',
    functionName: '',
    interval: '',
    gasBalance: '',
    customValues: initialValuesFromDefinitions(CUSTOM_FIELD_DEFINITIONS),
  };
}

const SEED_TASKS: TaskRecord[] = [
  {
    id: 'TASK-1024',
    contractAddress: 'CC...A12B',
    functionName: 'harvest_yield',
    interval: '3600',
    gasBalance: '10',
    customValues: sanitizeValues(CUSTOM_FIELD_DEFINITIONS, {
      team: 'Treasury Ops',
      priority: 'high',
      budget: 2500,
      complianceRequired: true,
      goLiveDate: '2026-05-15',
      legacyTag: 'v1-migration',
      removedOwner: 'ops-7',
    }),
    txHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    createdAt: '2 mins ago',
  },
];

/** Demo executor — replace with real Soroban SDK signing + Horizon submission */
function buildMockExecutor(_form: TaskDraft) {
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
  const [createDraft, setCreateDraft] = useState<TaskDraft>(createEmptyDraft);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<TaskRecord[]>(SEED_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(SEED_TASKS[0]?.id ?? '');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TaskDraft>(createEmptyDraft);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const { state, execute, reset } = useSorobanTx();

  const isInFlight =
    state.status === 'signing' ||
    state.status === 'submitting' ||
    state.status === 'pending';
  const isTerminal = state.status === 'success' || state.status === 'error';

  const handleRegisterTask = useCallback(async () => {
    if (isInFlight || isTerminal) return;

    const validation = validateValues(CUSTOM_FIELD_DEFINITIONS, createDraft.customValues);
    if (!validation.isValid) {
      setCreateFieldErrors(validation.errors);
      return;
    }

    setCreateFieldErrors({});

    let submittedHash = '';
    await execute(async (callbacks) => {
      const hash = await buildMockExecutor(createDraft)(callbacks);
      submittedHash = hash;
      return hash;
    });

    if (submittedHash !== '') {
      const nextTask: TaskRecord = {
        id: `TASK-${Math.floor(Math.random() * 9000) + 1000}`,
        contractAddress: createDraft.contractAddress || 'C...NEW',
        functionName: createDraft.functionName || 'custom_call',
        interval: createDraft.interval || '0',
        gasBalance: createDraft.gasBalance || '0',
        customValues: sanitizeValues(CUSTOM_FIELD_DEFINITIONS, createDraft.customValues),
        txHash: submittedHash,
        createdAt: 'just now',
      };

      setTasks((prev) => [nextTask, ...prev]);
      setSelectedTaskId(nextTask.id);
      setCreateDraft(createEmptyDraft());
    }
  }, [createDraft, execute, isInFlight, isTerminal]);

  const handleReset = useCallback(() => {
    reset();
    setCreateFieldErrors({});
    setCreateDraft(createEmptyDraft());
  }, [reset]);

  const handleRetry = useCallback(async () => {
    reset();
    await delay(50);
    await handleRegisterTask();
  }, [handleRegisterTask, reset]);

  const handleFieldChange = useCallback(
    (field: keyof Omit<TaskDraft, 'customValues'>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setCreateDraft((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  const handleCreateCustomFieldChange = useCallback((key: string, value: string | number | boolean) => {
    setCreateDraft((prev) => ({
      ...prev,
      customValues: {
        ...prev.customValues,
        [key]: value,
      },
    }));
  }, []);

  const handleStartEdit = useCallback((task: TaskRecord) => {
    setEditingTaskId(task.id);
    setEditFieldErrors({});
    setEditDraft({
      contractAddress: task.contractAddress,
      functionName: task.functionName,
      interval: task.interval,
      gasBalance: task.gasBalance,
      customValues: sanitizeValues(CUSTOM_FIELD_DEFINITIONS, task.customValues),
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTaskId(null);
    setEditFieldErrors({});
  }, []);

  const handleEditFieldChange = useCallback(
    (field: keyof Omit<TaskDraft, 'customValues'>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditDraft((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  const handleEditCustomFieldChange = useCallback((key: string, value: string | number | boolean) => {
    setEditDraft((prev) => ({
      ...prev,
      customValues: {
        ...prev.customValues,
        [key]: value,
      },
    }));
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingTaskId) return;

    const validation = validateValues(CUSTOM_FIELD_DEFINITIONS, editDraft.customValues);
    if (!validation.isValid) {
      setEditFieldErrors(validation.errors);
      return;
    }

    setTasks((prev) => prev.map((task) => {
      if (task.id !== editingTaskId) return task;
      return {
        ...task,
        contractAddress: editDraft.contractAddress,
        functionName: editDraft.functionName,
        interval: editDraft.interval,
        gasBalance: editDraft.gasBalance,
        customValues: sanitizeValues(CUSTOM_FIELD_DEFINITIONS, editDraft.customValues),
      };
    }));
    setEditFieldErrors({});
    setEditingTaskId(null);
  }, [editDraft, editingTaskId]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

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
                    value={createDraft.contractAddress} onChange={handleFieldChange('contractAddress')}
                    disabled={isInFlight} aria-label="Target contract address"
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label htmlFor="functionName" className="block text-sm font-medium text-neutral-400 mb-1">Function Name</label>
                  <input id="functionName" type="text" placeholder="harvest_yield"
                    value={createDraft.functionName} onChange={handleFieldChange('functionName')}
                    disabled={isInFlight} aria-label="Contract function name"
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="interval" className="block text-sm font-medium text-neutral-400 mb-1">Interval (seconds)</label>
                    <input id="interval" type="number" placeholder="3600"
                      value={createDraft.interval} onChange={handleFieldChange('interval')}
                      disabled={isInFlight} aria-label="Execution interval in seconds"
                      className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label htmlFor="gasBalance" className="block text-sm font-medium text-neutral-400 mb-1">Gas Balance (XLM)</label>
                    <input id="gasBalance" type="number" placeholder="10"
                      value={createDraft.gasBalance} onChange={handleFieldChange('gasBalance')}
                      disabled={isInFlight} aria-label="Gas balance in XLM"
                      className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                </div>

                <CustomFieldsEditableRenderer
                  definitions={CUSTOM_FIELD_DEFINITIONS}
                  values={createDraft.customValues}
                  errors={createFieldErrors}
                  disabled={isInFlight}
                  onValueChange={handleCreateCustomFieldChange}
                />

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

            {tasks.length === 0 ? (
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 min-h-[300px] flex flex-col items-center justify-center text-neutral-500 shadow-xl">
                <p>No tasks registered yet.</p>
              </div>
            ) : (
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4 space-y-3 shadow-xl">
                {tasks.map((task) => (
                  <div key={task.id} className="border border-neutral-700/50 rounded-lg p-3 bg-neutral-900/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-neutral-200">{task.id}</p>
                        <p className="text-xs text-neutral-500 mt-1">{task.functionName} • {task.contractAddress}</p>
                        <p className="text-xs text-neutral-400 mt-2">
                          Team: {formatFieldValue(CUSTOM_FIELD_DEFINITIONS.find((f) => f.key === 'team'), task.customValues.team)}
                          {' '}• Priority: {formatFieldValue(CUSTOM_FIELD_DEFINITIONS.find((f) => f.key === 'priority'), task.customValues.priority)}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedTaskId(task.id)}
                          className="text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-100"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedTask && (
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-lg font-semibold">Task Detail: {selectedTask.id}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-500">Contract</p>
                    <p className="font-mono text-neutral-200">{selectedTask.contractAddress}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Function</p>
                    <p className="font-mono text-neutral-200">{selectedTask.functionName}</p>
                  </div>
                </div>

                <CustomFieldsReadOnlyRenderer
                  definitions={CUSTOM_FIELD_DEFINITIONS}
                  values={selectedTask.customValues}
                />
              </div>
            )}

            {editingTaskId && (
              <div className="bg-neutral-800/80 border border-neutral-700/50 rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-lg font-semibold">Edit Task {editingTaskId}</h3>

                <div>
                  <label htmlFor="edit-contractAddress" className="block text-sm font-medium text-neutral-400 mb-1">Target Contract Address</label>
                  <input
                    id="edit-contractAddress"
                    type="text"
                    value={editDraft.contractAddress}
                    onChange={handleEditFieldChange('contractAddress')}
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="edit-functionName" className="block text-sm font-medium text-neutral-400 mb-1">Function Name</label>
                  <input
                    id="edit-functionName"
                    type="text"
                    value={editDraft.functionName}
                    onChange={handleEditFieldChange('functionName')}
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>

                <CustomFieldsEditableRenderer
                  definitions={CUSTOM_FIELD_DEFINITIONS}
                  values={editDraft.customValues}
                  errors={editFieldErrors}
                  onValueChange={handleEditCustomFieldChange}
                />

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-100 font-medium py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-neutral-300">{task.id}</td>
                    <td className="px-6 py-4 font-mono">{task.contractAddress}</td>
                    <td className="px-6 py-4 font-mono">GA...99X</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Success
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a href={`${STELLAR_EXPERT_BASE}/${task.txHash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="font-mono text-blue-400 hover:text-blue-300 underline transition-colors">
                        {truncateHash(task.txHash)}
                      </a>
                    </td>
                    <td className="px-6 py-4">{task.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
