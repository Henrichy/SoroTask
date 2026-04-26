"use client"

import { useEffect, useMemo, useState } from "react"
import {
  createTask,
  deleteTask,
  fetchTasks,
  moveTask,
  Task,
  TaskCreate,
  updateTask,
} from "../src/lib/task-client"

type TaskStatusState = {
  [id: string]: {
    pending: boolean
    error?: string
  }
}

type FormState = {
  target: string
  func: string
  interval: string
  balance: string
}

const emptyForm: FormState = {
  target: "",
  func: "",
  interval: "3600",
  balance: "10",
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [taskStatus, setTaskStatus] = useState<TaskStatusState>({})
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ interval: string; balance: string }>({
    interval: "",
    balance: "",
  })

  useEffect(() => {
    syncTasks()
  }, [])

  const syncTasks = async () => {
    setGlobalError(null)
    setIsLoading(true)
    try {
      const remoteTasks = await fetchTasks()
      setTasks(remoteTasks)
    } catch {
      setGlobalError("Unable to load tasks. Please refresh to try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = (taskId: string, status: TaskStatusState[string] | undefined) => {
    setTaskStatus((current) => {
      const next = { ...current }
      if (status) {
        next[taskId] = status
      } else {
        delete next[taskId]
      }
      return next
    })
  }

  const handleFormChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const buildDraft = (task: Task) => {
    setEditingTaskId(task.id)
    setEditDraft({
      interval: String(task.interval),
      balance: String(task.balance),
    })
    updateStatus(task.id, undefined)
  }

  const applyEdit = async (task: Task) => {
    const changes: Partial<TaskCreate> = {
      interval: Number(editDraft.interval),
      balance: Number(editDraft.balance),
    }

    const previousTasks = tasks
    const nextTasks = tasks.map((item) =>
      item.id === task.id ? { ...item, ...changes, status: 'pending' } : item
    )
    setTasks(nextTasks)
    updateStatus(task.id, { pending: true })
    setEditingTaskId(null)

    try {
      const updated = await updateTask(task.id, changes)
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)))
      updateStatus(task.id, undefined)
    } catch {
      setTasks(previousTasks)
      updateStatus(task.id, { pending: false, error: 'Failed to save changes. Please retry.' })
    }
  }

  const handleCreateTask = async () => {
    setGlobalError(null)
    setIsSubmitting(true)

    const optimisticId = `local-${Date.now()}`
    const optimisticTask: Task = {
      id: optimisticId,
      target: form.target.trim() || 'Unknown target',
      func: form.func.trim() || 'unknown_function',
      interval: Number(form.interval),
      balance: Number(form.balance),
      status: 'pending',
    }

    setTasks((current) => [optimisticTask, ...current])
    updateStatus(optimisticId, { pending: true })

    try {
      const created = await createTask({
        target: optimisticTask.target,
        func: optimisticTask.func,
        interval: optimisticTask.interval,
        balance: optimisticTask.balance,
      })
      setTasks((current) => current.map((task) => (task.id === optimisticId ? created : task)))
      updateStatus(optimisticId, undefined)
      setForm(emptyForm)
    } catch {
      setTasks((current) => current.filter((task) => task.id !== optimisticId))
      setGlobalError('Task registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const previousTasks = tasks
    const nextTasks = tasks.filter((task) => task.id !== taskId)
    setTasks(nextTasks)
    updateStatus(taskId, { pending: true })

    try {
      await deleteTask(taskId)
      updateStatus(taskId, undefined)
    } catch {
      setTasks(previousTasks)
      updateStatus(taskId, { pending: false, error: 'Unable to remove task. Please retry.' })
    }
  }

  const handleMoveTask = async (taskId: string, direction: -1 | 1) => {
    const index = tasks.findIndex((task) => task.id === taskId)
    if (index === -1) return
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= tasks.length) return

    const previousTasks = tasks
    const nextTasks = [...tasks]
    const [item] = nextTasks.splice(index, 1)
    nextTasks.splice(targetIndex, 0, item)
    setTasks(nextTasks)
    updateStatus(taskId, { pending: true })

    try {
      const remoteTasks = await moveTask(taskId, direction)
      setTasks(remoteTasks)
      updateStatus(taskId, undefined)
    } catch {
      setTasks(previousTasks)
      updateStatus(taskId, { pending: false, error: 'Unable to reorder task right now.' })
    }
  }

  const activeTaskCount = useMemo(() => tasks.filter((task) => task.status !== 'cancelled').length, [tasks])

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">S</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SoroTask</h1>
              <p className="text-sm text-neutral-400">Decentralized automation tasks with optimistic UX.</p>
            </div>
          </div>
          <button className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md font-medium hover:bg-neutral-200 transition-colors">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h2 className="text-3xl font-bold">Your Keeper Dashboard</h2>
            <p className="text-neutral-400">Create, manage, and reorder recurring tasks with instant feedback.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={syncTasks}
              className="rounded-lg border border-neutral-700/80 bg-neutral-800/80 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500"
            >
              {isLoading ? 'Refreshing…' : 'Refresh tasks'}
            </button>
            <div className="text-sm text-neutral-400">{activeTaskCount} active tasks</div>
          </div>
        </div>

        {globalError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-6">
            {globalError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-12 xl:grid-cols-[1.1fr_1fr]">
          <section className="space-y-6">
            <h3 className="text-2xl font-bold">Create Automation Task</h3>
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 space-y-5 shadow-xl">
              <div>
                <label htmlFor="target" className="block text-sm font-medium text-neutral-400 mb-1">Target Contract Address</label>
                <input
                  id="target"
                  value={form.target}
                  onChange={(event) => handleFormChange('target', event.target.value)}
                  type="text"
                  placeholder="C..."
                  className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label htmlFor="functionName" className="block text-sm font-medium text-neutral-400 mb-1">Function Name</label>
                <input
                  id="functionName"
                  value={form.func}
                  onChange={(event) => handleFormChange('func', event.target.value)}
                  type="text"
                  placeholder="harvest_yield"
                  className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="interval" className="block text-sm font-medium text-neutral-400 mb-1">Interval (seconds)</label>
                    <input
                      id="interval"
                    value={form.interval}
                    onChange={(event) => handleFormChange('interval', event.target.value)}
                    type="number"
                    placeholder="3600"
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <div>
                    <label htmlFor="balance" className="block text-sm font-medium text-neutral-400 mb-1">Gas Balance (XLM)</label>
                    <input
                      id="balance"
                    value={form.balance}
                    onChange={(event) => handleFormChange('balance', event.target.value)}
                    type="number"
                    placeholder="10"
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateTask}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Registering…' : 'Register Task'}
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-2xl font-bold">Your Tasks</h3>
              <span className="rounded-full border border-neutral-700/70 bg-neutral-950/60 px-3 py-1 text-xs text-neutral-300">
                {tasks.length} total
              </span>
            </div>
            <div className="overflow-hidden rounded-3xl border border-neutral-700/50 bg-neutral-900/80 shadow-xl">
              <table className="min-w-full text-left text-sm text-neutral-200">
                <thead className="border-b border-neutral-800 bg-neutral-950/90 text-neutral-300">
                  <tr>
                    <th className="px-5 py-4">Task</th>
                    <th className="px-5 py-4">Interval</th>
                    <th className="px-5 py-4">Balance</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-neutral-900">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-neutral-400">
                        Loading tasks…
                      </td>
                    </tr>
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-neutral-500">
                        No tasks registered yet.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task, index) => {
                      const status = taskStatus[task.id]
                      const isPending = status?.pending ?? false
                      const errorText = status?.error
                      const isEditing = editingTaskId === task.id

                      return (
                        <tr
                          key={task.id}
                          className={isPending ? 'bg-blue-500/10' : 'hover:bg-neutral-800/50 transition-colors'}
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-white">{task.func}</div>
                            <div className="mt-1 text-xs text-neutral-400 font-mono">{task.target}</div>
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                value={editDraft.interval}
                                onChange={(event) => setEditDraft((current) => ({ ...current, interval: event.target.value }))}
                                type="number"
                                className="w-full rounded-lg border border-neutral-700/70 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                              />
                            ) : (
                              <span className="font-mono text-neutral-300">{task.interval}s</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                value={editDraft.balance}
                                onChange={(event) => setEditDraft((current) => ({ ...current, balance: event.target.value }))}
                                type="number"
                                className="w-full rounded-lg border border-neutral-700/70 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                              />
                            ) : (
                              <span className="font-mono text-neutral-300">{task.balance} XLM</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                isPending
                                  ? 'bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/25'
                                  : 'bg-green-500/10 text-green-300 ring-1 ring-green-500/25'
                              }`}
                            >
                              {isPending ? 'Pending' : 'Active'}
                            </span>
                            {errorText ? (
                              <div className="mt-2 text-xs text-red-300">{errorText}</div>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 space-y-2">
                            {isEditing ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => applyEdit(task)}
                                  disabled={isPending}
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-200 transition hover:border-neutral-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => buildDraft(task)}
                                  disabled={isPending}
                                  className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-200 transition hover:border-neutral-500"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={isPending}
                                  className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveTask(task.id, -1)}
                                  disabled={isPending || index === 0}
                                  className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-200 transition hover:border-neutral-500 disabled:opacity-40"
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveTask(task.id, 1)}
                                  disabled={isPending || index === tasks.length - 1}
                                  className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-200 transition hover:border-neutral-500 disabled:opacity-40"
                                >
                                  Down
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mt-16 space-y-6">
          <h3 className="text-2xl font-bold">Execution Logs</h3>
          <div className="overflow-hidden rounded-xl border border-neutral-700/50 shadow-xl">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-800/80 text-neutral-200 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Task ID</th>
                  <th className="px-6 py-4 font-medium">Target</th>
                  <th className="px-6 py-4 font-medium">Keeper</th>
                  <th className="px-6 py-4 font-medium">Status</th>
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
                  <td className="px-6 py-4">2 mins ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
