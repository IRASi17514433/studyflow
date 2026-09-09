export interface Subject {
  id: number
  name: string
  color: string
  icon: string | null
  sort_order: number | null
}

export interface CardRow {
  id: string
  user_id: string
  subject_id: number | null
  title: string
  content: string | null
  images: string[]
  status: string
  fsrs_card: unknown
  due_date: string | null
  last_review: string | null
  review_count: number
  lapses: number
  created_at: string
  updated_at: string
}