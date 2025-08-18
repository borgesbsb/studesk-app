import { ScrollArea } from "@/components/ui/scroll-area"

const activities = [
  {
    id: 1,
    type: "questão",
    subject: "Direito Constitucional",
    detail: "Respondeu corretamente",
    time: "há 5 minutos",
  },
  {
    id: 2,
    type: "pdf",
    subject: "Direito Administrativo",
    detail: "Iniciou a leitura",
    time: "há 30 minutos",
  },
  {
    id: 3,
    type: "questão",
    subject: "Português",
    detail: "Respondeu incorretamente",
    time: "há 1 hora",
  },
  {
    id: 4,
    type: "pdf",
    subject: "Matemática",
    detail: "Concluiu a leitura",
    time: "há 2 horas",
  },
]

export function RecentActivity() {
  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center justify-between border-b pb-4 last:border-0"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                {activity.subject}
              </p>
              <p className="text-sm text-muted-foreground">
                {activity.detail}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {activity.time}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
} 