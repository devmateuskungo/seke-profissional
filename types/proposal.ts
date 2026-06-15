export interface Proposal {
  id: string
  service_request_id: string
  professional_id?: string
  status?: string
  message?: string | null
  proposed_price?: string | number | null
  created_at?: string
  updated_at?: string
}

export interface ProposalResponse {
  success?: boolean
  message?: string
  data?: Proposal
  proposal?: Proposal
}
