'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { WCData } from './fetch-wc-data';

const WCDataContext = createContext<WCData | null>(null);

export function WCDataProvider({ data, children }: { data: WCData; children: ReactNode }) {
  return <WCDataContext.Provider value={data}>{children}</WCDataContext.Provider>;
}

export function useWCData(): WCData {
  const ctx = useContext(WCDataContext);
  if (!ctx) throw new Error('useWCData must be used within WCDataProvider');
  return ctx;
}
