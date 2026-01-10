'use client'

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import { MobileTextReader } from '@/components/reader/MobileTextReader'

interface ReaderPageProps {
  params: Promise<{ materialId: string }>
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const { materialId } = use(params)
  const searchParams = useSearchParams()
  const initialPage = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined

  return <MobileTextReader materialId={materialId} initialPage={initialPage} />
}
