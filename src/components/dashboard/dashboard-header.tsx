"use client";

import { useHeader } from "@/contexts/header-context";
import { useEffect } from "react";

export function DashboardHeader() {
  const { setTitle } = useHeader();

  useEffect(() => {
    setTitle("Dashboard");
  }, [setTitle]);

  return null;
}
