import { HelpController } from '@/backend/controllers/ai/help.controller'

export const runtime = 'nodejs'
export const maxDuration = 45

export const POST = HelpController.handleChat