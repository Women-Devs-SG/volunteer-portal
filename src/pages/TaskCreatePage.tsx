import type { FormEvent } from 'react';
import type { FormStatus, TaskInput } from '../types';

interface TaskCreatePageProps {
  demoModeNote: string;
  input: TaskInput;
  onBack: () => void;
  onChange: (field: keyof TaskInput, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  status: FormStatus;
  submitting: boolean;
}

export default function TaskCreatePage({
  demoModeNote,
  input,
  onBack,
  onChange,
  onSubmit,
  status,
  submitting,
}: TaskCreatePageProps) {
  return (
    <main className="mx-auto w-[min(100%-2rem,760px)] py-12 pb-[72px] max-[600px]:pt-[22px]">
      <section className="rounded-[18px] border border-[#304537]/[.12] bg-white/[.94] p-7 shadow-[0_18px_50px_rgba(31,50,38,.07)] max-[600px]:rounded-[14px] max-[600px]:p-[22px]">
        <div className="mb-6 flex items-center justify-between gap-4 max-[480px]:items-start">
          <div><p className="mb-[3px] text-[.76rem] font-bold tracking-[.13em] text-[#6c8f31] uppercase">01</p><h2 className="text-[1.35rem] font-bold">Create an event</h2></div>
          <button className="mt-0 w-auto shrink-0 rounded-[9px] border border-[#ced8d1] bg-white px-3 py-2 font-bold text-[#295b43] transition hover:bg-[#edf4e6]" onClick={onBack} type="button">Back to portal</button>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-[#5c6961]">{demoModeNote}</p>

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-[17px] max-[600px]:grid-cols-1">
            <div>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="taskName">Event Name <span className="text-[#b34a3e">*</span></label>
              <input
                className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
                id="taskName"
                maxLength={120}
                onChange={(event) => onChange('taskName', event.target.value)}
                placeholder="e.g. MedCamp 2026"
                required
                value={input.taskName}
              />
            </div>

            <div>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="eventDate">Event Date</label>
              <input className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]" id="eventDate" onChange={(event) => onChange('eventDate', event.target.value)} type="date" value={input.eventDate} />
            </div>

            <div>
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="eventLocation">Event Location</label>
              <input
                className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
                id="eventLocation"
                maxLength={120}
                onChange={(event) => onChange('eventLocation', event.target.value)}
                placeholder="e.g. Singapore"
                value={input.eventLocation}
              />
            </div>

            <div className="col-span-full max-[600px]:col-auto">
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="eventOneLiner">One-line Event Description</label>
              <input
                className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
                id="eventOneLiner"
                maxLength={280}
                onChange={(event) => onChange('eventOneLiner', event.target.value)}
                placeholder="e.g. A community-led volunteering meetup"
                value={input.eventOneLiner}
              />
            </div>

            <div className="col-span-full max-[600px]:col-auto">
              <label className="mb-[7px] block text-[.84rem] font-bold" htmlFor="formUrl">Google Form Link <small className="font-medium text-[#809087]">Optional</small></label>
              <input
                className="w-full rounded-[9px] border border-[#ced8d1] bg-[#fbfcfa] px-[13px] py-[11px] text-[#17201b] outline-none transition focus:border-[#517d3d] focus:shadow-[0_0_0_3px_rgba(81,125,61,.13)]"
                id="formUrl"
                maxLength={500}
                onChange={(event) => onChange('formUrl', event.target.value)}
                placeholder="https://forms.google.com/…"
                type="url"
                value={input.formUrl}
              />
            </div>
          </div>

          <button className="mt-[22px] w-full rounded-[9px] bg-[#295b43] px-[18px] py-[13px] font-bold text-white transition hover:-translate-y-px hover:bg-[#183d2e] disabled:cursor-wait disabled:bg-[#94a49a]" disabled={submitting} type="submit">
            {submitting ? 'Preparing event workspace & Telegram alert…' : 'Create event & run automations →'}
          </button>
          <p aria-live="polite" className={`mt-3 min-h-[1.2em] text-sm ${status?.kind === 'error' ? 'text-[#a43b32]' : status?.kind === 'success' ? 'text-[#28723f]' : ''}`}>{status?.message}</p>
        </form>
      </section>
    </main>
  );
}
