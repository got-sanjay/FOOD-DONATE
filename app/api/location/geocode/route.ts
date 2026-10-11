import { NextResponse } from 'next/server'
import { LocationController } from '@/backend/controllers/location/location.controller'

export const runtime = 'nodejs'

export const GET = LocationController.geocode
