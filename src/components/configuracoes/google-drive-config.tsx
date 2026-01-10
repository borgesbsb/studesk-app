"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Cloud, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function GoogleDriveConfig() {
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/google-drive/files')
      setIsConnected(response.ok)
    } catch (error) {
      console.error('Erro ao verificar conexão:', error)
      setIsConnected(false)
    } finally {
      setIsChecking(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)

    try {
      // Buscar URL de autenticação
      const response = await fetch('/api/google-drive/auth')
      const data = await response.json()

      if (!data.authUrl) {
        throw new Error('URL de autenticação não recebida')
      }

      // Abrir popup de autenticação
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const authWindow = window.open(
        data.authUrl,
        'Google Drive Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Listener para mensagem do callback
      const messageHandler = async (event: MessageEvent) => {
        if (event.data.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler)
          toast.success('Google Drive conectado com sucesso!')
          setIsConnected(true)
          await checkConnection()
        } else if (event.data.type === 'GOOGLE_DRIVE_AUTH_ERROR') {
          window.removeEventListener('message', messageHandler)
          toast.error(event.data.error || 'Erro ao conectar com Google Drive')
        }
      }

      window.addEventListener('message', messageHandler)

      // Verificar se popup foi fechado manualmente
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          setIsConnecting(false)
        }
      }, 500)

    } catch (error) {
      console.error('Erro ao conectar Google Drive:', error)
      toast.error('Erro ao iniciar conexão com Google Drive')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch('/api/google-drive/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erro ao desconectar')
      }

      toast.success('Google Drive desconectado com sucesso')
      setIsConnected(false)
      setShowDisconnectDialog(false)
    } catch (error) {
      console.error('Erro ao desconectar:', error)
      toast.error('Erro ao desconectar Google Drive')
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isChecking) {
    return (
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="text-sm text-muted-foreground">Verificando conexão...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
            <Cloud className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold">Google Drive</h3>
            <div className="flex items-center gap-2 mt-1">
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-muted-foreground">Não conectado</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          {isConnected ? (
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(true)}
              disabled={isDisconnecting}
              className="text-red-600 hover:text-red-700 hover:border-red-600"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desconectar
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  Conectar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Descrição */}
      <p className="text-sm text-muted-foreground">
        {isConnected
          ? 'Sua conta está conectada ao Google Drive. Você pode importar PDFs diretamente do seu drive.'
          : 'Conecte sua conta do Google Drive para importar PDFs diretamente sem precisar fazer upload manual.'}
      </p>

      {/* Dialog de confirmação */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Google Drive?</AlertDialogTitle>
            <AlertDialogDescription>
              Você precisará autorizar novamente para importar arquivos do Google Drive.
              Esta ação não afeta os arquivos já importados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700"
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
