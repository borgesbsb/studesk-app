declare module 'pdfjs-dist' {
  interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>
  }

  interface PDFDocumentProxy {
    numPages: number
    getPage(pageNumber: number): Promise<PDFPageProxy>
  }

  interface PDFPageProxy {
    getTextContent(): Promise<PDFPageTextContent>
  }

  interface PDFPageTextContent {
    items: Array<{ str: string }>
  }

  interface PDFSource {
    url?: string
    data?: Uint8Array
  }

  interface GlobalWorkerOptions {
    workerSrc: string
  }

  export const GlobalWorkerOptions: GlobalWorkerOptions

  export function getDocument(source: PDFSource): PDFDocumentLoadingTask
}

declare module 'pdfjs-dist/build/pdf.worker.entry' {
  const workerSrc: string
  export default workerSrc
} 