import './StatusButton.scss';

type Props = {
  label: string;
  color: string;             // ex: "#39AE93"
  active?: boolean;
  onClick?: () => void;
};

export default function StatusButton({ label, color, active, onClick }: Props) {
  return (
    <button
      className={`status-btn${active ? ' active' : ''}`}
      style={{ background: color }}
      onClick={onClick}
      aria-pressed={!!active}
      type="button"
    >
      {label}
    </button>
  );
}
