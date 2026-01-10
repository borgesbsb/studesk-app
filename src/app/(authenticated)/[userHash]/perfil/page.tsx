"use client"

import { useEffect } from "react"
import { useHeader } from "@/contexts/header-context"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { GoogleDriveConfig } from "@/components/configuracoes/google-drive-config"

export default function PerfilPage() {
  const { setTitle } = useHeader()
  const { data: session } = useSession()

  useEffect(() => {
    setTitle("Meu Perfil")
  }, [setTitle])

  if (!session?.user) {
    return null
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações da conta
        </p>
      </div>

      <Separator />

      {/* Informações da Conta */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
          <CardDescription>
            Dados pessoais e informações do usuário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Nome
            </label>
            <p className="text-base mt-1">{session.user.name || "Não informado"}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <p className="text-base mt-1">{session.user.email}</p>
          </div>

          {session.user.hash && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Hash do Usuário
              </label>
              <p className="text-base mt-1 font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                {session.user.hash}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integrações */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
          <CardDescription>
            Configure conexões com serviços externos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleDriveConfig />
        </CardContent>
      </Card>
    </div>
  )
}
