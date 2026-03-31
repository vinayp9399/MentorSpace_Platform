'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { Language } from '@/types'

const THEME_NAME = 'mentorspace-dark'

interface CodeEditorProps {
  code: string
  language: Language
  onChange: (code: string) => void
  readOnly?: boolean
  remoteTyping?: boolean
  remoteUserName?: string
}

export function CodeEditor({
  code,
  language,
  onChange,
  readOnly = false,
  remoteTyping = false,
  remoteUserName,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const decorationsRef = useRef<string[]>([])
  const isRemoteUpdateRef = useRef(false)

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Define custom dark theme
    monaco.editor.defineTheme(THEME_NAME, {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'variable', foreground: 'f8f8f2' },
      ],
      colors: {
        'editor.background': '#0d0d14',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#1a1a26',
        'editorLineNumber.foreground': '#44445a',
        'editorLineNumber.activeForeground': '#7c6fff',
        'editor.selectionBackground': '#7c6fff33',
        'editorCursor.foreground': '#7c6fff',
        'editorWidget.background': '#12121a',
        'editorSuggestWidget.background': '#12121a',
        'editorSuggestWidget.border': '#2a2a3a',
        'scrollbarSlider.background': '#2a2a3a88',
      },
    })
    monaco.editor.setTheme(THEME_NAME)
  }

  // Apply remote code without re-triggering onChange
  const applyRemoteCode = useCallback((newCode: string) => {
    if (!editorRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return
    const currentCode = model.getValue()
    if (currentCode === newCode) return

    isRemoteUpdateRef.current = true
    const position = editorRef.current.getPosition()
    model.setValue(newCode)
    if (position) editorRef.current.setPosition(position)
    isRemoteUpdateRef.current = false
  }, [])

  useEffect(() => {
    applyRemoteCode(code)
  }, [code, applyRemoteCode])

  const handleChange = useCallback((value: string | undefined) => {
    if (isRemoteUpdateRef.current) return
    onChange(value || '')
  }, [onChange])

  return (
    <div style={{ position: 'relative', height: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid #2a2a3a' }}>
      {/* Remote typing indicator */}
      {remoteTyping && remoteUserName && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 10,
          padding: '4px 10px', background: 'rgba(124,111,255,0.15)',
          border: '1px solid rgba(124,111,255,0.3)', borderRadius: '20px',
          fontSize: '11px', fontFamily: 'Space Mono, monospace', color: '#7c6fff',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <span style={{ display: 'flex', gap: '2px' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#7c6fff', animation: `blink 1.2s ${i * 0.2}s ease-in-out infinite` }} />
            ))}
          </span>
          {remoteUserName.split(' ')[0]} is typing
        </div>
      )}

      <Editor
        height="100%"
        language={language === 'javascript' ? 'javascript' : language}
        value={code}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: "'Space Mono', 'Fira Code', monospace",
          fontLigatures: true,
          lineHeight: 22,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'phase',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: 'line',
          formatOnPaste: true,
          tabSize: 2,
          wordWrap: 'on',
          bracketPairColorization: { enabled: true },
          suggest: { showKeywords: true },
        }}
      />
    </div>
  )
}
