import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Redirecionar para o dashboard do usuário com seu hash
  redirect(`/${session.user.hash}/hoje`)
}
