export interface Task {
  taskId: string;
  taskName: string;
  status: string;
  driveUrl: string;
  qrUrl: string;
  createdAt: string;
  eventDate: string;
  eventLocation: string;
  eventOneLiner: string;
}

export interface TaskInput {
  taskName: string;
  formUrl: string;
  eventDate: string;
  eventLocation: string;
  eventOneLiner: string;
}

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
}

export interface TasksResponse extends ApiResponse {
  tasks?: Task[];
}
