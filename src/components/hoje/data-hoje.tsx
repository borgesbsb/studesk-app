"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { format, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useDashboard } from "@/contexts/dashboard-context"

export function DataHoje() {
  const { selectedDate } = useDashboard()
  const agora = new Date()
  
  const dia = format(selectedDate, "d", { locale: ptBR })
  const diaDaSemana = format(selectedDate, "EEEE", { locale: ptBR })
  const mesAno = format(selectedDate, "MMMM yyyy", { locale: ptBR })
  const hora = format(agora, "HH:mm", { locale: ptBR })
  const isSelectedToday = isToday(selectedDate)

  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Cabeçalho do calendário */}
        <CardHeader className="text-center pb-4 bg-primary text-primary-foreground rounded-t-lg">
          <h3 className="text-lg font-semibold capitalize">{mesAno}</h3>
        </CardHeader>
        
        {/* Corpo principal - Dia grande como calendário */}
        <div className="flex-1 flex items-center justify-center p-2 overflow-visible">
          <div className="text-center space-y-4 w-full h-full flex flex-col justify-center overflow-visible">
            {/* Dia em número muito grande com estilo especial */}
            <div className="relative flex items-center justify-center w-full overflow-visible">
              <span className="
                text-[40vw] sm:text-[30vw] md:text-[20vw] lg:text-[15vw] xl:text-[12vw]
                font-black 
                bg-gradient-to-br from-primary via-primary to-primary/70
                bg-clip-text text-transparent
                drop-shadow-2xl
                leading-[0.8]
                tracking-tighter
                select-none
                [text-shadow:_0_8px_16px_rgb(0_0_0_/_25%)]
                hover:scale-105 transition-transform duration-300
                flex items-center justify-center
                w-full
                overflow-visible
              " style={{fontSize: 'min(35vw, 50vh, 400px)', lineHeight: '0.8'}}>
                {dia}
              </span>
              {/* Shadow backdrop para mais destaque */}
              <span className="
                absolute top-2 left-2 -z-10
                text-[40vw] sm:text-[30vw] md:text-[20vw] lg:text-[15vw] xl:text-[12vw]
                font-black 
                text-primary/20
                leading-[0.8]
                tracking-tighter
                select-none
                overflow-visible
              " style={{fontSize: 'min(35vw, 50vh, 400px)', lineHeight: '0.8'}}>
                {dia}
              </span>
            </div>
            
            {/* Dia da semana */}
            <h2 className="text-3xl md:text-4xl font-semibold capitalize text-muted-foreground">
              {diaDaSemana}
            </h2>
          </div>
        </div>
        
        {/* Rodapé com horário */}
        <div className="p-6 border-t bg-muted/20">
          <div className="flex items-center justify-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p className="text-xl font-mono font-semibold text-muted-foreground">
              {isSelectedToday ? hora : "--:--"}
            </p>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            {isSelectedToday ? "Bom estudo! 📚" : `Programação para ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })} 📅`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}