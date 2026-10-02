import type { TaskInput } from '../src/types';

export const LIMITS: Readonly<Record<Exclude<keyof TaskInput, 'eventDate'>, number>>;
export function validateTaskInput(body: Partial<TaskInput>):
  | { ok: true; value: TaskInput }
  | { ok: false; message: string };
