import type { ProductCategory } from '../types';

export const LENS_TYPES = ['Single Vision', 'Progressive', 'Bifocal', 'Zero Power / Plano', 'Other'];
export const COATINGS = ['Blue Guard', 'Duravision Blue Guard', 'HMC (Anti-Reflective)', 'Blue Cut', 'Photochromic / Transition', 'Polarized', 'Hard coat (UC)'];
export const INDEXES = ['1.50', '1.56', '1.59', '1.60', '1.61', '1.67', '1.74'];
export const LENS_COMPANIES = ['Essilor', 'Zeiss', 'Hoya', 'Nikon', 'Rodenstock', 'Kodak'];

/** Spectacle lenses are made to order: no tags, no colour or frame details; they carry type, index and coating instead. */
export const isLensCategory = (category: ProductCategory) => category === 'Eyewear Lens' || category === 'Goggles Lens';

/** Short, readable variant part of a lens SKU: index 1.56 + "Blue Guard" -> "156BG". */
export const lensVariantKey = (index: string, coating: string) =>
  `${(index || '').replace(/[^0-9]/g, '')}${(coating || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase()).join('')}`;
