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
    
    if (!disciplinas || disciplinas.length === 0) {
      toast.error('Nenhuma disciplina selecionada!')
      return
    }

    try {
      console.log('🚀 Modal: iniciando handleConfirmarCiclo', { planoId, proximaSemana, disciplinas })
      // Calcular datas para a semana (início na segunda-feira)
      const hoje = new Date()
      const dataInicio = new Date(hoje)
      const diaSemana = hoje.getDay() // 0 = domingo, 1 = segunda
      
      // Se hoje é segunda (1), usar hoje. Senão, próxima segunda
      if (diaSemana === 1) {
        // Hoje é segunda, usar hoje mesmo
      } else if (diaSemana === 0) {
        // Hoje é domingo, próxima segunda é amanhã (+1)
        dataInicio.setDate(hoje.getDate() + 1)
      } else {
        // Qualquer outro dia, calcular próxima segunda
        const diasParaSegunda = 8 - diaSemana
        dataInicio.setDate(hoje.getDate() + diasParaSegunda)
      }
      
      const dataFim = new Date(dataInicio)
      dataFim.setDate(dataInicio.getDate() + 6) // 7 dias depois
      
      const dataInicioStr = dataInicio.toISOString().split('T')[0]
      const dataFimStr = dataFim.toISOString().split('T')[0]

      console.log('📅 Modal: datas calculadas', { dataInicioStr, dataFimStr })
      const resultado = await adicionarCicloAoPlano(planoId, proximaSemana, disciplinas, dataInicioStr, dataFimStr)
      console.log('✅ Modal: resultado da action', resultado)
      
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