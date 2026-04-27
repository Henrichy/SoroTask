'use client';

'use client';

import Image from "next/image";
import { useState } from "react";
import { useTimeTracking } from "./context/TimeTrackingContext";
import { TaskListWithDetail } from "./components/TaskListWithDetail";
import { Task } from "./types";
import { MentionsInput } from "./components/MentionsInput";
import { MentionRenderer } from "./components/MentionRenderer";

export default function Home() {
  const { state, dispatch } = useTimeTracking();
  const [contractAddress, setContractAddress] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [interval, setInterval] = useState(3600);
  const [gasBalance, setGasBalance] = useState(10);
  const [demoText, setDemoText] = useState("");

  const handleRegisterTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      contractAddress,
      functionName,
      interval,
      gasBalance,
      createdAt: new Date(),
      totalTime: 0,
      timeEntries: [],
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
    setContractAddress("");
    setFunctionName("");
    setInterval(3600);
    setGasBalance(10);
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

      <main className="flex flex-col min-h-screen">
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

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Create Task Section - Fixed Width */}
          <section className="w-96 border-r border-neutral-800 bg-neutral-950/30 p-6 space-y-6 overflow-y-auto">
            <h2 className="text-2xl font-bold">Create Automation Task</h2>
            <form onSubmit={handleRegisterTask} className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 space-y-4 shadow-xl">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Target Contract Address</label>
                <input
                  type="text"
                  placeholder="C..."
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Function Name</label>
                <input
                  type="text"
                  placeholder="harvest_yield"
                  value={functionName}
                  onChange={(e) => setFunctionName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Interval (seconds)</label>
                  <input
                    type="number"
                    placeholder="3600"
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value) || 3600)}
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Gas Balance (XLM)</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={gasBalance}
                    onChange={(e) => setGasBalance(parseInt(e.target.value) || 10)}
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                    required
                  />
                </div>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors mt-2 shadow-lg shadow-blue-600/20" type="submit">
                Register Task
              </button>
            </form>
          </section>

          {/* Task List and Detail Section - Flexible */}
          <div className="flex-1">
            <TaskListWithDetail />
          </div>
        </div>

        {/* Mentions Demo Section - Fixed at bottom */}
        <section className="border-t border-neutral-800 bg-neutral-950/30 p-6">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold mb-6">Mentions Demo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-semibold mb-4">Input with Mentions</h3>
                <MentionsInput
                  value={demoText}
                  onChange={setDemoText}
                  placeholder="Try typing @Alice, #Harvest, or $Contract..."
                  rows={4}
                />
              </div>
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-semibold mb-4">Rendered Output</h3>
                <div className="min-h-[100px] p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                  {demoText ? (
                    <MentionRenderer text={demoText} />
                  ) : (
                    <p className="text-neutral-500 italic">Rendered mentions will appear here...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
