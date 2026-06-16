export interface CreateProposalPayload {
  price: number
  estimated_duration: number
  message: string
}

export interface Proposal {
  id: string
  service_request_id: string
  professional_id?: string
  professional_name?: string
  profile_photo_url?: string | null
  status?: string
  message?: string | null
  proposed_price?: string | number | null
  price?: string | number | null
  estimated_duration?: number | null
  created_at?: string
  updated_at?: string
}

export interface ProposalsListResponse {
  success?: boolean
  message?: string
  data?: Proposal[]
  proposals?: Proposal[]
}

export interface ProposalResponse {
  success?: boolean
  message?: string
  data?: Proposal
  proposal?: Proposal
}
