import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export function SearchProvider({ children }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('Search...');

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, placeholder, setPlaceholder }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new SearchError('useSearch must be used within a SearchProvider');
  }
  return context;
}
