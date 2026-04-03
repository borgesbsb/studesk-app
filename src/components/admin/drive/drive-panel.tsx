'use client'

import { useState } from 'react'
import { HardDrive, ChevronDown, ChevronRight } from 'lucide-react'
import { DriveTree } from './drive-tree'

const ROOT_FOLDER_ID = '1lgjdvbwR5bN7kJmLmE6imRXadjecWGTM'

export function DrivePanel() {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        onClick={() => setAberto(v => !v)}
      >
        <HardDrive className="h-4 w-4 text-slate-500" />
        <span className="flex-1 text-left">Materiais no Google Drive</span>
        {aberto
          ? <ChevronDown className="h-4 w-4 text-slate-400" />
          : <ChevronRight className="h-4 w-4 text-slate-400" />
        }
      </button>

      {aberto && (
        <div className="border-t border-slate-100 px-3 py-3 max-h-[520px] overflow-y-auto">
          <DriveTree rootFolderId={ROOT_FOLDER_ID} />
        </div>
      )}
    </div>
  )
}
