"use client";

import React, { createContext, useContext, useState } from "react";

interface DashboardContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <DashboardContext.Provider value={{ selectedDate, setSelectedDate }}>
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