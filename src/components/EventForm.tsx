import { useState } from 'react';
import type { FormEvent } from 'react';
import { fieldLabels, fieldOrder, LIMITS, validateField, validateForm } from '../validation';
import type { FieldErrors } from '../validation';
import type { FormStatus, TaskInput } from '../types';
import ErrorBanner from './ErrorBanner';
import FieldError from './FieldError';

export interface EventFormProps {
  input: TaskInput;
  onChange: (field: keyof TaskInput, value: string) => void;
  onSubmit: (input: TaskInput) => Promise<FieldErrors | undefined>;
  status: FormStatus;
  submitting: boolean;
}

const controlClass = 'w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)] aria-invalid:border-[#a43b32] aria-invalid:shadow-[0_0_0_1px_#a43b32] disabled:opacity-70';
const placeholders: Partial<Record<keyof TaskInput, string>> = {
  taskName: 'e.g. Demo workshop', eventLocation: 'e.g. Demo room',
  eventOneLiner: 'e.g. A fictional community meetup', formUrl: 'https://example.com/form',
};

export default function EventForm({ input, onChange, onSubmit, status, submitting }: EventFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({});

  function focusFirst(form: HTMLFormElement, nextErrors: FieldErrors) {
    const field = fieldOrder.find((candidate) => nextErrors[candidate]);
    if (field && form.isConnected) (form.elements.namedItem(field) as HTMLInputElement | null)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const nextErrors = validateForm(input);
    const date = form.elements.namedItem('eventDate') as HTMLInputElement;
    const dateError = validateField('eventDate', input.eventDate, date.validity.badInput);
    if (dateError) nextErrors.eventDate = dateError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirst(form, nextErrors);
      return;
    }
    // Let the server normalize URLs once; encoding here can inflate their length
    // and make a valid raw value fail the server's pre-normalization length cap.
    const serverErrors = await onSubmit(input);
    if (serverErrors) {
      setErrors(serverErrors);
      // Request state may still have the controls disabled until React commits.
      requestAnimationFrame(() => focusFirst(form, serverErrors));
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <ErrorBanner message={status?.kind === 'error' ? status.message : undefined} />
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={submitting}>
        <legend className="sr-only">Event details</legend>
        <div className="grid grid-cols-2 gap-[17px] max-[600px]:grid-cols-1">
          {fieldOrder.map((field) => (
            <div className={field === 'eventOneLiner' || field === 'formUrl' ? 'col-span-full max-[600px]:col-auto' : undefined} key={field}>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor={field}>
                {field === 'formUrl' ? <>Google Form Link <small className="font-medium text-[#809087]">Optional</small></> : fieldLabels[field]}
                {field === 'taskName' && <span className="text-[#b34a3e]"> *</span>}
              </label>
              <input
                aria-describedby={errors[field] ? `${field}-error` : undefined}
                aria-invalid={errors[field] ? true : undefined}
                className={controlClass}
                id={field}
                name={field}
                maxLength={field === 'eventDate' ? undefined : LIMITS[field]}
                onChange={(event) => {
                  onChange(field, event.target.value);
                  if (errors[field]) {
                    const message = validateField(field, event.target.value, event.target.validity.badInput);
                    setErrors((current) => ({ ...current, [field]: message }));
                  }
                }}
                placeholder={placeholders[field]}
                required={field === 'taskName'}
                type={field === 'eventDate' ? 'date' : field === 'formUrl' ? 'url' : 'text'}
                value={input[field]}
              />
              <FieldError id={`${field}-error`} message={errors[field]} />
            </div>
          ))}
        </div>
      </fieldset>
      <button className="mt-[22px] w-full rounded-[9px] bg-[#295b43] px-[18px] py-[13px] font-bold text-white transition hover:-translate-y-px hover:bg-[#183d2e] disabled:cursor-wait disabled:bg-[#94a49a]" disabled={submitting} type="submit">
        {submitting ? 'Creating event…' : status?.kind === 'error' ? 'Retry event creation' : 'Create event & run automations →'}
      </button>
      <p aria-live="polite" aria-atomic="true" className="mt-3 min-h-[1.2em] text-sm text-[#28723f]">{status?.kind === 'success' ? status.message : ''}</p>
    </form>
  );
}
