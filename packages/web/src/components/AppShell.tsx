import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { Brand } from './Brand';
import { RulesButton } from './RulesButton';

export function AppShell({
  children,
  actions,
  className = '',
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-shell ${className}`}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <Brand />
        <nav className="header-nav" aria-label="Main navigation">
          <NavLink to="/home" className="nav-link">
            The clubhouse
          </NavLink>
          <RulesButton />
        </nav>
        <div className="header-actions">
          {actions ?? (
            <span className="header-tag">
              A little strategy. A lot of possibility.
            </span>
          )}
        </div>
      </header>
      <main id="main-content" className="main-content">
        {children}
      </main>
      <footer className="site-footer">
        <span>Good games. Great company.</span>
        <span>
          64 squares. Endless possibilities.{' '}
          <span className="footer-disc" aria-hidden="true" />
        </span>
      </footer>
    </div>
  );
}
