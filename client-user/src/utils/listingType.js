// Mirrors server/utils/listingType.js. Listing types a property can be
// purchased under — centralized so adding a future type only means
// editing this list, not hunting down every `listingType === 'rent'` check.
const PURCHASABLE_LISTING_TYPES = ['sale'];

export const isPurchasableListing = (property) => {
  if (!property || !property.listingType) return false;
  return PURCHASABLE_LISTING_TYPES.includes(property.listingType);
};
