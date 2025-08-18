'use client'

import { useState, useEffect } from 'react'
import { WizardAdicionarCiclo } from './wizard-adicionar-ciclo'
import { getPlanoEstudoById } from '@/interface/actions/plano-estudo/get-by-id'
import { adicionarCicloAoPlano } from '@/interface/actions/plano-estudo/adicionar-ciclo'
import { DisciplinaPlanejada } from './planejamento-disciplinas'
import { toast } from 'sonner'

interface AdicionarCicloModalProps {
  planoId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AdicionarCicloModal({ planoId, isOpen, onClose, onSuccess }: AdicionarCicloModalProps) {
  const [proximaSemana, setProximaSemana] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && planoId) {
      calcularProximaSemana()
    }
  }, [isOpen, planoId])

  const calcularProximaSemana = async () => {
    if (!planoId) return
    
    setLoading(true)
    try {
      const resultado = await getPlanoEstudoById(planoId)
      if (resultado.success && resultado.data) {
        const proximaSemanNumber = Math.max(...resultado.data.semanas.map(s => s.numeroSemana), 0) + 1
        setProximaSemana(proximaSemanNumber)
      }
    } catch (error) {
      console.error('Erro ao carregar plano:', error)
      setProximaSemana(1)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmarCiclo = async (disciplinas: DisciplinaPlanejada[]) => {
    if (!planoId) return

    try {
      const resultado = await adicionarCicloAoPlano(planoId, proximaSemana, disciplinas)
      
      if (resultado.success) {
        toast.success(`Ciclo ${proximaSemana} configurado com ${disciplinas.length} disciplinas!`)
        onSuccess()
        onClose()
      } else {
        toast.error(resultado.error || 'Erro ao adicionar ciclo')
      }
    } catch (error) {
      console.error('Erro ao adicionar ciclo:', error)
      toast.error('Erro inesperado ao adicionar ciclo')
    }
  }

  const handleClose = () => {
    setProximaSemana(1)
    onClose()
  }

  if (loading) {
    return null // O wizard mostrará seu próprio loading
  }

  return (
    <WizardAdicionarCiclo
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirmarCiclo}
      semanaNumero={proximaSemana}
    />
  )
}