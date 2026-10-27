import { useEffect } from 'react';
import { useSelector } from '@tanstack/react-store';
import { cart, CART_KEY } from '../../lib/cart';
import type { Product } from '../../lib/catalog';

export function useCart() {
  return useSelector(cart.store);
}

export function useCartConnection(products: Product[]) {
  useEffect(() => {
    let local: Storage | undefined;
    let session: Storage | undefined;
    try {
      local = window.localStorage;
    } catch {
      cart.storageUnavailable();
    }
    try {
      session = window.sessionStorage;
    } catch {
      cart.storageUnavailable();
    }
    cart.initialize(products, local, session);
    const sync = (event: StorageEvent) => {
      if (
        event.storageArea === local &&
        (event.key === CART_KEY || event.key === null)
      )
        cart.sync(event.newValue);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [products]);
}
