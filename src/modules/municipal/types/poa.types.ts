export interface MunicipalPoa {
  id: number
  municipality_id: number
  fiscal_year: number
  title: string | null
  notes: string | null
  documents_count?: number
  created_at: string | null
  updated_at: string | null
}

export interface PoaFields {
  title: string | null
  notes: string | null
}

export interface CreatePoaPayload extends PoaFields {
  fiscal_year: number
}

export interface PoaFilters {
  page?: number
  per_page?: number
  fiscal_year?: number
  search?: string
}

export type PoaDocumentType = 'initial' | 'reformulated'

export interface PoaDocument {
  municipal_poa_version_id: number
  id: number
  municipal_poa_id: number
  version_number: number
  title: string
  document_reference: string | null
  mime_type: string
  file_size_bytes: number | null
  notes: string | null
  document_type: PoaDocumentType
  original_filename: string | null
  received_at: string | null
  published_at: string | null
  is_current: boolean
  is_published: boolean
  created_at: string | null
  updated_at: string | null
}

export interface PoaDocumentFilters {
  page?: number
  per_page?: number
  document_type?: PoaDocumentType
  is_current?: boolean
  published?: boolean
}

export interface UploadPoaDocumentPayload {
  pdf: File
  title: string
  document_reference: string
  received_at: string
  notes: string
}

export interface MunicipalPoaVersion {
  id: number
  municipal_poa_id: number
  version_number: number
  document_type: PoaDocumentType
  published_at: string | null
  is_published: boolean
  is_current: boolean
  documents_count?: number
  created_at: string | null
  updated_at: string | null
}
export type PoaVersionDocument = Omit<
  PoaDocument,
  | 'municipal_poa_id'
  | 'version_number'
  | 'document_type'
  | 'published_at'
  | 'is_current'
  | 'is_published'
>
export interface PoaUploadSession {
  id: string
  municipal_poa_version_id: number
  status: 'receiving' | 'queued' | 'processing' | 'failed' | 'completed'
  expected_size: number
  sha256: string
  original_filename: string
  title: string
  chunk_size: number
  total_chunks: number
  received_chunks: number[]
  received_bytes: number
  document_id: number | null
  expires_at: string
}
