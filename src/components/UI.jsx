export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}
export function CardTitle({ children }) {
  return <div className="card-label">{children}</div>;
}
export function Badge({ children, variant = 'outline' }) {
  const map = { teal: 'badge-white', blue: 'badge-outline', amber: 'badge-outline', gray: 'badge-dim', white: 'badge-white' };
  return <span className={`badge ${map[variant] || 'badge-outline'}`}>{children}</span>;
}
export function Btn({ children, variant = 'outline', full = false, onClick, className = '' }) {
  const map = { teal: 'btn-white', white: 'btn-white', outline: 'btn-outline', ghost: 'btn-ghost', danger: 'btn-outline' };
  return (
    <button onClick={onClick}
      className={`btn ${map[variant] || 'btn-outline'} ${full ? 'btn-full' : ''} ${className}`}>
      {children}
    </button>
  );
}
export function FilterBar({ options, active, onChange }) {
  return (
    <div className="filter-bar">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className={`filter-pill${active === opt ? ' active' : ''}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}
export function AllocBar({ label, pct }) {
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track"><div className="bar-fill bar-animate" style={{ width: `${pct}%` }} /></div>
      <span className="bar-pct">{pct}%</span>
    </div>
  );
}
export function Hash({ children }) {
  return <span className="hash">{children}</span>;
}
export function Toggle({ on = true, onChange }) {
  return (
    <div onClick={() => onChange && onChange(!on)} className={`toggle ${on ? 'toggle-on' : 'toggle-off'}`}>
      <div className="toggle-thumb" />
    </div>
  );
}
export function LiveDot() {
  return <span className="live-dot" style={{ display: 'inline-block', marginRight: '4px' }} />;
}
