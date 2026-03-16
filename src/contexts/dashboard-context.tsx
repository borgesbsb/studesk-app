"use client";

import React, { createContext, useContext, useState } from "react";

interface DashboardContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // Inicializa com meia-noite local para evitar bug de UTC: new Date() às 23h BRT = dia seguinte em UTC
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <DashboardContext.Provider value={{ selectedDate, setSelectedDate, refreshTrigger, triggerRefresh }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}