import type { Region } from '@/modules/territory/types/territory.types'

export type MapRegion = Pick<Region, 'id' | 'name' | 'code' | 'active'>

export interface RegionBoundary {
  type: 'Feature'
  id: number
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
  properties: {
    region_id: number
    name: string
    code: string | null
    updated_at: string | null
  }
}

export interface RegionBoundaryCollection {
  type: 'FeatureCollection'
  features: RegionBoundary[]
}
