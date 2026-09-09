import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/useAuthStore'
import { Brain, Coffee } from 'lucide-react'
import { endOfTodayIso } from '@/lib/time'

export default function Review() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [dueCount, setDueCount] = useState(0)
  const [dailyLimit, setDailyLimit] = useState(50)
  const [doneToday, setDoneToday] = useState(0)
  const [custom, setCustom] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)

    Promise.all([
      supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .lte('due_date', endOfTodayIso()),
      supabase.from('settings').select('daily_limit').eq('user_id', user.id).single(),
      supabase
        .from('review_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('review_time', dayStart.toISOString()),
    ]).then(([dueRes, limitRes, doneRes]) => {
      setDueCount(dueRes.count ?? 0)
      setDailyLimit(limitRes.data?.daily_limit ?? 50)
      setDoneToday(doneRes.count ?? 0)
      setLoading(false)
    })
  }, [user])

  const start = (n: number) => {
    navigate('/review/session', { state: { limit: n } })
  }

  if (loading) return <p className="text-slate-400">加载中…</p>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">开始复习</h1>

      {dueCount === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Coffee size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="mb-2 text-slate-600">今天没有到期的复习</p>
          <p className="text-sm text-slate-400">去录入新卡片，或休息一下吧 ☕</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="mb-6 flex items-center gap-3">
            <Brain size={28} className="text-slate-500" />
            <div>
              <p className="text-3xl font-bold text-slate-800">{dueCount} 张</p>
              <p className="text-sm text-slate-500">今日待复习 · 今日已完成 {doneToday} 次</p>
            </div>
          </div>

          {dueCount <= dailyLimit ? (
            <Button className="w-full" onClick={() => start(dueCount)}>
              开始复习（{dueCount} 张）
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                积压较多（{dueCount} 张），每日上限为 {dailyLimit} 张。选择今天的复习量：
              </p>
              <Button className="w-full" onClick={() => start(dailyLimit)}>
                只复习 {dailyLimit} 张（推荐）
              </Button>
              <Button variant="outline" className="w-full" onClick={() => start(dueCount)}>
                全部复习 {dueCount} 张
              </Button>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={dueCount}
                  placeholder="自定义数量"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const n = Number(custom)
                    if (n >= 1 && n <= dueCount) start(n)
                  }}
                >
                  确定
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}