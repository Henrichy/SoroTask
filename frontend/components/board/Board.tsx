"use client"

import { useState } from "react"
import Column from "./Column"

type Task = {
  id: string
  title: string
}

type Columns = {
  todo: Task[]
  doing: Task[]
  done: Task[]
}

export default function Board() {
  const [columns] = useState<Columns>({
    todo: [
      { id: "1", title: "Design UI for dashboard" },
      { id: "2", title: "Fix login bug" },
    ],
    doing: [{ id: "3", title: "Implement API integration" }],
    done: [],
  })

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Column title="todo" tasks={columns.todo} />
          <Column title="doing" tasks={columns.doing} />
          <Column title="done" tasks={columns.done} />
        </div>
      </div>
    </div>
  )
}