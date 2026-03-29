export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted)] mt-1">Your reputation at a glance.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Google Rating', value: '4.7', change: '+0.2' },
          { label: 'Total Reviews', value: '142', change: '+12' },
          { label: 'This Month', value: '18', change: '+5' },
          { label: 'Response Rate', value: '94%', change: '+8%' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <p className="text-sm text-[var(--muted)]">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
            <p className="text-sm text-green-600 mt-1">{stat.change} this month</p>
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 h-64 flex items-center justify-center">
          <p className="text-[var(--muted)]">Review trend chart — coming in Week 4</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 h-64 flex items-center justify-center">
          <p className="text-[var(--muted)]">Competitor comparison — coming in Week 4</p>
        </div>
      </div>
    </div>
  );
}
