'use client'

import { useState, useEffect, useCallback } from 'react'
import { Folder, FolderOpen, FileText, Video, ChevronRight, ChevronDown, Loader2, HardDrive, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: string | null
  modifiedTime: string | null
  isFolder: boolean
}

interface TreeNode {
  file: DriveFile
  children: TreeNode[] | null  // null = não carregado, [] = vazio
  loading: boolean
  expanded: boolean
}

interface DriveTreeProps {
  rootFolderId: string
  onSelect?: (file: DriveFile) => void
  onSelectFolder?: (folder: DriveFile) => void
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/vnd.google-apps.folder') return null
  if (mimeType.startsWith('video/')) return <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
  return <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
}

function formatSize(size: string | null) {
  if (!size) return ''
  const n = parseInt(size)
  if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  if (n > 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${n} B`
}

function TreeNodeRow({
  node,
  depth,
  onToggle,
  onSelect,
  onSelectFolder,
}: {
  node: TreeNode
  depth: number
  onToggle: (id: string) => void
  onSelect?: (file: DriveFile) => void
  onSelectFolder?: (folder: DriveFile) => void
}) {
  const { file } = node

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer group text-sm`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (file.isFolder) onToggle(file.id)
          else onSelect?.(file)
        }}
      >
        {/* Chevron para pastas */}
        {file.isFolder ? (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {node.loading
              ? <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
              : node.expanded
                ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            }
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Ícone */}
        {file.isFolder
          ? node.expanded
            ? <FolderOpen className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
            : <Folder className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
          : <FileIcon mimeType={file.mimeType} />
        }

        {/* Nome */}
        <span className={`flex-1 truncate ${file.isFolder ? 'font-medium text-slate-700' : 'text-slate-600'}`}>
          {file.name}
        </span>

        {/* Botão selecionar pasta */}
        {file.isFolder && onSelectFolder && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onSelectFolder(file) }}
            className="opacity-0 group-hover:opacity-100 text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-300 rounded px-1.5 py-0.5 shrink-0 transition-opacity"
          >
            Selecionar
          </button>
        )}

        {/* Tamanho */}
        {!file.isFolder && file.size && (
          <span className="text-xs text-slate-400 shrink-0">{formatSize(file.size)}</span>
        )}
      </div>

      {/* Filhos */}
      {file.isFolder && node.expanded && node.children && (
        <div>
          {node.children.length === 0 ? (
            <div className="text-xs text-slate-400 italic" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
              Pasta vazia
            </div>
          ) : (
            node.children.map(child => (
              <TreeNodeRow
                key={child.file.id}
                node={child}
                depth={depth + 1}
                onToggle={onToggle}
                onSelect={onSelect}
                onSelectFolder={onSelectFolder}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function DriveTree({ rootFolderId, onSelect, onSelectFolder }: DriveTreeProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(true)

  const fetchFolder = useCallback(async (folderId: string): Promise<DriveFile[]> => {
    const res = await fetch(`/api/admin/google-drive/browse?folderId=${folderId}`)
    if (res.status === 401) { setConnected(false); throw new Error('Drive não conectado') }
    if (!res.ok) throw new Error('Erro ao carregar pasta')
    const data = await res.json()
    return data.files as DriveFile[]
  }, [])

  // Carrega raiz ao montar
  useEffect(() => {
    setLoading(true)
    fetchFolder(rootFolderId)
      .then(files => {
        setNodes(files.map(f => ({ file: f, children: null, loading: false, expanded: false })))
        setConnected(true)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [rootFolderId, fetchFolder])

  const toggleNode = useCallback(async (fileId: string) => {
    // Função recursiva para atualizar o nó
    const update = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
      return Promise.all(nodes.map(async node => {
        if (node.file.id === fileId) {
          if (node.expanded) return { ...node, expanded: false }
          if (node.children !== null) return { ...node, expanded: true }

          // Carrega filhos
          const updated = { ...node, loading: true, expanded: true }
          setNodes(prev => updateInTree(prev, fileId, updated))

          try {
            const files = await fetchFolder(fileId)
            const withChildren: TreeNode = {
              ...updated,
              loading: false,
              children: files.map(f => ({ file: f, children: null, loading: false, expanded: false })),
            }
            setNodes(prev => updateInTree(prev, fileId, withChildren))
          } catch {
            setNodes(prev => updateInTree(prev, fileId, { ...updated, loading: false, expanded: false }))
          }
          return updated
        }
        if (node.children) {
          return { ...node, children: await update(node.children) }
        }
        return node
      }))
    }
    setNodes(prev => { update(prev); return prev })
  }, [fetchFolder])

  const connectDrive = async () => {
    const res = await fetch('/api/admin/google-drive/auth')
    const data = await res.json()
    if (!data.authUrl) return

    const popup = window.open(data.authUrl, 'drive-auth', 'width=500,height=600')
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ADMIN_DRIVE_SUCCESS') {
        window.removeEventListener('message', handler)
        popup?.close()
        setConnected(true)
        setError(null)
        setLoading(true)
        fetchFolder(rootFolderId)
          .then(files => setNodes(files.map(f => ({ file: f, children: null, loading: false, expanded: false }))))
          .finally(() => setLoading(false))
      }
    }
    window.addEventListener('message', handler)
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
        <HardDrive className="h-8 w-8 text-slate-300" />
        <p className="text-sm">Google Drive não conectado</p>
        <Button size="sm" onClick={connectDrive}>
          Conectar Google Drive
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-slate-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-red-500 text-sm">
        <p>{error}</p>
        <Button size="sm" variant="outline" onClick={() => { setError(null); setLoading(true); fetchFolder(rootFolderId).then(files => setNodes(files.map(f => ({ file: f, children: null, loading: false, expanded: false })))).finally(() => setLoading(false)) }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="font-mono text-xs select-none">
      {nodes.map(node => (
        <TreeNodeRow key={node.file.id} node={node} depth={0} onToggle={toggleNode} onSelect={onSelect} onSelectFolder={onSelectFolder} />
      ))}
      {nodes.length === 0 && <p className="text-slate-400 text-xs py-4 text-center">Pasta vazia</p>}
    </div>
  )
}

// Atualiza um nó pelo id em qualquer nível da árvore
function updateInTree(nodes: TreeNode[], id: string, updated: TreeNode): TreeNode[] {
  return nodes.map(n => {
    if (n.file.id === id) return updated
    if (n.children) return { ...n, children: updateInTree(n.children, id, updated) }
    return n
  })
}
