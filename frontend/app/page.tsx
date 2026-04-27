import Image from "next/image";
import RecurringTaskSetup from "./components/RecurringTaskSetup";

export default function Home() {
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
              
              <RecurringTaskSetup />

              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors mt-2 shadow-lg shadow-blue-600/20">
                Register Task
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
          <h2 className="text-2xl font-bold">Execution Logs</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-700/50 shadow-xl">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-800/80 text-neutral-200 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Task ID</th>
                  <th className="px-6 py-4 font-medium">Target</th>
                  <th className="px-6 py-4 font-medium">Keeper</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-900/50">
                {/* Mock Row */}
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-yellow-500 transition-colors border border-neutral-700" title="Pause">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                      <button className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-500 transition-colors border border-neutral-700" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
