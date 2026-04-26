"use client";

import Image from "next/image";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function Home() {
  const { isWalletConnected, walletAddress, connectWallet, disconnectWallet, tasks, addTask, logs } = useAppStore();

  // Local form state
  const [target, setTarget] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [interval, setInterval] = useState("");
  const [gasBalance, setGasBalance] = useState("");

  const handleRegisterTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !functionName || !interval || !gasBalance) return;
    
    addTask({
      target,
      functionName,
      interval: parseInt(interval),
      gasBalance: parseFloat(gasBalance)
    });
    
    // Clear form
    setTarget("");
    setFunctionName("");
    setInterval("");
    setGasBalance("");
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
          {isWalletConnected ? (
            <button 
              onClick={disconnectWallet}
              className="bg-neutral-800 border border-neutral-700 text-neutral-300 px-4 py-2 rounded-md font-medium hover:bg-neutral-700 transition-colors flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              {walletAddress}
            </button>
          ) : (
            <button 
              onClick={connectWallet}
              className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md font-medium hover:bg-neutral-200 transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Create Task Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Create Automation Task</h2>
            <form onSubmit={handleRegisterTask} className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 space-y-4 shadow-xl">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Target Contract Address</label>
                <input 
                  type="text" 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="C..." 
                  className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Function Name</label>
                <input 
                  type="text" 
                  value={functionName}
                  onChange={(e) => setFunctionName(e.target.value)}
                  placeholder="harvest_yield" 
                  className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm" 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Interval (seconds)</label>
                  <input 
                    type="number" 
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    placeholder="3600" 
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Gas Balance (XLM)</label>
                  <input 
                    type="number" 
                    value={gasBalance}
                    onChange={(e) => setGasBalance(e.target.value)}
                    placeholder="10" 
                    step="0.1"
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm" 
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors mt-2 shadow-lg shadow-blue-600/20"
              >
                Register Task
              </button>
            </form>
          </section>

          {/* Your Tasks Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your Tasks</h2>
            <div className={`bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 shadow-xl ${tasks.length === 0 ? 'min-h-[300px] flex flex-col items-center justify-center text-neutral-500' : 'space-y-4'}`}>
              {tasks.length === 0 ? (
                <p>No tasks registered yet.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="bg-neutral-900 border border-neutral-700/50 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <div className="font-mono text-sm text-neutral-300">{task.target}</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Fn: <span className="text-blue-400 font-mono">{task.functionName}</span> | Interval: {task.interval}s
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{task.gasBalance} XLM</div>
                      <div className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">Gas</div>
                    </div>
                  </div>
                ))
              )}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-900/50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-neutral-300">{log.taskId}</td>
                    <td className="px-6 py-4 font-mono">{log.target}</td>
                    <td className="px-6 py-4 font-mono">{log.keeper}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        log.status === 'Success' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : log.status === 'Failed' 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{log.timestamp}</td>
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
