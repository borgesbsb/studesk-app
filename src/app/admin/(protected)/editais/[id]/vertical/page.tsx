import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminBuscarEdital } from '@/interface/actions/admin/editais'
import { EditalVertical } from '@/components/admin/editais/edital-vertical'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminEditalVerticalPage({ params }: Props) {
  const { id } = await params
  const res = await adminBuscarEdital(id)

  if (!res.success || !res.data) notFound()

  const edital = res.data

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 print:hidden">
        <Link href={`/admin/editais/${edital.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-slate-700">Edital Verticalizado</h1>
      </div>

      <EditalVertical edital={edital as any} />
    </div>
  )
}
