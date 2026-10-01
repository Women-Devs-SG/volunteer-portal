import EventForm from '../components/EventForm';
import type { EventFormProps } from '../components/EventForm';

interface TaskCreatePageProps extends EventFormProps {
  demoModeNote: string;
  onBack: () => void;
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
          <button className="mt-0 w-auto shrink-0 rounded-[9px] border border-[#ced8d1] bg-white px-3 py-2 font-bold text-[#295b43] transition hover:bg-[#edf4e6]" onClick={onBack} disabled={submitting} type="button">Back to portal</button>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-[#5c6961]">{demoModeNote}</p>

        <EventForm input={input} onChange={onChange} onSubmit={onSubmit} status={status} submitting={submitting} />
      </section>
    </main>
  );
}
