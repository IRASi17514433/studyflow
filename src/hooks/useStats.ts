import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { getRetrievability } from '@/lib/fsrs'
import { endOfTodayIso } from '@/lib/time'
import type { CardRow, Subject } from '@/types'

export interface StatsData {
  dueToday: number
  doneToday: number
  streakDays: number
  totalCards: number
  masteredCards: number
  masteryRate: number
  totalReviews: number
  recentCards: CardRow[]
  subjectBreakdown: { subjectId: number | null; total: number; mastered: number }[]
  subjects: Subject[]
  examDate: string | null
  loading: boolean
}

const empty: StatsData = {
  dueToday: 0,
  doneToday: 0,
  streakDays: 0,
  totalCards: 0,
  masteredCards: 0,
  masteryRate: 0,
  totalReviews: 0,
  recentCards: [],
  subjectBreakdown: [],
  subjects: [],
  examDate: null,
  loading: true,
}

export function useStats() {
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState<StatsData>(empty)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)

    Promise.all([
      supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false }),
      supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .lte('due_date', endOfTodayIso()),
      supabase
        .from('review_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('review_time', dayStart.toISOString()),
      supabase.from('review_logs').select('review_time').eq('user_id', user.id),
      supabase.from('subjects').select('id, name, color, icon, sort_order').order('sort_order'),
      supabase.from('profiles').select('exam_date').eq('id', user.id).single(),
    ]).then(([cardsRes, dueRes, doneRes, logsRes, subjectsRes, profileRes]) => {
      if (cancelled) return
      const cards = (cardsRes.data as CardRow[]) ?? []
      const logs = logsRes.data ?? []

      // 掌握 = 可提取性 ≥ 90%
      let mastered = 0
      const subjectMap = new Map<number | null, { total: number; mastered: number }>()
      for (const c of cards) {
        const r = getRetrievability(c.fsrs_card, c.last_review)
        const isMastered = r !== null && r >= 0.9
        if (isMastered) mastered++
        const entry = subjectMap.get(c.subject_id) ?? { total: 0, mastered: 0 }
        entry.total++
        if (isMastered) entry.mastered++
        subjectMap.set(c.subject_id, entry)
      }

      // 连续学习天数（今天没学则从昨天往前数）
      const dates = new Set(logs.map((l) => new Date(l.review_time).toDateString()))
      let streak = 0
      const cursor = new Date()
      if (!dates.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
      while (dates.has(cursor.toDateString())) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      }

      setData({
        dueToday: dueRes.count ?? 0,
        doneToday: doneRes.count ?? 0,
        streakDays: streak,
        totalCards: cards.length,
        masteredCards: mastered,
        masteryRate: cards.length ? Math.round((mastered / cards.length) * 1000) / 10 : 0,
        totalReviews: logs.length,
        recentCards: cards.slice(0, 5),
        subjectBreakdown: [...subjectMap.entries()].map(([subjectId, v]) => ({
          subjectId,
          total: v.total,
          mastered: v.mastered,
        })),
        subjects: (subjectsRes.data as Subject[]) ?? [],
        examDate: profileRes.data?.exam_date ?? null,
        loading: false,
      })
    })

    return () => {
      cancelled = true
    }
  }, [user])

  return data
}