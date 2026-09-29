import { Link } from 'react-router';

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Lithello home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      lithello<span className="brand-period">.</span>
    </Link>
  );
}
