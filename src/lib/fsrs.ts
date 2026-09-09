import { fsrs, generatorParameters, createEmptyCard, type Card } from 'ts-fsrs'

const f = fsrs(generatorParameters())

export type RatingValue = 1 | 2 | 3 | 4

interface ReviewResult {
  card: Card
  log: unknown
}

export function newCard(): Card {
  return createEmptyCard()
}

// 从数据库读出的 JSON 还原成 FSRS 卡片对象（日期字符串 → Date）
export function reviveCard(raw: unknown): Card {
  const c = raw as Record<string, unknown>
  return {
    ...c,
    due: new Date(c.due as string),
    last_review: c.last_review ? new Date(c.last_review as string) : null,
  } as Card
}

// 根据自评计算下一次复习时间；若超过高考日期则压缩到高考前
export function scheduleNext(card: Card, rating: RatingValue, examDate: string | null): Card {
  const now = new Date()
  // 新版 ts-fsrs 的 Rating 枚举含 Manual 成员，直接索引会报 ts(7053)；
  // 我们只使用 1~4，故断言为“1~4 → 复习结果”的映射
  const record = f.repeat(card, now) as unknown as Record<RatingValue, ReviewResult>
  const next = record[rating].card
  if (examDate) {
    const exam = new Date(examDate + 'T23:59:59')
    if (next.due.getTime() > exam.getTime()) {
      next.due = exam
    }
  }
  return next
}

// FSRS 幂遗忘曲线：当前能回忆起来的概率 R = (1 + (19/81) * t / S) ^ (-0.5)
// t = 距上次复习的天数，S = 稳定性（来自 fsrs_card）
export function getRetrievability(fsrsCard: unknown, lastReview: string | null): number | null {
  if (!fsrsCard || !lastReview) return null
  const s = (fsrsCard as { stability?: number }).stability
  if (typeof s !== 'number' || s <= 0) return null
  const t = (Date.now() - new Date(lastReview).getTime()) / 86400000
  return Math.pow(1 + (19 / 81) * (t / s), -0.5)
}

export const RATING_LABELS: Record<RatingValue, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😵', label: '忘了', color: 'bg-red-500 hover:bg-red-600' },
  2: { emoji: '😐', label: '模糊', color: 'bg-amber-500 hover:bg-amber-600' },
  3: { emoji: '🙂', label: '记得', color: 'bg-green-600 hover:bg-green-700' },
  4: { emoji: '😎', label: '熟练', color: 'bg-blue-500 hover:bg-blue-600' },
}