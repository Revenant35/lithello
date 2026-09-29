export function ClockView({
  clockText,
  disabled = false,
}: {
  clockText: string;
  disabled?: boolean;
}) {
  return (
    <div
      role="timer"
      aria-live="off"
      aria-disabled={disabled}
      aria-label={`Clock: ${clockText}`}
      className={disabled ? 'clock clock-idle' : 'clock'}
    >
      <span>{clockText}</span>
    </div>
  );
}
