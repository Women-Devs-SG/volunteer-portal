import type { ApiResponse, TaskInput, TasksResponse } from './types';

const API_BASE_URL = '/api';
const PASSWORD_KEY = 'wds-portal-password';

export const getPassword = () => sessionStorage.getItem(PASSWORD_KEY) ?? '';
export const setPassword = (value: string) => sessionStorage.setItem(PASSWORD_KEY, value);
export const clearPassword = () => sessionStorage.removeItem(PASSWORD_KEY);

const headers = (extra?: HeadersInit): HeadersInit => ({
  ...extra,
  'X-Portal-Password': getPassword(),
});

async function parseJson<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

export async function getTasks(): Promise<{ response: Response; data?: TasksResponse }> {
  const response = await fetch(`${API_BASE_URL}/tasks`, { headers: headers() });
  return { response, data: await parseJson<TasksResponse>(response) };
}

export async function createTask(input: TaskInput): Promise<{ response: Response; data?: ApiResponse }> {
  const response = await fetch(`${API_BASE_URL}/create-task`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  return { response, data: await parseJson<ApiResponse>(response) };
}
