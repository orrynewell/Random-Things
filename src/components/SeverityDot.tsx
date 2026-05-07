import type { Severity } from "../lib/thresholds";

const COLORS: Record<Severity, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit animate-pulse",
};

export function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${COLORS[severity]}`}
      aria-label={severity}
    />
  );
}
