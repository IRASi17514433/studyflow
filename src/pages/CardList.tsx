import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'
import type { CardRow, Subject } from '@/types'
import { Plus, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isDueTodayIso } from '@/lib/time'

type Filter = 'all' | 'learning' | 'archived'

export default function CardList() {
  const user = useAuthStore((s) => s.user)
  const [cards, setCards] = useState<CardRow[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false }),
      supabase.from('subjects').select('id, name, color, icon, sort_order').order('sort_order'),
    ]).then(([cardsRes, subjectsRes]) => {
      setCards((cardsRes.data as CardRow[]) ?? [])
      setSubjects((subjectsRes.data as Subject[]) ?? [])
      setLoading(false)
    })
  }, [user])

  const subjectMap = new Map(subjects.map((s) => [s.id, s]))

  const visible = cards.filter((c) => {
    if (filter === 'learning') return c.status !== 'archived'
    if (filter === 'archived') return c.status === 'archived'
    return true
  })

  const isDueToday = (c: CardRow) => c.status !== 'archived' && isDueTodayIso(c.due_date)

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'learning', label: '学习中' },
    { key: 'archived', label: '已归档' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">知识卡片</h1>
        <Link to="/cards/new">
          <Button>
            <Plus size={16} /> 新建卡片
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm text-slate-600 transition-colors',
              filter === t.key ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white hover:bg-slate-100'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400">加载中…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <BookOpen size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="mb-4 text-slate-500">这里还没有卡片。</p>
          <Link to="/cards/new">
            <Button>➕ 新建卡片</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map((c) => {
            const subj = c.subject_id !== null ? subjectMap.get(c.subject_id) : undefined
            return (
              <Link
                key={c.id}
                to={`/cards/${c.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-center gap-2">
                  {subj && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: subj.color }}
                    >
                      {subj.icon ?? ''} {subj.name}
                    </span>
                  )}
                  {isDueToday(c) && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      待复习
                    </span>
                  )}
                  {c.status === 'archived' && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">已归档</span>
                  )}
                </div>
                <h3 className="mb-1 text-lg font-semibold text-slate-800">{c.title}</h3>
                {c.content && <p className="whitespace-pre-wrap text-sm text-slate-500 line-clamp-2">{c.content}</p>}
                {c.images.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {c.images.slice(0, 3).map((url) => (
                      <img key={url} src={url} alt="" className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  录入于 {new Date(c.created_at).toLocaleDateString()} · 已复习 {c.review_count} 次
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}