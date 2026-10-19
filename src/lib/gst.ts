import { ProductCategory, StoreProfile } from '../types';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Frames',
  'Sunglasses',
  'Eyewear Lens',
  'Contact Lens',
  'Goggles Lens',
  'MPS',
  'Repair'
];

// Common brand names offered as autocomplete suggestions when creating a material.
// This is a starting list, not a restriction — any brand can still be typed freely.
export const SUGGESTED_EYEWEAR_BRANDS = [
  'Idee', 'David Jones', 'Scott', 'X-Ford', 'Peter John', 'Carrera', 'Calvin Klein',
  'Tommy Hilfiger', 'Ray-Ban', 'Vogue', 'Marc Jacobs', 'Burberry', 'Michael Kors',
  'Oakley', 'Police', 'Armani', 'Fokals', 'Mark Williams', 'Arnette'
];
export const SUGGESTED_CONTACT_LENS_BRANDS = [
  'Bausch & Lomb', 'Cooper Vision', 'Alcon', 'Johnson & Johnson', 'O2 Max'
];

/**
 * Resolve the GST % to use for a product. A per-category rate configured by the
 * shop (Masters → Store Profile → GST by Category) wins; otherwise `fallback`
 * (usually the product's own gstRate) is used.
 */
export function categoryGst(
  profile: Pick<StoreProfile, 'categoryGstRates'>,
  category: ProductCategory,
  fallback: number
): number {
  const rate = profile.categoryGstRates?.[category];
  return typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? rate : fallback;
}

/** HSN used when a material is saved without one, so bills never carry a blank HSN. */
export const DEFAULT_HSN: Record<ProductCategory, string> = {
  'Frames': '90031100',
  'Sunglasses': '90041000',
  'Eyewear Lens': '90015000',
  'Contact Lens': '90013000',
  'Goggles Lens': '90015000',
  'MPS': '33079000',
  'Repair': '998729',
  'Optical Accessory': '90049090',
  'Reading Glasses': '90049090',
  'Equipment / Battery': '90049090'
};
export const defaultHsn = (category: ProductCategory): string => DEFAULT_HSN[category] || '9001';
