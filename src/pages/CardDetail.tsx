import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/useAuthStore'
import { getRetrievability } from '@/lib/fsrs'
import type { CardRow, Subject } from '@/types'
import { ArrowLeft, Pencil, Archive, ArchiveRestore, Trash2, X } from 'lucide-react'

export default function CardDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [card, setCard] = useState<CardRow | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !id) return
    Promise.all([
      supabase.from('cards').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('subjects').select('id, name, color, icon, sort_order').order('sort_order'),
    ]).then(([cardRes, subjectsRes]) => {
      const c = (cardRes.data as CardRow | null) ?? null
      setCard(c)
      setSubjects((subjectsRes.data as Subject[]) ?? [])
      if (c) {
        setTitle(c.title)
        setSubjectId(c.subject_id !== null ? String(c.subject_id) : '')
        setContent(c.content ?? '')
        setImages(c.images ?? [])
      }
      setLoading(false)
    })
  }, [user, id])

  const handleSave = async () => {
    if (!card || !user) return
    if (!title.trim()) {
      setError('标题不能为空')
      return
    }
    setError('')
    setSaving(true)
    const { error: e } = await supabase
      .from('cards')
      .update({
        title: title.trim(),
        subject_id: subjectId ? Number(subjectId) : null,
        content: content.trim() || null,
        images,
        updated_at: new Date().toISOString(),
      })
      .eq('id', card.id)
    setSaving(false)
    if (e) {
      setError('保存失败：' + e.message)
    } else {
      setCard({
        ...card,
        title: title.trim(),
        subject_id: subjectId ? Number(subjectId) : null,
        content: content.trim() || null,
        images,
      })
      setEditing(false)
    }
  }

  const handleArchiveToggle = async () => {
    if (!card) return
    const next = card.status === 'archived' ? 'learning' : 'archived'
    const { error: e } = await supabase
      .from('cards')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', card.id)
    if (!e) setCard({ ...card, status: next })
  }

  const handleDelete = async () => {
    if (!card) return
    const { error: e } = await supabase
      .from('cards')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', card.id)
    if (!e) navigate('/cards')
  }

  if (loading) return <p className="text-slate-400">加载中…</p>

  if (!card) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="mb-4 text-slate-500">卡片不存在或已被删除。</p>
        <Button onClick={() => navigate('/cards')}>返回卡片列表</Button>
      </div>
    )
  }

  const subj = card.subject_id !== null ? subjects.find((s) => s.id === card.subject_id) : undefined
  const r = getRetrievability(card.fsrs_card, card.last_review)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/cards" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> 返回列表
        </Link>
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil size={16} /> 编辑
          </Button>
        )}
      </div>

      {card.status === 'archived' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          此卡片已归档，不会出现在复习队列中。
        </div>
      )}

      {editing ? (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <Label>标题 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>科目</Label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">未分类</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon ?? ''} {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>正文</Label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
            />
          </div>
          {images.length > 0 && (
            <div className="space-y-2">
              <Label>图片（点 × 移除）</Label>
              <div className="flex flex-wrap gap-3">
                {images.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                      className="absolute -right-2 -top-2 rounded-full bg-slate-700 p-1 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false)
                setError('')
              }}
            >
              取消
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="mb-3 flex items-center gap-2">
            {subj && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: subj.color }}
              >
                {subj.icon ?? ''} {subj.name}
              </span>
            )}
            {card.status === 'archived' && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">已归档</span>
            )}
          </div>
          <h1 className="mb-4 text-2xl font-bold text-slate-800">{card.title}</h1>
          {card.content && <p className="mb-4 whitespace-pre-wrap leading-7 text-slate-600">{card.content}</p>}
          {card.images.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3">
              {card.images.map((url) => (
                <img key={url} src={url} alt="" className="max-h-56 rounded-lg border border-slate-200 object-contain" />
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 md:grid-cols-4">
            <div>
              复习次数：<span className="font-semibold text-slate-700">{card.review_count}</span>
            </div>
            <div>
              遗忘次数：<span className="font-semibold text-slate-700">{card.lapses}</span>
            </div>
            <div>
              可提取性：
              <span className="font-semibold text-slate-700">{r !== null ? Math.round(r * 100) + '%' : '—'}</span>
            </div>
            <div>
              下次复习：
              <span className="font-semibold text-slate-700">
                {card.due_date ? new Date(card.due_date).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 底部操作区 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={handleArchiveToggle}>
          {card.status === 'archived' ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          {card.status === 'archived' ? '取消归档' : '归档'}
        </Button>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">确认删除？（复习日志会保留）</span>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              确认删除
            </Button>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              取消
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={16} /> 删除
          </Button>
        )}
      </div>
    </div>
  )
}