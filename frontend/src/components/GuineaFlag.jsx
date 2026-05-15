/**
 * Guinean flag - vertical tricolor (Red | Yellow | Green).
 * Pure CSS, no emoji dependency. Defaults to a compact 6x4 badge.
 */
const GuineaFlag = ({ className = 'h-4 w-6' }) => (
  <span
    className={`inline-flex overflow-hidden rounded-[3px] ring-1 ring-black/10 shadow-sm shrink-0 ${className}`}
    role="img"
    aria-label="Drapeau de la Guinée"
  >
    <span className="flex-1 bg-[#CE1126]" />
    <span className="flex-1 bg-[#FCD116]" />
    <span className="flex-1 bg-[#009460]" />
  </span>
);

export default GuineaFlag;
