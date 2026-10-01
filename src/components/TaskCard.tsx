import type { Task } from '../types';

export default function TaskCard({ task }: { task: Task }) {
  const driveUrl = /^https:\/\//i.test(task.driveUrl) ? task.driveUrl : null;

  return (
    <article className="rounded-xl border border-[#dce3de] bg-[#fbfcfa] p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#e6f2d7] px-[9px] py-1 text-[.7rem] font-extrabold tracking-[.06em] text-[#476b26] uppercase">{task.status || 'Pending'}</span>
        <span className="text-[.72rem] text-[#89958e]">{task.taskId}</span>
      </div>
      <h3 className="my-3 text-[1.08rem] font-bold">{task.taskName}</h3>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 max-[600px]:grid-cols-1">
        {task.eventDate && <p className="m-0 text-[.84rem] text-[#5c6961]"><strong className="mb-0.5 block text-[.7rem] text-[#243129] uppercase">Date</strong>{task.eventDate}</p>}
        {task.eventLocation && <p className="m-0 text-[.84rem] text-[#5c6961]"><strong className="mb-0.5 block text-[.7rem] text-[#243129] uppercase">Location</strong>{task.eventLocation}</p>}
        {task.eventOneLiner && <p className="col-span-full m-0 text-[.84rem] text-[#5c6961] max-[600px]:col-auto"><strong className="mb-0.5 block text-[.7rem] text-[#243129] uppercase">About</strong>{task.eventOneLiner}</p>}
      </div>
      {driveUrl && (
        <a className="mt-[14px] inline-block text-[.83rem] font-bold text-[#276243] no-underline hover:underline" href={driveUrl} rel="noopener noreferrer" target="_blank">
          Open Drive Folder ↗
        </a>
      )}
    </article>
  );
}
