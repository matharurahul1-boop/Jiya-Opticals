import { ProductCategory, StoreProfile } from '../types';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Spectacle Frame',
  'Sunglasses',
  'Ophthalmic Lens',
  'Contact Lens',
  'Lens Solution',
  'Optical Accessory',
  'Reading Glasses',
  'Equipment / Battery'
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
