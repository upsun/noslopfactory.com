import { createContext, useContext } from 'react';
import type { Product } from '../../lib/catalog';

export const CatalogContext = createContext<Product[]>([]);
export const useCatalog = () => useContext(CatalogContext);
