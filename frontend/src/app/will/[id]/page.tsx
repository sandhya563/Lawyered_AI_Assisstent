'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { chatApi, documentApi, willApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { Send, Download, ArrowLeft, CheckCircle, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react'
import WillPreview from '@/components/WillPreview'

interface Message {
  id: string
  role: string
  content: string
  createdAt: string
}

interface ValidationResult {
  isValid: boolean
  canFinalize: boolean
  completionPercentage: number
  incomplete: { field: string; message: string }[]
  errors: { field: string; message: string }[]
  warnings: { field: string; message: string }[]
}

interface WillData {
  testator: any
  executor: any
  guardian: any
  assets: any[]
  beneficiaries: any[]
  witnesses: any[]
  hasMinorChildren: boolean
  signingDate: string | null
  signingPlace: string | null
  status: string
}

export default function WillBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const { token, hydrate } = useAuthStore()
  const willId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [willData, setWillData] = useState<WillData | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [downloading, setDownloading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    hydrate()
  }, [])

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    initializeChat()
    loadPreview()
  }, [token, willId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initializeChat = async () => {
    try {
      // Start conversation if needed
      await chatApi.startConversation(willId)
      // Load all messages
      const { data } = await chatApi.getMessages(willId)
      setMessages(data)
    } catch (error: any) {
      toast.error('Failed to load conversation')
    }
  }

  const loadPreview = async () => {
    try {
      const { data } = await documentApi.getPreview(willId)
      setWillData(data.will)
      setValidation(data.validation)
    } catch (error) {
      // Preview might fail for a brand new will - that's okay
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    // Optimistically add user message
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      const { data } = await chatApi.sendMessage(willId, userMessage)

      // Add AI response
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])

      // Update preview
      if (data.will) {
        await loadPreview()
      }
      if (data.validation) {
        setValidation(data.validation)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message')
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id))
      setInput(userMessage)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { data } = await documentApi.downloadPdf(willId)
      const blob = new Blob([data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `will-${willId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Will downloaded successfully!')
    } catch (error: any) {
      const errorData = error.response?.data
      if (errorData instanceof Blob) {
        const text = await errorData.text()
        const parsed = JSON.parse(text)
        toast.error(parsed.message || 'Cannot download yet - will is incomplete')
      } else {
        toast.error('Cannot download yet - please complete all required fields')
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Will Builder</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Completion indicator */}
          {validation && (
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `${validation.completionPercentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{validation.completionPercentage}%</span>
            </div>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={!validation?.canFinalize || downloading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
        </div>
      </header>

      {/* Main content: chat left, preview right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat panel */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your answer..."
                className="input-field resize-none"
                rows={2}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="btn-primary px-4 self-end"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="w-1/2 overflow-y-auto bg-gray-50 p-6 chat-scroll">
          {/* Validation warnings/errors */}
          {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="mb-4 space-y-2">
              {validation.errors.map((err, i) => (
                <div key={`err-${i}`} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{err.message}</p>
                </div>
              ))}
              {validation.warnings.map((warn, i) => (
                <div key={`warn-${i}`} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-yellow-700">{warn.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Will preview content */}
          {willData ? (
            <WillPreview data={willData} />
          ) : (
            <div className="card p-8 text-center">
              <p className="text-gray-500">Start chatting to see your will take shape here.</p>
            </div>
          )}

          {/* Completion status */}
          {validation && validation.canFinalize && (
            <div className="mt-4 flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
              <p className="text-sm font-medium text-green-700">
                Your will is complete! You can now download the PDF.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
