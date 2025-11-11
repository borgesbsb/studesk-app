"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdicionarDisciplinaModal } from "@/components/disciplina/adicionar-disciplina-modal"
import { DisciplinasTable } from "@/components/disciplina/disciplinas-table"
import { Input } from "@/components/ui/input"
import { GraduationCap, BookOpen, Target, Users, Search } from "lucide-react"
import { useState } from "react"

export default function DisciplinasPage() {
  const [termoPesquisa, setTermoPesquisa] = useState('')
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      <div className="container py-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-gray-100" />
          
          <div className="relative p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-gray-600" />
                  </div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Gerenciar Disciplinas
                  </h1>
                </div>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Todas as disciplinas do sistema
                </p>
              </div>
              
            </div>
          </div>
        </div>

        {/* Content */}
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <BookOpen className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Todas as Disciplinas
                  </CardTitle>
                  <p className="text-gray-500 text-sm mt-1">
                    Organize suas disciplinas e acompanhe o progresso
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                <Users className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Área de estudos
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Barra de pesquisa e botão adicionar */}
            <div className="flex items-center justify-between mb-6">
              <AdicionarDisciplinaModal 
                onSuccess={() => {
                  window.location.reload()
                }}
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar disciplinas..."
                  value={termoPesquisa}
                  onChange={(e) => setTermoPesquisa(e.target.value)}
                  className="pl-10 w-80 h-10 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg shadow-sm transition-all duration-200"
                />
              </div>
            </div>
            
            <DisciplinasTable termoPesquisa={termoPesquisa} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}