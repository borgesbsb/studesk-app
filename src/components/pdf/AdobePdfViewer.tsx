"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"

interface AdobePdfViewerProps {
    url: string
    fileName: string
    clientId: string
    initialPage?: number
    materialId?: string // Add materialId to save annotations
    initialAnnotations?: any // Add initial annotations to load
    onSaveAnnotations?: (annotations: any) => Promise<void> // Callback to save
}

declare global {
    interface Window {
        AdobeDC: any
    }
}

export function AdobePdfViewer({
    url,
    fileName,
    clientId,
    initialPage = 1,
    materialId,
    initialAnnotations,
    onSaveAnnotations
}: AdobePdfViewerProps) {
    const [adobeReady, setAdobeReady] = useState(false)
    const viewerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (window.AdobeDC) {
            setAdobeReady(true)
        } else {
            document.addEventListener("adobe_dc_view_sdk.ready", () => {
                setAdobeReady(true)
            })
        }
    }, [])

    useEffect(() => {
        if (adobeReady && viewerRef.current) {
            const adobeDCView = new window.AdobeDC.View({
                clientId: clientId,
                divId: "adobe-pdf-viewer",
            })

            const previewFilePromise = adobeDCView.previewFile(
                {
                    content: { location: { url: url } },
                    metaData: {
                        fileName: fileName,
                        id: materialId || fileName // ID is required for annotations
                    },
                },
                {
                    embedMode: "FULL_WINDOW",
                    defaultViewMode: "FIT_WIDTH",
                    showAnnotationTools: true,
                    showLeftHandPanel: true,
                    showPageControls: true,
                    showDownloadPDF: true,
                    showPrintPDF: true,
                    enableAnnotationAPIs: true, // Enable Annotation APIs
                    includePDFAnnotations: true, // Include PDF Annotations
                }
            )

            // Event Listener for Analytics and Annotations
            previewFilePromise.then((adobeViewer: any) => {
                // Set initial page if provided and greater than 1
                if (initialPage > 1) {
                    adobeViewer.getAPIs().then((apis: any) => {
                        apis.gotoLocation(initialPage)
                            .catch((error: any) => console.error("Error going to initial page:", error))
                    })
                }

                // Load initial annotations if available
                if (initialAnnotations) {
                    adobeViewer.getAnnotationManager().then((annotationManager: any) => {
                        annotationManager.addAnnotations(initialAnnotations)
                            .catch((error: any) => console.error("Error adding annotations:", error))
                    })
                }

                // Register save callback
                if (onSaveAnnotations) {
                    adobeViewer.getAnnotationManager().then((annotationManager: any) => {
                        console.log("Annotation Manager loaded, registering listener...")
                        // Register event listener for annotation changes
                        annotationManager.registerEventListener(
                            (event: any) => {
                                console.log("Annotation changed:", event)
                                // Auto-save on any annotation change (add, update, delete)
                                // Debounce could be added here for performance
                                annotationManager.getAnnotations()
                                    .then((result: any) => {
                                        console.log("Saving annotations...", result)
                                        onSaveAnnotations(result)
                                            .then(() => console.log("Annotations saved successfully"))
                                            .catch((err) => console.error("Error saving annotations:", err))
                                    })
                                    .catch((error: any) => console.error("Error getting annotations:", error))
                            },
                            {
                                listenOn: [
                                    "ANNOTATION_ADDED",
                                    "ANNOTATION_UPDATED",
                                    "ANNOTATION_DELETED"
                                ]
                            }
                        )
                    })
                }

                adobeViewer.getAPIs().then((apis: any) => {
                    const eventOptions = {
                        listenOn: [
                            "PDF_VIEWER_OPEN",
                            "PAGE_VIEW",
                            "DOCUMENT_DOWNLOAD",
                            "TEXT_COPY",
                            "TEXT_SEARCH",
                        ],
                        enablePDFAnalytics: true,
                    }

                    adobeDCView.registerCallback(
                        window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
                        (event: any) => {
                            console.log("Adobe PDF Embed API Event:", event)
                            // Here we can send data to our backend
                        },
                        eventOptions
                    )
                })
            })
        }
    }, [adobeReady, url, fileName, clientId, initialPage, initialAnnotations, onSaveAnnotations])

    return (
        <>
            <Script
                src="https://documentcloud.adobe.com/view-sdk/main.js"
                strategy="afterInteractive"
            />
            <div
                id="adobe-pdf-viewer"
                ref={viewerRef}
                style={{ height: "100vh", width: "100%" }}
            />
        </>
    )
}
