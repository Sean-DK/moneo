export function SectionLabel({ children, commented }: { children: string; commented?: boolean }) {
  return (
    <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
      {commented ? `// ${children}` : children}
    </div>
  );
}
