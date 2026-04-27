export interface Task {
  id: string;
  contractAddress: string;
  functionName: string;
  interval: number;
  gasBalance: number;
  createdAt: Date;
  totalTime: number; // in seconds
  timeEntries: TimeEntry[];
}

export interface TimeEntry {
  id: string;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  isManual: boolean;
  description?: string;
}

export interface ActiveTimer {
  taskId: string;
  startTime: Date;
  pausedAt?: Date;
  isPaused: boolean;
}