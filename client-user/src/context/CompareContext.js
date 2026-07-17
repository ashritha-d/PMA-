import React, { createContext, useContext, useState } from 'react';
import toast from 'react-hot-toast';

const CompareContext = createContext();

const MAX_COMPARE = 4;

// Stores lightweight { _id, title, image } snapshots (not bare ids) so the
// sticky bar can render thumbnails without an extra fetch — the comparison
// page itself always re-fetches full data by id from the server.
export const CompareProvider = ({ children }) => {
  const [compareItems, setCompareItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('compareItems')) || []; } catch { return []; }
  });

  const persist = (items) => {
    setCompareItems(items);
    localStorage.setItem('compareItems', JSON.stringify(items));
  };

  const isComparing = (propertyId) => compareItems.some(p => p._id === propertyId);

  const toggleCompare = (property) => {
    if (isComparing(property._id)) {
      persist(compareItems.filter(p => p._id !== property._id));
      return;
    }
    if (compareItems.length >= MAX_COMPARE) {
      toast.error(`You can compare up to ${MAX_COMPARE} properties at a time`);
      return;
    }
    persist([...compareItems, { _id: property._id, title: property.title, image: property.images?.[0]?.url }]);
  };

  const removeCompare = (propertyId) => persist(compareItems.filter(p => p._id !== propertyId));
  const clearCompare = () => persist([]);

  return (
    <CompareContext.Provider value={{ compareItems, isComparing, toggleCompare, removeCompare, clearCompare, maxCompare: MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => useContext(CompareContext);
