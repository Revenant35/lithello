import "./ClockView.css";

interface ClockViewProps {
  clockText: string;
  disabled?: boolean;
}

export function ClockView({ clockText, disabled = false }: ClockViewProps) {
  return (
    <div className="clock" aria-disabled={disabled} aria-label={`Clock: ${clockText}`}>
      <span className="clock-text">{clockText}</span>
    </div>
  );
}
