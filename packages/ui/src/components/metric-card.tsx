interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'flat';
}

export function MetricCard({ label, value, change, trend = 'up' }: MetricCardProps) {
  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-500',
    flat: 'text-[var(--muted)]',
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {change && <p className={`text-sm mt-1 ${trendColor[trend]}`}>{change}</p>}
    </div>
  );
}
