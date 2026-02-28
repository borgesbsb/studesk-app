"use client"

import { PlanosEstudoGrid } from '@/components/plano-estudos/planos-estudos-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, BookOpen } from 'lucide-react'
import { useHeader } from "@/contexts/header-context"
import { useEffect } from "react"

export default function PlanosEstudoPage() {
  const { setTitle } = useHeader()

  useEffect(() => {
    setTitle("Planos de Estudo")
  }, [setTitle])

  return (
    <div className="h-full md:h-auto overflow-y-auto md:overflow-visible">
      <div className="space-y-6 pb-6 md:pb-0 pt-6 px-6">
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Meus Planos de Estudo
                  </CardTitle>
                  <p className="text-gray-500 text-sm mt-1">
                    Visualize e gerencie todos os seus planos de estudo
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                <BookOpen className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Planejamento
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <PlanosEstudoGrid />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
