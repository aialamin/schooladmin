export default function StatCard({ label, value, tone = "blue" }) {
  const tones = {
    blue: "tone-blue",
    emerald: "tone-green",
    amber: "tone-amber",
    rose: "tone-pink",
  };

  return (
    <article className={`stat-card metric-card ${tones[tone] || tones.blue}`}>
      <p className="metric-label">{label}</p>
      <p className="stat-value">{value}</p>
      <div className="metric-glow" aria-hidden="true" />
    </article>
  );
}
