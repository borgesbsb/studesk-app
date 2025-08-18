declare module '@react-pdf-viewer/highlight' {
  export interface HighlightArea {
    pageIndex: number
    boundingRect: {
      x1: number
      y1: number
      x2: number
      y2: number
    }
  }

  export interface Highlight {
    id: string
    areas: HighlightArea[]
    note?: string
    selectedText: string
  }

  export enum Trigger {
    TextSelection = 'TextSelection',
  }

  export interface HighlightPluginProps {
    trigger: Trigger
    onHighlightClick?: (highlight: Highlight) => void
    onHighlightAdd?: (highlight: Highlight) => void
  }

  export function highlightPlugin(props: HighlightPluginProps): any
}

declare module '@react-pdf-viewer/toolbar' {
  import { ReactElement } from 'react'

  export interface ToolbarSlot {
    ZoomOut: ReactElement
    ZoomIn: ReactElement
    Zoom: ReactElement
    GoToPreviousPage: ReactElement
    GoToNextPage: ReactElement
    CurrentPageInput: ReactElement
    NumberOfPages: ReactElement
    SwitchTheme: ReactElement
    Download: ReactElement
    Print: ReactElement
    [key: string]: ReactElement | undefined
  }

  export type TransformToolbarSlot = (slot: ToolbarSlot) => ToolbarSlot

  export interface ToolbarPluginProps {
    renderDefaultToolbar?: (slot: ToolbarSlot) => ReactElement
  }

  export function toolbarPlugin(props?: ToolbarPluginProps): any
}

declare module '@react-pdf-viewer/default-layout' {
  import { ReactElement } from 'react'
  import { ToolbarPluginProps } from '@react-pdf-viewer/toolbar'

  export interface DefaultLayoutPluginProps {
    toolbarPlugin?: ToolbarPluginProps
  }

  export function defaultLayoutPlugin(props?: DefaultLayoutPluginProps): any
}

declare module '@react-pdf-viewer/core' {
  import { Component, ReactElement } from 'react'

  export interface PageChangeEvent {
    currentPage: number
    doc: any
  }

  export interface ViewerProps {
    fileUrl: string
    plugins?: any[]
    defaultScale?: any
    theme?: any
    initialPage?: number
    onPageChange?: (e: PageChangeEvent) => void
    renderLoader?: (percentages: number) => JSX.Element
    renderPage?: (props: any) => JSX.Element
    onDocumentLoadSuccess?: () => void
  }

  export interface WorkerProps {
    workerUrl: string
    children?: React.ReactNode
  }

  export const Worker: React.FC<WorkerProps>
  export const Viewer: React.FC<ViewerProps>

  export enum SpecialZoomLevel {
    PageFit = 'PageFit'
  }
} 