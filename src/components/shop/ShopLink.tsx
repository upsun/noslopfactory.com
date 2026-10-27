import { Link, useRouter } from '@tanstack/react-router';
import type { ComponentPropsWithoutRef } from 'react';

// The shared shell is also rendered as an Astro island without a shop router.
// In the shop, client navigation preserves the memory-only storage fallback.
export function ShopLink({
  href,
  ...props
}: ComponentPropsWithoutRef<'a'> & { href: string }) {
  const router = useRouter({ warn: false });
  return router ? (
    <Link {...props} to={href.replace(/^\/shop(?:\/|$)/, '/')} />
  ) : (
    <a {...props} href={href} />
  );
}
