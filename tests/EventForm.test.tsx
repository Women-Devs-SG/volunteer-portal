import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventForm from '../src/components/EventForm';
import { useEventCreation } from '../src/useEventCreation';
import type { TaskInput } from '../src/types';

const empty: TaskInput = { taskName: '', formUrl: '', eventDate: '', eventLocation: '', eventOneLiner: '' };
const created = vi.fn(async () => {});
const unauthorized = vi.fn();

function Harness({ initial = empty }: { initial?: TaskInput }) {
  const [input, setInput] = useState(initial);
  const [visible, setVisible] = useState(true);
  const submission = useEventCreation(async () => { setInput(empty); await created(); }, unauthorized);
  return <>
    <button onClick={() => setVisible((value) => !value)}>Toggle route</button>
    {visible && <EventForm input={input} onChange={(field, value) => setInput((current) => ({ ...current, [field]: value }))}
      onSubmit={submission.submit} status={submission.status} submitting={submission.submitting} />}
  </>;
}

const success = () => new Response(JSON.stringify({ status: 'success', message: 'Synthetic event saved.' }), { status: 200 });
const submit = () => screen.getByRole('button', { name: /Create event &/ });
const name = () => screen.getByLabelText(/Event Name/);
const url = () => screen.getByLabelText(/Google Form Link/);

beforeEach(() => { created.mockClear(); unauthorized.mockClear(); });

describe('event creation flow', () => {
  it('blocks a blank name, focuses it, and preserves other fields', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('Event Location'), 'Synthetic room');
    await userEvent.click(submit());
    expect(fetch).not.toHaveBeenCalled();
    expect(name()).toHaveFocus();
    expect(name()).toHaveAttribute('aria-invalid', 'true');
    expect(name()).toHaveAccessibleDescription('Enter an event name.');
    expect(screen.getByLabelText('Event Location')).toHaveValue('Synthetic room');
    await userEvent.type(name(), 'Synthetic workshop');
    expect(name()).not.toHaveAttribute('aria-invalid');
    expect(name()).not.toHaveAttribute('aria-describedby');
    expect(name()).toHaveFocus();
  });

  it('shows all field errors and clears a corrected URL without moving focus', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<Harness initial={{ ...empty, formUrl: 'javascript:alert(1)' }} />);
    await userEvent.click(submit());
    expect(name()).toHaveFocus();
    expect(url()).toHaveAttribute('aria-invalid', 'true');
    expect(url()).toHaveAccessibleDescription(/https:\/\//);
    await userEvent.clear(url());
    expect(url()).not.toHaveAttribute('aria-invalid');
    expect(url()).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['taskName', 120], ['eventLocation', 120], ['eventOneLiner', 280], ['formUrl', 500],
  ] as const)('blocks %s beyond the server limit', async (field, limit) => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<Harness initial={{ ...empty, taskName: 'Synthetic workshop', [field]: 'x'.repeat(limit + 1) }} />);
    await userEvent.click(submit());
    const control = document.getElementById(field)!;
    expect(control).toHaveAttribute('maxlength', String(limit));
    expect(control).toHaveFocus();
    expect(control).toHaveAccessibleDescription(new RegExp(`${limit} characters or fewer`));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles native incomplete date input', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<Harness initial={{ ...empty, taskName: 'Synthetic workshop' }} />);
    const date = screen.getByLabelText('Event Date') as HTMLInputElement;
    vi.spyOn(date, 'validity', 'get').mockReturnValue({ badInput: true } as ValidityState);
    await userEvent.click(submit());
    expect(date).toHaveFocus();
    expect(date).toHaveAccessibleDescription(/complete, real date/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits normalized valid values and resets on success', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => success()); vi.stubGlobal('fetch', fetch);
    render(<Harness initial={{ ...empty, taskName: ' Synthetic workshop ', eventDate: '2000-01-01' }} />);
    await userEvent.click(submit());
    await waitFor(() => expect(created).toHaveBeenCalledOnce());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({ taskName: 'Synthetic workshop', formUrl: '', eventDate: '2000-01-01' });
    expect(name()).toHaveValue('');
    expect(screen.getByText('Synthetic event saved.')).toBeVisible();
  });

  it('preserves and displays server messages verbatim, persistently', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'error', message: '<b>Synthetic API failure</b>' }), { status: 502 })));
    render(<Harness initial={{ ...empty, taskName: 'Synthetic workshop' }} />);
    await userEvent.click(submit());
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('<b>Synthetic API failure</b>'));
    expect(screen.getByRole('alert').querySelector('b')).toBeNull();
    expect(name()).toHaveValue('Synthetic workshop');
    await userEvent.type(name(), ' corrected');
    expect(screen.getByRole('alert')).toHaveTextContent('Synthetic API failure');
    expect(created).not.toHaveBeenCalled();
  });

  it('sends Unicode URLs without pre-encoding beyond the server length cap', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => success()); vi.stubGlobal('fetch', fetch);
    const formUrl = 'https://example.com/' + 'é'.repeat(100);
    render(<Harness initial={{ ...empty, taskName: 'Synthetic Unicode workshop', formUrl }} />);
    await userEvent.click(submit());
    await waitFor(() => expect(created).toHaveBeenCalledOnce());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).formUrl).toBe(formUrl);
  });

  it.each([
    [500, 'not JSON'], [503, 'null'], [200, '{}'], [400, '{"status":"error","message":42}'],
  ])('does not mislabel HTTP %s malformed responses as connectivity errors', async (status, body) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: Number(status) })));
    render(<Harness initial={{ ...empty, taskName: 'Synthetic workshop' }} />);
    await userEvent.click(submit());
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/server/i));
    expect(screen.getByRole('alert')).not.toHaveTextContent(/connection|reach/i);
    expect(name()).toHaveValue('Synthetic workshop');
    expect(submit()).toBeEnabled();
  });

  it('maps backend field rejection, focuses it and clears it on correction', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'error', message: 'eventLocation must be 120 characters or fewer.' }), { status: 400 })));
    render(<Harness initial={{ ...empty, taskName: 'Synthetic workshop', eventLocation: 'Synthetic room' }} />);
    await userEvent.click(submit());
    const location = screen.getByLabelText('Event Location');
    await waitFor(() => expect(location).toHaveFocus());
    expect(location).toHaveAccessibleDescription('eventLocation must be 120 characters or fewer.');
    await userEvent.type(location, ' corrected');
    expect(location).not.toHaveAttribute('aria-invalid');
  });

  it('preserves values on a network error and allows retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValueOnce(new TypeError('Synthetic offline')).mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetch);
    render(<Harness initial={{ ...empty, taskName: 'Synthetic workshop' }} />);
    await userEvent.click(submit());
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/connection/));
    expect(name()).toHaveValue('Synthetic workshop');
    await userEvent.click(submit());
    await waitFor(() => expect(created).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('relocks on 401 without clearing the draft', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'error', message: 'Synthetic session expired.' }), { status: 401 })));
    render(<Harness initial={{ ...empty, taskName: 'Synthetic workshop' }} />);
    await userEvent.click(submit());
    await waitFor(() => expect(unauthorized).toHaveBeenCalledWith('Synthetic session expired.'));
    expect(name()).toHaveValue('Synthetic workshop');
  });

  it('prevents synchronous duplicates and route remount duplicates', async () => {
    let resolve!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal('fetch', fetch);
    render(<Harness initial={{ ...empty, taskName: 'Synthetic workshop' }} />);
    const form = submit().closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Creating event…' })).toBeDisabled();
    expect(name()).toBeDisabled();
    await userEvent.click(screen.getByText('Toggle route'));
    await userEvent.click(screen.getByText('Toggle route'));
    fireEvent.submit(screen.getByRole('button', { name: 'Creating event…' }).closest('form')!);
    expect(fetch).toHaveBeenCalledOnce();
    await act(async () => resolve(success()));
    expect(submit()).toBeEnabled();
    expect(created).toHaveBeenCalledOnce();
  });
});
