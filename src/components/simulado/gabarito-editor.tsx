'use client'

import { useState } from 'react'
import { type GabaritoExtraido } from '@/application/services/gabarito.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Imports não usados removidos

interface GabaritoEditorProps {
  oficial: GabaritoExtraido
  usuario: GabaritoExtraido
  onConfirm: (oficial: GabaritoExtraido, usuario: GabaritoExtraido) => void
  onCancel: () => void
}

export function GabaritoEditor({ oficial: oficialInicial, usuario: usuarioInicial, onConfirm, onCancel }: GabaritoEditorProps) {
  const [oficial, setOficial] = useState(oficialInicial)
  const [usuario, setUsuario] = useState(usuarioInicial)

  const atualizarOficial = (numero: number, novaResposta: string) => {
    setOficial(prev => ({
      ...prev,
      questoes: prev.questoes.map(q =>
        q.numero === numero ? { ...q, resposta: novaResposta.toUpperCase() } : q
      )
    }))
  }

  const atualizarUsuario = (numero: number, novaResposta: string) => {
    setUsuario(prev => ({
      ...prev,
      questoes: prev.questoes.map(q =>
        q.numero === numero ? { ...q, resposta: novaResposta.toUpperCase() } : q
      )
    }))
  }

  const validarResposta = (resposta: string): boolean => {
    const respostaUpper = resposta.toUpperCase()
    return ['A', 'B', 'C', 'D', 'E', 'N', 'ANULADA'].includes(respostaUpper)
  }

  // Juntar questões de ambos gabaritos
  const questoesMap = new Map<number, { oficial: string; usuario: string }>()

  oficial.questoes.forEach(q => {
    questoesMap.set(q.numero, { oficial: q.resposta, usuario: 'N' })
  })

  usuario.questoes.forEach(q => {
    const existing = questoesMap.get(q.numero)
    if (existing) {
      existing.usuario = q.resposta
    } else {
      questoesMap.set(q.numero, { oficial: 'N', usuario: q.resposta })
    }
  })

  const questoes = Array.from(questoesMap.entries())
    .map(([numero, respostas]) => ({ numero, ...respostas }))
    .sort((a, b) => a.numero - b.numero)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Inserir Suas Respostas</h3>
            <p className="text-sm text-gray-600 mt-1">
              Digite suas respostas para cada questão. Use A, B, C, D ou E. Deixe N para questões não respondidas.
            </p>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-700">Respostas válidas: A, B, C, D, E</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-400"></div>
            <span className="text-gray-700">Não respondida: N</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-500"></div>
            <span className="text-gray-700">Anulada: ANULADA</span>
          </div>
        </div>
      </div>

      {/* Grid de questões com botões de opções */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {questoes.map(({ numero, usuario: respostaUsuario }) => {
            const opcoes = ['A', 'B', 'C', 'D', 'E']

            return (
              <div
                key={numero}
                className={`p-4 rounded-lg border-2 transition-all ${
                  respostaUsuario !== 'N'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-900">Questão {numero}</span>
                  {respostaUsuario !== 'N' && (
                    <button
                      onClick={() => atualizarUsuario(numero, 'N')}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {opcoes.map((opcao) => (
                    <button
                      key={opcao}
                      onClick={() => atualizarUsuario(numero, opcao)}
                      className={`flex-1 h-12 rounded-md font-bold text-lg transition-all ${
                        respostaUsuario === opcao
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer com estatísticas e ações */}
      <div className="px-6 py-4 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-600">Total de questões:</span>
              <span className="ml-2 font-semibold text-gray-900">{questoes.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Respondidas:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {questoes.filter(q => q.usuario !== 'N').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Vazias:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {questoes.filter(q => q.usuario === 'N').length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(oficial, usuario)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={questoes.filter(q => q.usuario !== 'N').length === 0}
            >
              Confirmar e Processar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
