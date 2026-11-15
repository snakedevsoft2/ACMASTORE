export function AuthTitle({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="font-display text-3xl font-extrabold uppercase italic">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-silver">{subtitle}</p>}
    </div>
  );
}
