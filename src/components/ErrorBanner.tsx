export default function ErrorBanner({ message }: { message?: string }) {
  return (
    <div aria-atomic="true" role="alert">
      {message && <p className="mb-5 rounded-[9px] border border-[#a43b32] bg-[#fff3f1] p-3 text-sm text-[#a43b32]"><strong>Could not create the event.</strong> {message}</p>}
    </div>
  );
}
