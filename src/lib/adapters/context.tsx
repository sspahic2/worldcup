'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { CompetitionData } from './types';

const CompetitionDataContext = createContext<CompetitionData | null>(null);

export function CompetitionDataProvider({
  data,
  children,
}: {
  data: CompetitionData;
  children: ReactNode;
}) {
  return (
    <CompetitionDataContext.Provider value={data}>
      {children}
    </CompetitionDataContext.Provider>
  );
}

export function useCompetitionData(): CompetitionData {
  const ctx = useContext(CompetitionDataContext);
  if (!ctx) throw new Error('useCompetitionData must be used within CompetitionDataProvider');
  return ctx;
}
