'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { Markdown } from 'tiptap-markdown'
import { Mark, mergeAttributes } from '@tiptap/core'
import { useEffect } from 'react'
import type { ReaderPreferences } from './types'
import { THEME_CONFIGS, FONT_FAMILIES, LINE_HEIGHT_VALUES } from './types'

// Extensão customizada de Underline com traçado, espessura e cor
const CustomUnderline = Mark.create({
  name: 'customUnderline',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      style: {
        default: 'solid',
        parseHTML: element => element.getAttribute('data-underline-style'),
        renderHTML: attributes => {
          if (!attributes.style) return {}
          return { 'data-underline-style': attributes.style }
        },
      },
      thickness: {
        default: '2px',
        parseHTML: element => element.getAttribute('data-underline-thickness'),
        renderHTML: attributes => {
          if (!attributes.thickness) return {}
          return { 'data-underline-thickness': attributes.thickness }
        },
      },
      color: {
        default: '#3b82f6',
        parseHTML: element => element.getAttribute('data-underline-color'),
        renderHTML: attributes => {
          if (!attributes.color) return {}
          return { 'data-underline-color': attributes.color }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'u',
      },
      {
        style: 'text-decoration',
        consuming: false,
        getAttrs: style => ((style as string).includes('underline') ? {} : false),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['u', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setCustomUnderline: attributes => ({ commands }) => {
        return commands.setMark(this.name, attributes)
      },
      toggleCustomUnderline: attributes => ({ commands }) => {
        return commands.toggleMark(this.name, attributes)
      },
      unsetCustomUnderline: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-u': () => this.editor.commands.toggleCustomUnderline({}),
    }
  },
})

interface TiptapReaderProps {
  content: string
  preferences: ReaderPreferences
  annotations?: Annotation[]
  pageStartOffset?: number
  onTextSelect?: (text: string, position: { x: number; y: number }, from: number, to: number) => void
  onSelectionClear?: () => void
  onEditorReady?: (editor: any) => void
  onEditorFocus?: () => void
  onHighlightCreate?: (annotation: { texto: string; cor: string; startOffset: number; endOffset: number }) => void
}

export function TiptapReader({ content, preferences, annotations = [], pageStartOffset = 0, onTextSelect, onSelectionClear, onEditorReady, onEditorFocus, onHighlightCreate }: TiptapReaderProps) {
  const theme = THEME_CONFIGS[preferences.theme]

  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        // Desabilitar algumas features que não precisamos
        codeBlock: true,
        code: true,
        blockquote: true,
        bold: true,
        bulletList: true,
        orderedList: true,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Highlight.configure({
        multicolor: true, // Suporte a múltiplas cores
      }),
      Color,
      TextStyle,
      CustomUnderline,
      Markdown.configure({
        html: false, // Não permitir HTML por segurança
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editable: true, // Precisa estar editável para highlights funcionarem
    editorProps: {
      attributes: {
        class: 'tiptap-reader prose prose-lg max-w-none focus:outline-none',
        style: `
          color: ${theme.text};
          font-size: ${preferences.fontSize}px;
          line-height: ${LINE_HEIGHT_VALUES[preferences.lineHeight]};
          font-family: ${FONT_FAMILIES[preferences.fontFamily]};
          text-align: ${preferences.textAlign};
          user-select: text;
          -webkit-user-select: text;
          cursor: default;
        `,
      },
      // Bloquear todas as tentativas de edição de texto
      handleKeyDown: () => true, // Bloqueia teclado
      handleTextInput: () => true, // Bloqueia input de texto
      handlePaste: () => true, // Bloqueia colar
      handleDrop: () => true, // Bloqueia arrastar e soltar
    },
    onFocus: () => {
      if (onEditorFocus) {
        onEditorFocus()
      }
    },
    // Callback quando seleção muda
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection

      if (!empty && onTextSelect) {
        const selectedText = editor.state.doc.textBetween(from, to, ' ')
        if (selectedText && selectedText.trim().length > 0) {
          // Calcular posição da seleção
          const { view } = editor
          const start = view.coordsAtPos(from)
          const end = view.coordsAtPos(to)

          // Posição no centro superior da seleção
          const position = {
            x: (start.left + end.right) / 2,
            y: start.top,
          }

          // Passar texto, posição e offsets
          onTextSelect(selectedText.trim(), position, from, to)
        }
      } else if (empty && onSelectionClear) {
        // Seleção foi limpa
        onSelectionClear()
      }
    },
    // Callback quando conteúdo muda (para detectar highlights)
    onUpdate: ({ editor, transaction }) => {
      // Detectar se foi aplicado um highlight
      if (transaction.getMeta('addToHistory') !== false && onHighlightCreate) {
        const { from, to } = editor.state.selection
        const highlightMark = editor.state.doc.resolve(from).marks().find(mark => mark.type.name === 'highlight')

        if (highlightMark) {
          const texto = editor.state.doc.textBetween(from, to, ' ')
          const cor = highlightMark.attrs.color || '#fef08a'

          onHighlightCreate({
            texto,
            cor,
            startOffset: from,
            endOffset: to,
          })
        }
      }
    },
  })

  // Notificar quando o editor estiver pronto
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  // Atualizar conteúdo quando mudar
  useEffect(() => {
    if (editor && content !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Atualizar estilo quando preferências mudarem
  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom
      editorElement.style.color = theme.text
      editorElement.style.fontSize = `${preferences.fontSize}px`
      editorElement.style.lineHeight = `${LINE_HEIGHT_VALUES[preferences.lineHeight]}`
      editorElement.style.fontFamily = FONT_FAMILIES[preferences.fontFamily]
      editorElement.style.textAlign = preferences.textAlign
    }
  }, [editor, preferences, theme])

  // Aplicar anotações salvas quando o editor estiver pronto
  useEffect(() => {
    if (!editor) return

    // Aguardar o editor estar completamente pronto
    const timer = setTimeout(() => {
      // Limpar todas as marcações existentes primeiro
      const { doc } = editor.state
      const contentLength = doc.content.size

      // Remover todos os highlights, underlines e strikes
      editor.chain()
        .setTextSelection({ from: 0, to: contentLength })
        .unsetHighlight()
        .unsetCustomUnderline()
        .unsetStrike()
        .setTextSelection(0)
        .run()

      // Agora aplicar apenas as anotações que ainda existem
      annotations.forEach((annotation) => {
        // Calcular offsets relativos à página
        const relativeStart = annotation.startOffset - pageStartOffset
        const relativeEnd = annotation.endOffset - pageStartOffset

        // Verificar se a anotação está nesta página
        if (relativeStart >= 0 && relativeStart < content.length) {
          const adjustedEnd = Math.min(relativeEnd, content.length)

          try {
            // Aplicar marcação baseada no tipo
            if (annotation.tipo === 'highlight') {
              editor.chain()
                .setTextSelection({ from: relativeStart, to: adjustedEnd })
                .setHighlight({ color: annotation.cor })
                .run()
            } else if (annotation.tipo === 'underline') {
              const metadata = annotation.metadata as any
              editor.chain()
                .setTextSelection({ from: relativeStart, to: adjustedEnd })
                .setCustomUnderline({
                  style: metadata?.style || 'solid',
                  thickness: metadata?.thickness || '2px',
                  color: annotation.cor,
                })
                .run()
            } else if (annotation.tipo === 'strikethrough') {
              editor.chain()
                .setTextSelection({ from: relativeStart, to: adjustedEnd })
                .setStrike()
                .run()
            }
          } catch (err) {
            console.error('Erro ao aplicar anotação:', err)
          }
        }
      })

      // Limpar seleção no final
      editor.commands.setTextSelection(0)
    }, 100)

    return () => clearTimeout(timer)
  }, [editor, annotations, pageStartOffset, content])

  if (!editor) {
    return (
      <div style={{ color: theme.secondary }}>
        Carregando editor...
      </div>
    )
  }

  return <EditorContent editor={editor} />
}
