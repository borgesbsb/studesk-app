import { getProgressoCiclo } from "@/interface/actions/dashboard/get-progresso-ciclo";
import { getEvolucaoCiclo } from "@/interface/actions/dashboard/get-evolucao-ciclo";
import { getDisciplinasCiclo } from "@/interface/actions/dashboard/get-disciplinas-ciclo";
import { getContribuicoesEstudo } from "@/interface/actions/dashboard/get-contribuicoes-estudo";
import { CicloStatsCards } from "@/components/dashboard/ciclo-stats-cards";
import { DisciplinasCicloCard } from "@/components/dashboard/disciplinas-ciclo-card";
import { ContribuicoesCard } from "@/components/dashboard/contribuicoes-card";
import { EvolucaoHorasCard } from "@/components/hoje/evolucao-horas-card";
import { EvolucaoQuestoesCard } from "@/components/hoje/evolucao-questoes-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { HourglassCard } from "@/components/dashboard/hourglass-card";

export default async function DashboardPage() {
  const [progresso, evolucao, disciplinas, contribuicoes] = await Promise.all([
    getProgressoCiclo(),
    getEvolucaoCiclo(),
    getDisciplinasCiclo(),
    getContribuicoesEstudo(),
  ]);

  return (
    <div className="h-full p-3">
      <DashboardHeader />
      <div
        className="h-full grid gap-3"
        style={{
          gridTemplateColumns: '8fr 2fr',
          gridTemplateRows: 'auto auto auto 2fr',
        }}
      >
        {/* Linha 1, Col 1: Stats */}
        <div>
          <CicloStatsCards progresso={progresso} />
        </div>

        {/* Linhas 1-3, Col 2: Ampulheta */}
        <div style={{ gridRow: '1/4', gridColumn: '2' }}>
          <HourglassCard progresso={progresso} />
        </div>

        {/* Linha 2, Col 1: Contribuições */}
        <div className="min-h-0">
          <ContribuicoesCard contribuicoes={contribuicoes} />
        </div>

        {/* Linha 3, Col 1: Disciplinas */}
        <div className="min-h-0">
          <DisciplinasCicloCard disciplinas={disciplinas} />
        </div>

        {/* Linha 4, Col 1-2: Gráficos lado a lado com mesma largura */}
        <div className="min-h-0 grid grid-cols-2 gap-3" style={{ gridColumn: '1 / -1' }}>
          <EvolucaoHorasCard evolucao={evolucao} />
          <EvolucaoQuestoesCard evolucao={evolucao} />
        </div>
      </div>
    </div>
  );
}
