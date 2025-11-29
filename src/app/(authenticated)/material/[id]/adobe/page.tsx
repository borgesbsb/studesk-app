import { buscarMaterialEstudoPorId } from "@/interface/actions/material-estudo/list"
import { saveAdobeAnnotations, getAdobeAnnotations } from "@/interface/actions/material-estudo/annotations"
import { AdobePdfViewer } from "@/components/pdf/AdobePdfViewer"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function AdobeViewerPage({ params }: PageProps) {
    const { id } = await params
    const [materialResponse, annotationsResponse] = await Promise.all([
        buscarMaterialEstudoPorId(id),
        getAdobeAnnotations(id)
    ])

    if (!materialResponse.success || !materialResponse.data) {
        return <div>Material não encontrado</div>
    }

    const material = materialResponse.data
    const initialAnnotations = annotationsResponse.success ? annotationsResponse.data : null

    // Placeholder Client ID - User needs to replace this
    // Get one at https://documentcloud.adobe.com/view-sdk-demo/index.html#/view/FULL_WINDOW
    // or https://developer.adobe.com/document-services/apis/pdf-embed/
    const CLIENT_ID = "185b265353fa49ae89d0b53461f5a6b9"

    async function handleSaveAnnotations(annotations: any) {
        "use server"
        await saveAdobeAnnotations(id, annotations)
    }

    return (
        <div className="h-screen flex flex-col">
            <div className="bg-white border-b p-4 flex items-center gap-4">
                <Link href={`/disciplina/${material.disciplinas?.[0]?.disciplinaId || ''}/materiais`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="font-semibold text-lg">{material.nome} (Adobe POC)</h1>
            </div>
            <div className="flex-1 bg-gray-100">
                <AdobePdfViewer
                    url={material.arquivoPdfUrl || ''}
                    fileName={material.nome}
                    clientId={CLIENT_ID}
                    initialPage={material.paginasLidas > 0 ? material.paginasLidas : 1}
                    materialId={id}
                    initialAnnotations={initialAnnotations}
                    onSaveAnnotations={handleSaveAnnotations}
                />
            </div>
        </div>
    )
}
