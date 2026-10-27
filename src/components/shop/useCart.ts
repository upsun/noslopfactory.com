import { useEffect } from 'react';
import { useSelector } from '@tanstack/react-store';
import { cart, CART_KEY } from '../../lib/cart';
import type { Product } from '../../lib/catalog';

function browserStorage(name: 'localStorage' | 'sessionStorage') {
  try {
    return window[name];
  } catch {
    return undefined;
  }
}

export function useCart() {
  return useSelector(cart.store);
}

export function useCartConnection(products: Product[]) {
  useEffect(() => {
    const local = browserStorage('localStorage');
    const session = browserStorage('sessionStorage');
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
