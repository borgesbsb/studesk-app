"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface PerfilFormProps {
  user: {
    id: string
    name: string | null
    email: string
    hash: string
  }
}

export function PerfilForm({ user }: PerfilFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user.name || "")
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        throw new Error("Erro ao atualizar perfil")
      }

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error("Erro ao salvar:", error)
      alert("Erro ao atualizar perfil. Tente novamente.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Editar Perfil</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Nome
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isEditing}
            className="w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Digite seu nome"
          />
        </div>

        <div className="flex gap-3">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              Editar Perfil
            </Button>
          ) : (
            <>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setName(user.name || "")
                }}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
