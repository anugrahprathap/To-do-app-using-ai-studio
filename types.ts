
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  createdAt: number;
  subtasks: Subtask[];
}

export interface User {
  username: string;
  tasks: Task[];
}

export interface GeminiRefinement {
  subtasks: string[];
  estimatedTime: string;
  category: string;
}
