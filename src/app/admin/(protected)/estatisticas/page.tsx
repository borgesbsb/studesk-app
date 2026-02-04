import { getReadingStatistics, getQuestionsStatistics } from '@/interface/actions/admin/statistics'
import { EstatisticasClient } from './estatisticas-client'

export default async function EstatisticasPage() {
  const [readingResult, questionsResult] = await Promise.all([
    getReadingStatistics(),
    getQuestionsStatistics()
  ])

  if (readingResult.error || !readingResult.statistics) {
    return (
      <div className="p-8">
        <div className="text-red-600">Erro ao carregar estatísticas de leitura</div>
      </div>
    )
  }

  if (questionsResult.error || !questionsResult.statistics) {
    return (
      <div className="p-8">
        <div className="text-red-600">Erro ao carregar estatísticas de questões</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Estatísticas Detalhadas</h1>
        <p className="text-slate-600 mt-1">Análise completa de leitura, questões e desempenho por usuário</p>
      </div>

      <EstatisticasClient
        reading={readingResult.statistics}
        questions={questionsResult.statistics}
      />
    </div>
  )
}
