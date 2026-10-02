export function Logo({ className = '' }: { className?: string }) {
  return (
    <a href="/" className={`inline-flex min-h-11 items-center gap-2.5 text-[19px] font-extrabold tracking-[-0.03em] ${className}`}>
      <img src="/icons/icon-192.png" alt="" width={32} height={32} className="h-8 w-8 rounded-[9px]" />
      달리모
    </a>
  );
}
