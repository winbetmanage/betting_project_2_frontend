export function Spinner({ className = "size-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className={className} />
  );
}

export function FullPageLoader({ label, dark = false }: { label?: string; dark?: boolean }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Spinner className="size-12" />
      {label && <p className={`text-sm ${dark ? "text-white/60" : "text-[#64748b]"}`}>{label}</p>}
    </div>
  );
}
