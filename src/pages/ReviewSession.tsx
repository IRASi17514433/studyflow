import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'
import { newCard, reviveCard, scheduleNext, RATING_LABELS, type RatingValue } from '@/lib/fsrs'
import { endOfTodayIso } from '@/lib/time'
import type { CardRow, Subject } from '@/types'
import { Home, ListTodo } from 'lucide-react'

export default function ReviewSession() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const navigate = useNavigate()
  const limit = (location.state as { limit?: number } | null)?.limit ?? 50

  const [queue, setQueue] = useState<CardRow[]>([])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'front' | 'back'>('front')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [examDate, setExamDate] = useState<string | null>(null)
  const [shownAt, setShownAt] = useState(Date.now())
  const [reAdds, setReAdds] = useState<Record<string, number>>({})
  const [doneCount, setDoneCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .lte('due_date', endOfTodayIso())
        .order('due_date', { ascending: true })
        .limit(limit),
      supabase.from('subjects').select('id, name, color, icon, sort_order').order('sort_order'),
      supabase.from('profiles').select('exam_date').eq('id', user.id).single(),
    ]).then(([cardsRes, subjectsRes, profileRes]) => {
      setQueue((cardsRes.data as CardRow[]) ?? [])
      setSubjects((subjectsRes.data as Subject[]) ?? [])
      setExamDate(profileRes.data?.exam_date ?? null)
      setLoading(false)
      setShownAt(Date.now())
    })
  }, [user, limit])

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const current = queue[index]

  const handleRating = async (rating: RatingValue) => {
    if (!user || !current || saving) return
    setSaving(true)
    setError('')
    try {
      const cost = Date.now() - shownAt
      const card = current.fsrs_card ? reviveCard(current.fsrs_card) : newCard()
      const next = scheduleNext(card, rating, examDate)
      const nowIso = new Date().toISOString()

      const { error: upErr } = await supabase
        .from('cards')
        .update({
          fsrs_card: next,
          due_date: next.due.toISOString(),
          last_review: nowIso,
          review_count: current.review_count + 1,
          lapses: current.lapses + (rating === 1 ? 1 : 0),
          updated_at: nowIso,
        })
        .eq('id', current.id)
      if (upErr) throw new Error(upErr.message)

      const { error: logErr } = await supabase.from('review_logs').insert({
        user_id: user.id,
        card_id: current.id,
        rating,
        time_cost_ms: cost,
        review_time: nowIso,
      })
      if (logErr) throw new Error(logErr.message)

      setDoneCount((c) => c + 1)

      // “忘了”：重新加入本次队列末尾（同一场最多 2 次，防死循环）
      const willReAdd = rating === 1 && (reAdds[current.id] ?? 0) < 2
      const nextQueue = willReAdd ? [...queue, current] : queue
      if (willReAdd) setReAdds((m) => ({ ...m, [current.id]: (m[current.id] ?? 0) + 1 }))
      setQueue(nextQueue)

      const nextIndex = index + 1
      setIndex(nextIndex)
      setPhase('front')
      setShownAt(Date.now())
      if (nextIndex >= nextQueue.length) setFinished(true)
    } catch (err) {
      setError('保存失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-slate-400">加载中…</p>

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="mb-6 animate-bounce text-7xl">🎉</div>
        <h1 className="mb-3 text-3xl font-bold text-slate-800">复习完成！</h1>
        <p className="mb-8 text-slate-500">本次复习了 {doneCount} 张卡片，记忆又巩固了一层。</p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => navigate('/')}>
            <Home size={16} /> 返回首页
          </Button>
          <Button variant="outline" onClick={() => navigate('/cards')}>
            <ListTodo size={16} /> 查看卡片列表
          </Button>
        </div>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="mb-6 text-slate-500">当前没有需要复习的卡片。</p>
        <Button onClick={() => navigate('/review')}>返回复习入口</Button>
      </div>
    )
  }

  const subj = current.subject_id !== null ? subjectMap.get(current.subject_id) : undefined

  return (
    <div className="max-w-2xl mx-auto">
      {/* 进度 */}
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          进度：{Math.min(index + 1, queue.length)}/{queue.length}
        </span>
        {subj && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: subj.color }}
          >
            {subj.icon ?? ''} {subj.name}
          </span>
        )}
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-slate-700 transition-all"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      {/* 闪卡 */}
      <div className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-8">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">{current.title}</h2>
        {phase === 'front' ? (
          <div className="flex flex-1 items-center justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setPhase('back')
                setShownAt(Date.now())
              }}
            >
              显示内容
            </Button>
          </div>
        ) : (
          <div className="flex-1">
            {current.content && (
              <p className="mb-4 whitespace-pre-wrap leading-7 text-slate-600">{current.content}</p>
            )}
            {current.images.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-3">
                {current.images.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="max-h-48 rounded-lg border border-slate-200 object-contain"
                  />
                ))}
              </div>
            )}
            <p className="mt-4 text-sm text-slate-400">你的记忆程度：</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {([1, 2, 3, 4] as RatingValue[]).map((r) => (
                <button
                  key={r}
                  disabled={saving}
                  onClick={() => handleRating(r)}
                  className={`rounded-xl px-4 py-3 font-medium text-white transition-colors ${RATING_LABELS[r].color} disabled:opacity-50`}
                >
                  <span className="text-xl">{RATING_LABELS[r].emoji}</span>
                  <span className="ml-1">{RATING_LABELS[r].label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </div>
  )
}