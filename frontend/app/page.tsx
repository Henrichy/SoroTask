"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { endTimer, startTimer } from "@/lib/perf-monitor";

type TaskRow = {
  id: string;
  target: string;
  keeper: string;
  status: "Success" | "Failed";
  timestamp: string;
};

const INITIAL_TASKS: TaskRow[] = [
  {
    id: "#1024",
    target: "CC...A12B",
    keeper: "GA...99X",
    status: "Success",
    timestamp: "2 mins ago",
  },
  {
    id: "#1025",
    target: "CC...B31C",
    keeper: "GA...11P",
    status: "Failed",
    timestamp: "5 mins ago",
  },
];

export default function Home() {
  const routeLoadStartedRef = useRef<number | null>(null);
  const searchStartedRef = useRef<number | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>(INITIAL_TASKS);
  const [search, setSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    routeLoadStartedRef.current = startTimer();
    const raf = requestAnimationFrame(() => {
      if (routeLoadStartedRef.current !== null) {
        endTimer("route_load_ms", routeLoadStartedRef.current, {
          route: "/",
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter(
      (task) =>
        task.id.toLowerCase().includes(query) ||
        task.target.toLowerCase().includes(query) ||
        task.keeper.toLowerCase().includes(query) ||
        task.status.toLowerCase().includes(query)
    );
  }, [search, tasks]);

  useEffect(() => {
    if (searchStartedRef.current === null) return;
    const startedAt = searchStartedRef.current;
    const raf = requestAnimationFrame(() => {
      endTimer("search_latency_ms", startedAt, {
        queryLength: search.length,
        resultCount: visibleTasks.length,
      });
      searchStartedRef.current = null;
    });
    return () => cancelAnimationFrame(raf);
  }, [search, visibleTasks.length]);

  const selectedTask =
    visibleTasks.find((task) => task.id === selectedTaskId) ?? null;

  const onOpenTask = (taskId: string) => {
    const startedAt = startTimer();
    setSelectedTaskId(taskId);
    requestAnimationFrame(() => {
      endTimer("task_open_ms", startedAt, {
        taskId,
      });
    });
  };

  const onSearch = (value: string) => {
    searchStartedRef.current = startTimer();
    setSearch(value);
  };

  const onRegisterTask = async () => {
    setIsRegistering(true);
    const startedAt = startTimer();

    // Simulate the registration request path while backend wiring is pending.
    await new Promise((resolve) => setTimeout(resolve, 240));

    setTasks((prev) => [
      {
        id: `#${1024 + prev.length}`,
        target: "CC...NEW1",
        keeper: "GA...PENDING",
        status: "Success",
        timestamp: "just now",
      },
      ...prev,
    ]);
    endTimer("mutation_register_task_ms", startedAt, {
      mutation: "register_task",
      optimistic: true,
    });
    setIsRegistering(false);
  };

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
          {/* Create Task Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Create Automation Task</h2>
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 space-y-4 shadow-xl">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Target Contract Address</label>
                <input type="text" placeholder="C..." className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Function Name</label>
                <input type="text" placeholder="harvest_yield" className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Interval (seconds)</label>
                  <input type="number" placeholder="3600" className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Gas Balance (XLM)</label>
                  <input type="number" placeholder="10" className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm" />
                </div>
              </div>
              <button
                onClick={onRegisterTask}
                disabled={isRegistering}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors mt-2 shadow-lg shadow-blue-600/20"
              >
                {isRegistering ? "Registering..." : "Register Task"}
              </button>
            </div>
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-bold">Execution Logs</h2>
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by id, target, keeper, status"
              className="w-full md:w-[380px] bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          {selectedTask && (
            <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-sm">
              <p className="font-medium">Opened Task: {selectedTask.id}</p>
              <p className="text-neutral-300 mt-1">
                Target {selectedTask.target}, Keeper {selectedTask.keeper}, Status {selectedTask.status}
              </p>
            </div>
          )}

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
                {visibleTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => onOpenTask(task.id)}
                    className="hover:bg-neutral-800/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-neutral-300">{task.id}</td>
                    <td className="px-6 py-4 font-mono">{task.target}</td>
                    <td className="px-6 py-4 font-mono">{task.keeper}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          task.status === "Success"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{task.timestamp}</td>
                  </tr>
                ))}
                {visibleTasks.length === 0 && (
                  <tr>
                    <td className="px-6 py-6 text-neutral-500" colSpan={5}>
                      No logs match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
