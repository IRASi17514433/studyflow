import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStats } from '@/hooks/useStats'
import { Button } from '@/components/ui/button'
import { Brain, Plus, Flame, Layers, Target, CalendarDays } from 'lucide-react'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  return `${d} 天前`
}

export default function Dashboard() {
  const stats = useStats()
  const subjectMap = useMemo(() => new Map(stats.subjects.map((s) => [s.id, s])), [stats.subjects])

  const examDays = useMemo(() => {
    if (!stats.examDate) return null
    return Math.ceil((new Date(stats.examDate + 'T00:00:00').getTime() - Date.now()) / 86400000)
  }, [stats.examDate])

  if (stats.loading) return <p className="text-slate-400">加载中…</p>

  return (
    <div className="space-y-6">
      {/* 温和的高考提示：仅提供信息与算法判断，不做醒目倒计时 */}
      {examDays !== null && examDays >= 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <CalendarDays size={16} />
          <span>距离高考目标日期还有 {examDays} 天，超出该日期的复习已被系统自动提前安排。</span>
        </div>
      )}

      {/* 今日复习 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Brain size={28} className="text-slate-500" />
            <div>
              <p className="text-2xl font-bold text-slate-800">今日待复习 {stats.dueToday} 张</p>
              <p className="text-sm text-slate-500">今日已完成 {stats.doneToday} 次复习</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/review">
              <Button>开始复习 →</Button>
            </Link>
            <Link to="/cards/new">
              <Button variant="outline">
                <Plus size={16} /> 新建卡片
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Flame size={16} /> 连续学习
          </div>
          <p className="mt-1 text-3xl font-bold text-slate-800">{stats.streakDays} 天</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Layers size={16} /> 总卡片
          </div>
          <p className="mt-1 text-3xl font-bold text-slate-800">{stats.totalCards} 张</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Target size={16} /> 掌握率
          </div>
          <p className="mt-1 text-3xl font-bold text-slate-800">{stats.masteryRate}%</p>
        </div>
      </div>

      {/* 最近录入 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">最近录入</h2>
        {stats.recentCards.length === 0 ? (
          <p className="text-sm text-slate-400">还没有卡片，点上方“新建卡片”录入第一个知识点吧。</p>
        ) : (
          <ul className="space-y-3">
            {stats.recentCards.map((c) => {
              const subj = c.subject_id !== null ? subjectMap.get(c.subject_id) : undefined
              return (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    {subj && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: subj.color }}
                      >
                        {subj.name}
                      </span>
                    )}
                    {c.title}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}