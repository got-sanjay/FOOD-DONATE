import { LocationController } from '@/backend/controllers/location/location.controller'

export const runtime = 'nodejs'

export const GET = LocationController.reverseGeocode
