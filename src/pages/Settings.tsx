import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/useAuthStore'
import { Copy, Check, Ticket } from 'lucide-react'

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [examDate, setExamDate] = useState('')
  const [dailyLimit, setDailyLimit] = useState('50')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const loadSettings = () => {
    if (!user) return
    supabase
      .from('settings')
      .select('invite_code, daily_limit')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setInviteCode(data.invite_code)
          setDailyLimit(String(data.daily_limit ?? 50))
        }
      })
    supabase
      .from('profiles')
      .select('exam_date')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data && data.exam_date) setExamDate(data.exam_date)
      })
  }

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleCopy = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('复制失败，请手动选中邀请码复制')
    }
  }

  const handleGenerate = async () => {
    await supabase.rpc('ensure_my_invite_code')
    loadSettings()
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setSaving(true)
    const limit = Number(dailyLimit)
    const { error: e1 } = await supabase
      .from('profiles')
      .update({ exam_date: examDate || null })
      .eq('id', user.id)
    const { error: e2 } = await supabase
      .from('settings')
      .update({
        daily_limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
    setSaving(false)
    if (e1 || e2) {
      setError('保存失败：' + (e1?.message || e2?.message || '未知错误'))
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">设置</h1>

      {/* 邀请码 */}
      <section className="rounded-2xl bg-white border border-slate-200 p-6 mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Ticket size={20} className="text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">我的邀请码</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          只有知道这串码的人才能注册本系统。把它发给你女朋友即可。
        </p>
        {inviteCode ? (
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-slate-100 px-4 py-3 font-mono text-lg font-bold tracking-widest text-slate-800">
              {inviteCode}
            </code>
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '已复制' : '复制'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">还没有生成</span>
            <Button variant="outline" onClick={handleGenerate}>立即生成邀请码</Button>
          </div>
        )}
      </section>

      {/* 学习设置 */}
      <form onSubmit={handleSave} className="space-y-5 rounded-2xl bg-white border border-slate-200 p-6">
        <div className="space-y-2">
          <Label htmlFor="examDate">高考目标日期</Label>
          <Input id="examDate" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          <p className="text-xs text-slate-400">
            仅用于算法判断：被排到该日期之后的复习会自动提前；首页不会显示倒计时，不制造焦虑。
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dailyLimit">每日复习上限（张）</Label>
          <Input
            id="dailyLimit"
            type="number"
            min={1}
            max={500}
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
          />
          <p className="text-xs text-slate-400">超出上限的卡片自动顺延到第二天，避免被压垮。</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存设置'}</Button>
          {saved && <span className="text-sm text-green-600">已保存 ✅</span>}
        </div>
      </form>
    </div>
  )
}