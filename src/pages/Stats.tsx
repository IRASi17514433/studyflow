import { useMemo } from 'react'
import { useStats } from '@/hooks/useStats'
import { Flame, Layers, Target, CheckCircle2, Brain, ListChecks } from 'lucide-react'

export default function Stats() {
  const stats = useStats()
  const subjectMap = useMemo(() => new Map(stats.subjects.map((s) => [s.id, s])), [stats.subjects])

  if (stats.loading) return <p className="text-slate-400">加载中…</p>

  const rows = stats.subjectBreakdown.filter((r) => r.total > 0).sort((a, b) => b.total - a.total)

  const tiles = [
    { icon: Flame, label: '连续学习', value: `${stats.streakDays} 天` },
    { icon: Layers, label: '总卡片', value: `${stats.totalCards} 张` },
    { icon: CheckCircle2, label: '已掌握', value: `${stats.masteredCards} 张` },
    { icon: Target, label: '掌握率', value: `${stats.masteryRate}%` },
    { icon: ListChecks, label: '累计复习', value: `${stats.totalReviews} 次` },
    { icon: Brain, label: '今日待复习', value: `${stats.dueToday} 张` },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">学习统计</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <t.icon size={16} /> {t.label}
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-800">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">各科掌握度</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">暂无数据，先去录入和复习几张卡片吧。</p>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => {
              const subj = r.subjectId !== null ? subjectMap.get(r.subjectId) : undefined
              const pct = r.total ? Math.round((r.mastered / r.total) * 100) : 0
              return (
                <div key={String(r.subjectId)}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-700">{subj ? `${subj.icon ?? ''} ${subj.name}` : '未分类'}</span>
                    <span className="text-slate-500">
                      {r.mastered}/{r.total} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: subj?.color ?? '#94A3B8' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-400">
          “已掌握”定义：记忆可提取性 ≥ 90%（由 FSRS 算法根据复习记录实时计算）。
          可提取性会随时间慢慢下降，所以已掌握的卡片仍会以更长的间隔被推送复习——这是正常且必要的。
        </p>
      </div>
    </div>
  )
}