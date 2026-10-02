import { LIMITS, validateTaskInput } from '../lib/validate.mjs';
import type { TaskInput } from './types';

export { LIMITS };
export type FieldErrors = Partial<Record<keyof TaskInput, string>>;
export const fieldOrder: (keyof TaskInput)[] = [
  'taskName', 'eventDate', 'eventLocation', 'eventOneLiner', 'formUrl',
];
export const fieldLabels: Record<keyof TaskInput, string> = {
  taskName: 'Event Name', eventDate: 'Event Date', eventLocation: 'Event Location',
  eventOneLiner: 'One-line Event Description', formUrl: 'Google Form URL',
};

export function validateField(field: keyof TaskInput, value: string, badInput = false): string | undefined {
  if (badInput) return 'Enter a complete, real date in YYYY-MM-DD format.';
  // A valid placeholder name lets the server validator check fields independently.
  const result = validateTaskInput({ taskName: 'Validation placeholder', [field]: value });
  if (result.ok) return undefined;
  if (result.message === 'Task name is required.') return 'Enter an event name.';
  if (field === 'formUrl' && !result.message.includes('characters or fewer')) {
    return 'Enter a valid URL starting with https:// or http:// (for example, https://example.com/form).';
  }
  return result.message.replace(field, fieldLabels[field]);
}

export function validateForm(input: TaskInput): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldOrder) {
    const message = validateField(field, input[field]);
    if (message) errors[field] = message;
  }
  return errors;
}

export function serverErrorField(message: string): keyof TaskInput | undefined {
  if (message === 'Task name is required.') return 'taskName';
  return fieldOrder.find((field) => message.startsWith(`${field} `));
}
