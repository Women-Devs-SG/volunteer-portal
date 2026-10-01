import { describe, expect, it } from 'vitest';
import { validateTaskInput } from '../lib/validate.mjs';
import { LIMITS, validateField, validateForm } from '../src/validation';
import type { TaskInput } from '../src/types';

const valid: TaskInput = {
  taskName: 'Synthetic workshop', formUrl: '', eventDate: '', eventLocation: '', eventOneLiner: '',
};

describe('shared validation contract', () => {
  it.each(['', '  ', '\u0000\n'])('requires a normalized name: %j', (value) => {
    expect(validateField('taskName', value)).toBe('Enter an event name.');
    expect(validateTaskInput({ taskName: value }).ok).toBe(false);
  });
  it.each(['', 'https://example.com/form', 'http://example.com/form'])('accepts backend URL %j', (formUrl) => {
    expect(validateForm({ ...valid, formUrl })).toEqual({});
    expect(validateTaskInput({ ...valid, formUrl }).ok).toBe(true);
  });
  it.each(['not a link', 'https://', 'ftp://example.com', 'javascript:alert(1)', '/form'])('rejects URL %j', (formUrl) => {
    expect(validateField('formUrl', formUrl)).toContain('https://');
    expect(validateTaskInput({ ...valid, formUrl }).ok).toBe(false);
  });
  it.each(Object.keys(LIMITS) as (keyof typeof LIMITS)[])('matches %s length boundaries', (field) => {
    const prefix = field === 'formUrl' ? 'https://example.com/' : '';
    const value = prefix + 'x'.repeat(LIMITS[field] - prefix.length);
    expect(validateField(field, value)).toBeUndefined();
    expect(validateTaskInput({ ...valid, [field]: value }).ok).toBe(true);
    expect(validateField(field, value + 'x')).toContain(`${LIMITS[field]} characters or fewer`);
    expect(validateTaskInput({ ...valid, [field]: value + 'x' }).ok).toBe(false);
    expect(validateField(field, ` \u0000${value}\n `)).toBeUndefined();
  });
  it.each(['', '2000-01-01', '2024-02-29'])('accepts optional/past date %j', (eventDate) => {
    expect(validateField('eventDate', eventDate)).toBeUndefined();
  });
  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '01/02/2026', '2026-01-01T00:00:00Z'])('rejects date %j', (eventDate) => {
    expect(validateField('eventDate', eventDate)).toBeDefined();
    expect(validateTaskInput({ ...valid, eventDate }).ok).toBe(false);
  });
  it('reports all invalid fields', () => {
    expect(Object.keys(validateForm({ ...valid, taskName: '', formUrl: 'bad', eventLocation: 'x'.repeat(121) })))
      .toEqual(['taskName', 'eventLocation', 'formUrl']);
  });
});
