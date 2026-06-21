export interface CreateProposalPayload {
  price: number
  estimated_duration: number
  message: string
}

export type UpdateProposalPayload = CreateProposalPayload

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

/** Proposta enviada pelo profissional (GET /marketplace/proposals) */
export interface MyProposalSummary {
  id: string
  price: string | number
  estimated_duration: number
  message: string
  status: string
  created_at: string
  updated_at: string
  viewed_at: string | null
}

export interface ProfessionalSentProposalItem {
  id: string
  title: string
  description: string
  status: string
  budget_min: string | number
  budget_max: string | number
  is_urgent: boolean
  created_at: string
  client_name?: string
  client_photo?: string | null
  client_email?: string
  client_phone?: string
  category_name?: string
  category_icon?: string | null
  myProposal: MyProposalSummary
}

export interface MyProposalsListResponse {
  success?: boolean
  count?: number
  message?: string
  data?: ProfessionalSentProposalItem[]
}
