import type { ApiResponse, TaskInput, TasksResponse } from './types';

const API_BASE_URL = '/api';
const PASSWORD_KEY = 'wds-portal-password';

export const getPassword = () => sessionStorage.getItem(PASSWORD_KEY) ?? '';
export const setPassword = (value: string) => sessionStorage.setItem(PASSWORD_KEY, value);
export const clearPassword = () => sessionStorage.removeItem(PASSWORD_KEY);

const headers = (password: string, extra?: HeadersInit): HeadersInit => ({
  ...extra,
  'X-Portal-Password': password,
});

async function parseJson<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Failed to parse API response (${response.status} ${response.url}):`, error);
    return undefined;
  }
}

export async function getTasks(password = getPassword()): Promise<{ response: Response; data?: TasksResponse }> {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`, { headers: headers(password) });
    return { response, data: await parseJson<TasksResponse>(response) };
  } catch (error) {
    console.error('Failed to load tasks:', error);
    throw error;
  }
}

export async function createTask(input: TaskInput): Promise<{ response: Response; data?: ApiResponse }> {
  try {
    const response = await fetch(`${API_BASE_URL}/create-task`, {
      method: 'POST',
      headers: headers(getPassword(), { 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    return { response, data: await parseJson<ApiResponse>(response) };
  } catch (error) {
    console.error('Failed to create task:', error);
    throw error;
  }
}
