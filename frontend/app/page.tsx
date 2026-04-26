import { ThemeToggle } from "./theme/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-overlay)] backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-[var(--accent-shadow)]">
              S
            </div>
            <h1 className="text-xl font-bold tracking-tight">SoroTask</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button className="bg-[var(--text-primary)] text-[var(--bg-base)] px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity">
              Connect Wallet
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Create Task Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Create Automation Task</h2>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4 shadow-xl">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Target Contract Address
                </label>
                <input
                  type="text"
                  placeholder="C..."
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none transition-all font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Function Name
                </label>
                <input
                  type="text"
                  placeholder="harvest_yield"
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none transition-all font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Interval (seconds)
                  </label>
                  <input
                    type="number"
                    placeholder="3600"
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none transition-all font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Gas Balance (XLM)
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none transition-all font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>
              <button className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium py-3 rounded-lg transition-colors mt-2 shadow-lg shadow-[var(--accent-shadow)]">
                Register Task
              </button>
            </div>
          </section>

          {/* Your Tasks Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your Tasks</h2>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 min-h-[300px] flex flex-col items-center justify-center text-[var(--text-muted)] shadow-xl">
              <p>No tasks registered yet.</p>
            </div>
          </section>
        </div>

        {/* Execution Logs */}
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-bold">Execution Logs</h2>
          <div className="overflow-hidden rounded-xl border border-[var(--border)] shadow-xl">
            <table className="w-full text-left text-sm text-[var(--text-secondary)]">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-primary)] backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Task ID</th>
                  <th className="px-6 py-4 font-medium">Target</th>
                  <th className="px-6 py-4 font-medium">Keeper</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <tr className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-6 py-4 font-mono text-[var(--text-primary)]">
                    #1024
                  </td>
                  <td className="px-6 py-4 font-mono">CC...A12B</td>
                  <td className="px-6 py-4 font-mono">GA...99X</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
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
  );
}
