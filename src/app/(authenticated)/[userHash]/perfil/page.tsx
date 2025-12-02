import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PerfilForm } from "@/components/perfil/perfil-form"

export default async function PerfilPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id
    },
    select: {
      id: true,
      name: true,
      email: true,
      hash: true,
      createdAt: true,
    }
  })

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas informações pessoais e configurações da conta
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Informações da Conta</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nome
                  </label>
                  <p className="text-base mt-1">{user.name || "Não informado"}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="text-base mt-1">{user.email}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Hash do Usuário
                  </label>
                  <p className="text-base mt-1 font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                    {user.hash}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Membro desde
                  </label>
                  <p className="text-base mt-1">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PerfilForm user={user} />
      </div>
    </div>
  )
}
