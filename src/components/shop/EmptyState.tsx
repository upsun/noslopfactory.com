import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Arrow } from './Icons';

export function EmptyState({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="wrap empty-page" id="main">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link className="button button--dark" to="/">
        Back to the collection <Arrow />
      </Link>
      {children}
    </main>
  );
}
