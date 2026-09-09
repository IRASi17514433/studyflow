// =====================================================
// 复习队列结算规则（北京时间 UTC+8 硬编码）
// =====================================================
// - 每天北京时间 04:00 结算一次；
// - “今日队列” = 到期时刻 <= 结算日当天 23:59:59.999（北京时间）的所有卡片；
//   即：今天任意时刻到期的卡，都在今天 04:00 统一推送；
// - 北京时间 00:00~04:00 之间，结算日仍算“昨天”（不提前暴露今天任务）；
// - 队列在结算后整天稳定，不会中途冒出新卡片。

const BJ_OFFSET_MS = 8 * 60 * 60 * 1000 // 北京时间 = UTC+8
const SETTLE_HOUR = 4 // 结算时刻：北京时间凌晨 4 点

// 队列截止时刻（UTC 时间戳）：到期 <= 该时刻的卡片进入今日队列
export function queueCutoff(): Date {
  // 当前北京时间“墙上时钟”（用 UTC 字段表示北京 civil time）
  const bj = new Date(Date.now() + BJ_OFFSET_MS)
  const y = bj.getUTCFullYear()
  const m = bj.getUTCMonth()
  const d = bj.getUTCDate()

  // 今天北京时间 04:00 对应的真实 UTC 时刻
  const beijing4amToday = Date.UTC(y, m, d, SETTLE_HOUR) - BJ_OFFSET_MS

  // 现在还没到北京 4:00 → 结算日 = 昨天；否则 = 今天
  const dayOffset = Date.now() >= beijing4amToday ? 0 : -1

  // 结算日当天 23:59:59.999（北京时间）对应的真实 UTC 时刻
  const endOfSettleDay = Date.UTC(y, m, d + dayOffset, 23, 59, 59, 999) - BJ_OFFSET_MS
  return new Date(endOfSettleDay)
}

// 供数据库查询使用（Review / ReviewSession / useStats 调用）
export function endOfTodayIso(): string {
  return queueCutoff().toISOString()
}

// 供界面“待复习”标签使用（CardList 调用）
export function isDueTodayIso(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate).getTime() <= queueCutoff().getTime()
}