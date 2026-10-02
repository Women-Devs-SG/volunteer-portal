export default function FieldError({ id, message }: { id: string; message?: string }) {
  return <p aria-live="polite" aria-atomic="true" className="mt-1 text-sm text-[#a43b32]" id={id}>{message}</p>;
}
