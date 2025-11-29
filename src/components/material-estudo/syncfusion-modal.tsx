"use client"

import * as React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import SyncfusionPdfViewer from '@/components/pdf/SyncfusionPdfViewer'
import { Button } from '@/components/ui/button'

interface SyncfusionPdfModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    pdfUrl: string
    materialNome?: string
    paginaProgresso?: number
}

export default function SyncfusionPdfModal({
    open,
    onOpenChange,
    pdfUrl,
    materialNome,
    paginaProgresso = 1
}: SyncfusionPdfModalProps) {
    if (!open || !pdfUrl) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 border-0 rounded-none bg-gray-100">
                <DialogHeader className="sr-only">
                    <DialogTitle>Visualizador PDF - Syncfusion</DialogTitle>
                    <DialogDescription>
                        Visualize e navegue pelo documento PDF usando Syncfusion
                    </DialogDescription>
                </DialogHeader>

                {/* Container principal em tela cheia */}
                <div className="flex flex-col w-full h-full bg-white relative">

                    {/* Header fixo com controles */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 shadow-sm flex-shrink-0 z-50 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            {/* Botão fechar */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full p-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </Button>

                            <div className="h-4 w-px bg-gray-300" />

                            {/* Badge POC */}
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs text-blue-700 font-medium">
                                    Syncfusion POC
                                </span>
                            </div>

                            {/* Nome do Material */}
                            {materialNome && (
                                <>
                                    <div className="h-4 w-px bg-gray-300" />
                                    <h2 className="text-sm font-medium text-gray-900">
                                        {materialNome}
                                    </h2>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Informações adicionais podem ser adicionadas aqui */}
                        </div>
                    </div>

                    {/* Container do PDF */}
                    <div className="flex-1 bg-white overflow-hidden relative">
                        <SyncfusionPdfViewer
                            pdfUrl={pdfUrl}
                            paginaProgresso={paginaProgresso}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
