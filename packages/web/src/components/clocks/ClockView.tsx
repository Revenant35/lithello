export function ClockView({
  clockText,
  disabled = false,
}: {
  clockText: string;
  disabled?: boolean;
}) {
  return (
    <div
      aria-disabled={disabled}
      aria-label={`Clock: ${clockText}`}
      className={
        disabled
          ? 'inline-flex select-none items-center justify-center rounded-md bg-wood-900 px-2 py-1 text-parchment-500'
          : 'inline-flex select-none items-center justify-center rounded-md bg-brass-400 px-2 py-1 text-wood-950'
      }
    >
      <span className="font-mono text-xs font-semibold tracking-wide">
        {clockText}
      </span>
    </div>
  );
}
