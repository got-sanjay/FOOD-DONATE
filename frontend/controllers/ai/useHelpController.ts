'use client'

import { useState, useCallback } from 'react'
import { ChatMessage, ChatApiResponse } from '@/frontend/models/ai/help.types'

export function useHelpController() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am FoodRescue Assistant. How can I assist you with donating food or finding nearby NGOs today?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (text?: string) => {
      const messageContent = (text ?? input).trim()
      if (!messageContent || isLoading) return

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageContent,
      }

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsLoading(true)
      setError(null)

      try {
        const conversationPayload = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch('/api/help', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversationPayload }),
        })

        const data: ChatApiResponse = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'The assistant could not respond right now.')
        }

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer || 'I could not generate an answer.',
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error reaching assistant.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, messages]
  )

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Chat refreshed. How can I help you today?',
      },
    ])
    setError(null)
  }, [])

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    sendMessage,
    clearChat,
  }
}
