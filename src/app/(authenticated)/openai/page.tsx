"use client"

import { OpenAIConfig } from "@/components/openai/openai-config"
import { Settings } from "lucide-react"

export default function OpenAIConfigPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold">Configurações da OpenAI</h1>
      </div>
      <OpenAIConfig />
    </div>
  )
} 