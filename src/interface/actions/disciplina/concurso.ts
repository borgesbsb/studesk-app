"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"

export interface DisciplinaConcursoData {
  ordem?: number
  peso?: number
  questoes?: number
  pontos?: number
}

export async function adicionarDisciplinaAoConcurso(
  concursoId: string,
  disciplinaId: string,
  dados: DisciplinaConcursoData
) {
  try {
    const relacao = await DisciplinaService.adicionarDisciplinaAoConcurso(
      concursoId,
      disciplinaId,
      dados
    )
    return { success: true, data: relacao }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function removerDisciplinaDoConcurso(
  concursoId: string,
  disciplinaId: string
) {
  try {
    await DisciplinaService.removerDisciplinaDoConcurso(concursoId, disciplinaId)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function atualizarDisciplinaNoConcurso(
  concursoId: string,
  disciplinaId: string,
  dados: DisciplinaConcursoData
) {
  try {
    const relacao = await DisciplinaService.atualizarDisciplinaNoConcurso(
      concursoId,
      disciplinaId,
      dados
    )
    return { success: true, data: relacao }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function listarDisciplinasDoConcurso(concursoId: string) {
  try {
    const disciplinas = await DisciplinaService.listarDisciplinasDoConcurso(concursoId)
    return { success: true, data: disciplinas }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 