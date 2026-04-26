import { Button } from "./components/Button";
import { TaskForm } from "./components/TaskForm";
import { LogsTable, LogEntry } from "./components/LogsTable";

const mockLogs: LogEntry[] = [
  {
    taskId: "#1024",
    target: "CC...A12B",
    keeper: "GA...99X",
    status: "success",
    timestamp: "2 mins ago",
  },  
];

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              S
            </div>
            <h1 className="text-xl font-bold tracking-tight">SoroTask</h1>
          </div>
          <Button variant="secondary">Connect Wallet</Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Create Automation Task</h2>
            <TaskForm />
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your Tasks</h2>
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 min-h-[300px] flex flex-col items-center justify-center text-neutral-500 shadow-xl">
              <p>No tasks registered yet.</p>
            </div>
          </section>
        </div>

        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-bold">Execution Logs</h2>
          <LogsTable logs={mockLogs} />
        </section>
      </main>
    </div>
  );
}
