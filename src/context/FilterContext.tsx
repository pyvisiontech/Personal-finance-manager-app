import React, { createContext, useContext, useState, useCallback } from 'react';
import moment, { Moment } from 'moment';
import { FilterPeriod } from '../features/dashboard/components/FilterMenu';

interface FilterContextType {
  filterPeriod: FilterPeriod;
  currentDate: Moment;
  setFilterPeriod: (period: FilterPeriod) => void;
  setCurrentDate: (date: Moment) => void;
  updateFilter: (period: FilterPeriod, date: Moment) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('monthly');
  const [currentDate, setCurrentDate] = useState<Moment>(moment().startOf('month'));

  const updateFilter = useCallback((period: FilterPeriod, date: Moment) => {
    setFilterPeriod(period);
    setCurrentDate(date);
  }, []);

  return (
    <FilterContext.Provider
      value={{
        filterPeriod,
        currentDate,
        setFilterPeriod,
        setCurrentDate,
        updateFilter,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}

