'use client'

import { useState } from 'react'
import { HardDrive, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GoogleDriveConfigProps {
  conectado: boolean
}

export function GoogleDriveConfig({ conectado: inicial }: GoogleDriveConfigProps) {
  const [conectado, setConectado] = useState(inicial)
  const [desconectando, setDesconectando] = useState(false)

  const conectar = async () => {
    const res = await fetch('/api/admin/google-drive/auth')
    const data = await res.json()
    if (!data.authUrl) return

    const popup = window.open(data.authUrl, 'drive-auth', 'width=500,height=600')
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ADMIN_DRIVE_SUCCESS') {
        window.removeEventListener('message', handler)
        popup?.close()
        setConectado(true)
      }
    }
    window.addEventListener('message', handler)
  }

  const desconectar = async () => {
    setDesconectando(true)
    try {
      await fetch('/api/admin/google-drive/disconnect', { method: 'POST' })
      setConectado(false)
    } finally {
      setDesconectando(false)
    }
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <HardDrive className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Google Drive</h3>
          <p className="text-sm text-slate-500">Acesso aos materiais armazenados no Drive</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {conectado ? (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-slate-400">
              <XCircle className="h-4 w-4" />
              Não conectado
            </span>
          )}
        </div>
      </div>

      <div className="border-t pt-4 flex items-center gap-3">
        {conectado ? (
          <>
            <Button variant="outline" size="sm" onClick={conectar}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reconectar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={desconectar}
              disabled={desconectando}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {desconectando ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Desconectar
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={conectar}>
            <HardDrive className="h-3.5 w-3.5 mr-1.5" />
            Conectar Google Drive
          </Button>
        )}
      </div>
    </div>
  )
}
