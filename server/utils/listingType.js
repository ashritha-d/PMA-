// Listing types a property can be purchased under. Centralized here so
// adding a future type (e.g. 'sale-rent', 'auction') only means editing
// this list, not hunting down every `listingType === 'rent'` check.
const PURCHASABLE_LISTING_TYPES = ['sale'];

const isPurchasableListing = (property) => {
  if (!property || !property.listingType) return false;
  return PURCHASABLE_LISTING_TYPES.includes(property.listingType);
};

module.exports = { isPurchasableListing, PURCHASABLE_LISTING_TYPES };
