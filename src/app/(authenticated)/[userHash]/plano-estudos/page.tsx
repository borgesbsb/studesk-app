"use client"

import { PlanosEstudoGrid } from '@/components/plano-estudos/planos-estudos-grid'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useHeader } from "@/contexts/header-context"
import { useUserHash } from "@/contexts/user-hash-context"
import { useEffect } from "react"

export default function PlanosEstudoPage() {
  const { setTitle } = useHeader()
  const { hash } = useUserHash()

  useEffect(() => {
    setTitle("Planos de Estudo")
  }, [setTitle])

  return (
    <div className="space-y-6">
      {/* Header com botão */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meus Planos de Estudo</h2>
          <p className="text-gray-500 text-sm mt-1">
            Visualize e gerencie todos os seus planos de estudo
          </p>
        </div>
        <Link href={`/${hash}/plano-estudos/criar`}>
          <Button size="lg" className="shadow-sm">
            <Plus className="h-5 w-5 mr-2" />
            Novo Plano
          </Button>
        </Link>
      </div>

      {/* Grid de planos */}
      <PlanosEstudoGrid />
    </div>
  )
}
