"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FileText, Search } from "lucide-react"
import { useHeader } from "@/contexts/header-context"
import { EditaisTable } from "@/components/edital/editais-table"

export default function EditaisPage() {
  const [termoPesquisa, setTermoPesquisa] = useState("")
  const [totalEditais, setTotalEditais] = useState(0)
  const { setTitle } = useHeader()

  useEffect(() => {
    setTitle("Editais")
    return () => setTitle("Dashboard")
  }, [setTitle])

  return (
    <div className="h-full md:h-auto overflow-y-auto md:overflow-visible">
      <div className="space-y-6 pb-6 md:pb-0 pt-6 px-6">
        {/* Métrica */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Editais</p>
                  <h3 className="text-3xl font-bold text-card-foreground mt-2">{totalEditais}</h3>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="pb-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-card-foreground">
                  Editais
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Editais disponíveis com as disciplinas cobradas
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex mb-6">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar editais..."
                  value={termoPesquisa}
                  onChange={(e) => setTermoPesquisa(e.target.value)}
                  className="pl-10 w-full h-10 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg shadow-sm transition-all duration-200"
                />
              </div>
            </div>
            <EditaisTable
              termoPesquisa={termoPesquisa}
              onCountChange={setTotalEditais}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
