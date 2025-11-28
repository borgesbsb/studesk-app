"use client"

import * as React from 'react';
import { createPortal } from 'react-dom';
import { PdfViewerComponent, Toolbar, Magnification, Navigation, LinkAnnotation, BookmarkView, ThumbnailView, Print, TextSelection, TextSearch, FormFields, FormDesigner, Inject, Annotation, ToolbarSettingsModel, CustomToolbarItemModel } from '@syncfusion/ej2-react-pdfviewer';

// Import Syncfusion styles
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-notifications/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import '@syncfusion/ej2-react-pdfviewer/styles/material.css';

interface SyncfusionPdfViewerProps {
    pdfUrl: string;
    paginaProgresso?: number;
    onPageChange?: (page: number) => void;
}

type ReadingMode = 'normal' | 'sepia' | 'night' | 'gray' | 'green';

export default function SyncfusionPdfViewer({ pdfUrl, paginaProgresso = 1, onPageChange }: SyncfusionPdfViewerProps) {
    const [resourceUrl, setResourceUrl] = React.useState("");
    const [absolutePdfUrl, setAbsolutePdfUrl] = React.useState("");
    const [brightness, setBrightness] = React.useState(100);
    const [contrast, setContrast] = React.useState(100);
    const [showDisplaySettings, setShowDisplaySettings] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [readingMode, setReadingMode] = React.useState<ReadingMode>('normal');
    const [isProcessingBlob, setIsProcessingBlob] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        setResourceUrl(`${window.location.origin}/ej2-pdfviewer-lib`);

        // Convert Blob URLs to Base64 data URLs for Syncfusion compatibility
        const processPdfUrl = async () => {
            if (!pdfUrl) {
                setAbsolutePdfUrl('');
                return;
            }

            // Check if it's a blob URL
            if (pdfUrl.startsWith('blob:')) {
                console.log('🔄 Convertendo Blob URL para Base64...');
                setIsProcessingBlob(true);
                try {
                    const response = await fetch(pdfUrl);
                    const blob = await response.blob();
                    const reader = new FileReader();

                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        console.log('✅ Blob convertido para Base64 com sucesso');
                        setAbsolutePdfUrl(base64data);
                        setIsProcessingBlob(false);
                    };

                    reader.onerror = (error) => {
                        console.error('❌ Erro ao converter Blob para Base64:', error);
                        setAbsolutePdfUrl(pdfUrl); // Fallback to original URL
                        setIsProcessingBlob(false);
                    };

                    reader.readAsDataURL(blob);
                } catch (error) {
                    console.error('❌ Erro ao processar Blob URL:', error);
                    setAbsolutePdfUrl(pdfUrl); // Fallback to original URL
                    setIsProcessingBlob(false);
                }
            }
            // Ensure PDF URL is absolute for HTTP URLs
            else if (!pdfUrl.startsWith('http') && !pdfUrl.startsWith('data:')) {
                setAbsolutePdfUrl(`${window.location.origin}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`);
            } else {
                setAbsolutePdfUrl(pdfUrl);
            }
        };

        processPdfUrl();

        // Load display settings from localStorage
        const savedBrightness = localStorage.getItem('syncfusion-pdf-brightness');
        const savedContrast = localStorage.getItem('syncfusion-pdf-contrast');
        const savedReadingMode = localStorage.getItem('syncfusion-pdf-reading-mode');

        if (savedBrightness) setBrightness(Number(savedBrightness));
        if (savedContrast) setContrast(Number(savedContrast));
        if (savedReadingMode) setReadingMode(savedReadingMode as ReadingMode);
    }, [pdfUrl]);

    // Save brightness to localStorage when it changes
    React.useEffect(() => {
        if (mounted) {
            localStorage.setItem('syncfusion-pdf-brightness', brightness.toString());
        }
    }, [brightness, mounted]);

    // Save contrast to localStorage when it changes
    React.useEffect(() => {
        if (mounted) {
            localStorage.setItem('syncfusion-pdf-contrast', contrast.toString());
        }
    }, [contrast, mounted]);

    // Save reading mode to localStorage when it changes
    React.useEffect(() => {
        if (mounted) {
            localStorage.setItem('syncfusion-pdf-reading-mode', readingMode);
        }
    }, [readingMode, mounted]);

    const viewerRef = React.useRef<PdfViewerComponent>(null);

    const toolbarSettings: ToolbarSettingsModel = {
        showTooltip: true,
        toolbarItems: [
            'OpenOption',
            'PageNavigationTool',
            'MagnificationTool',
            'PanTool',
            'SelectionTool',
            'SearchOption',
            'PrintOption',
            'DownloadOption',
            'UndoRedoTool',
            'AnnotationEditTool',
            'FormDesignerEditTool',
            {
                prefixIcon: 'e-icons e-full-screen',
                id: 'fullscreen',
                tooltipText: 'Tela Cheia',
                align: 'Right'
            } as CustomToolbarItemModel,
            {
                prefixIcon: 'e-icons e-eye',
                id: 'display_settings',
                tooltipText: 'Ajustes de Visualização',
                align: 'Right'
            } as CustomToolbarItemModel
        ]
    };

    const toolbarClick = (args: any) => {
        if (args.item) {
            if (args.item.id === 'fullscreen') {
                const container = document.getElementById('container')?.parentElement;
                if (container) {
                    if (!document.fullscreenElement) {
                        container.requestFullscreen().catch(err => {
                            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                        });
                    } else {
                        document.exitFullscreen();
                    }
                }
            } else if (args.item.id === 'display_settings') {
                setShowDisplaySettings(!showDisplaySettings);
            }
        }
    };

    const getFilterStyle = () => {
        let filter = `brightness(${brightness}%) contrast(${contrast}%)`;

        switch (readingMode) {
            case 'sepia':
                filter += ' sepia(60%)';
                break;
            case 'night':
                filter += ' invert(90%) hue-rotate(180deg)';
                break;
            case 'gray':
                filter += ' grayscale(100%)';
                break;
            case 'green':
                filter += ' sepia(40%) hue-rotate(40deg) saturate(50%)';
                break;
            default:
                break;
        }

        return filter;
    };

    // Handler para quando o documento for carregado
    const handleDocumentLoad = () => {
        console.log('📄 Documento Syncfusion carregado com sucesso');

        // Log the source of the PDF
        if (pdfUrl.startsWith('blob:')) {
            console.log('✅ PDF carregado do cache local (via Blob convertido para Base64)');
        } else if (pdfUrl.startsWith('data:')) {
            console.log('✅ PDF carregado de Data URL');
        } else {
            console.log('✅ PDF carregado do servidor');
        }

        // Navegar para a página de progresso se for maior que 1
        if (paginaProgresso && paginaProgresso > 1 && viewerRef.current) {
            setTimeout(() => {
                try {
                    console.log(`🎯 Navegando para página de progresso: ${paginaProgresso}`);
                    viewerRef.current?.navigation.goToPage(paginaProgresso);
                } catch (error) {
                    console.error('❌ Erro ao navegar para página de progresso:', error);
                }
            }, 500); // Pequeno delay para garantir que o documento está totalmente carregado
        }
    };

    // Handler para quando a página mudar
    const handlePageChange = (args: any) => {
        const currentPage = args.currentPageNumber;
        console.log(`📄 Página mudou para: ${currentPage}`);

        if (onPageChange) {
            onPageChange(currentPage);
        }
    };

    if (!resourceUrl) return null;

    // Show loading state while processing blob
    if (isProcessingBlob || !absolutePdfUrl) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Processando PDF do cache...</p>
                    <p className="text-sm text-gray-500 mt-1">Convertendo para visualização</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            <PdfViewerComponent
                id="container"
                ref={viewerRef}
                documentPath={absolutePdfUrl}
                resourceUrl={resourceUrl}
                style={{ height: '100%', filter: getFilterStyle() }}
                toolbarSettings={toolbarSettings}
                toolbarClick={toolbarClick}
                documentLoad={handleDocumentLoad}
                pageChange={handlePageChange}
            >
                <Inject services={[Toolbar, Magnification, Navigation, LinkAnnotation, BookmarkView, ThumbnailView, Print, TextSelection, TextSearch, FormFields, FormDesigner, Annotation]} />
            </PdfViewerComponent>

            {mounted && showDisplaySettings && createPortal(
                <div
                    className="fixed top-4 right-4 p-6 rounded-lg shadow-2xl border-2 border-gray-300 w-80 max-h-[90vh] overflow-y-auto"
                    style={{
                        backgroundColor: 'white',
                        zIndex: 999999
                    }}
                >
                    <h3 className="font-semibold mb-4 text-sm">Ajustes de Visualização</h3>

                    {/* Reading Mode Section */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                        <label className="text-xs font-medium mb-2 block">Modo de Leitura</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setReadingMode('normal')}
                                className={`p-2 rounded border text-xs flex flex-col items-center gap-1 ${readingMode === 'normal'
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                title="Normal"
                            >
                                <div className="w-6 h-6 bg-white border border-gray-400 rounded"></div>
                                <span className="text-[10px]">Normal</span>
                            </button>
                            <button
                                onClick={() => setReadingMode('sepia')}
                                className={`p-2 rounded border text-xs flex flex-col items-center gap-1 ${readingMode === 'sepia'
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                title="Sépia"
                            >
                                <div className="w-6 h-6 bg-[#f4ecd8] border border-[#d4c4a8] rounded"></div>
                                <span className="text-[10px]">Sépia</span>
                            </button>
                            <button
                                onClick={() => setReadingMode('night')}
                                className={`p-2 rounded border text-xs flex flex-col items-center gap-1 ${readingMode === 'night'
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                title="Noturno"
                            >
                                <div className="w-6 h-6 bg-gray-800 border border-gray-600 rounded"></div>
                                <span className="text-[10px]">Noite</span>
                            </button>
                            <button
                                onClick={() => setReadingMode('gray')}
                                className={`p-2 rounded border text-xs flex flex-col items-center gap-1 ${readingMode === 'gray'
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                title="Cinza"
                            >
                                <div className="w-6 h-6 bg-gray-300 border border-gray-400 rounded"></div>
                                <span className="text-[10px]">Cinza</span>
                            </button>
                            <button
                                onClick={() => setReadingMode('green')}
                                className={`p-2 rounded border text-xs flex flex-col items-center gap-1 ${readingMode === 'green'
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                title="Verde"
                            >
                                <div className="w-6 h-6 bg-[#d8f4e8] border border-[#a8d4c4] rounded"></div>
                                <span className="text-[10px]">Verde</span>
                            </button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-medium">Brilho</label>
                            <span className="text-xs text-gray-500">{brightness}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="150"
                            value={brightness}
                            onChange={(e) => setBrightness(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="mb-2">
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-medium">Contraste</label>
                            <span className="text-xs text-gray-500">{contrast}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="150"
                            value={contrast}
                            onChange={(e) => setContrast(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="mt-4 pt-2 border-t flex justify-end">
                        <button
                            onClick={() => {
                                setBrightness(100);
                                setContrast(100);
                                setReadingMode('normal');
                            }}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Resetar
                        </button>
                        <button
                            onClick={() => setShowDisplaySettings(false)}
                            className="ml-4 text-xs text-gray-500 hover:underline"
                        >
                            Fechar
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
