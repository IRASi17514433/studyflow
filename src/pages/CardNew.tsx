import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/useAuthStore'
import type { Subject } from '@/types'
import { ImagePlus, X } from 'lucide-react'

export default function CardNew() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('subjects')
      .select('id, name, color, icon, sort_order')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setSubjects(data as Subject[])
      })
  }, [])

  const handleFiles = (list: FileList | null) => {
    if (!list) return
    const arr = Array.from(list)
    setFiles((prev) => [...prev, ...arr])
    arr.forEach((f) => setPreviews((prev) => [...prev, URL.createObjectURL(f)]))
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!title.trim()) {
      setError('请填写标题')
      return
    }
    if (!subjectId) {
      setError('请选择科目')
      return
    }
    setError('')
    setSaving(true)

    try {
      // 1. 上传图片
      const urls: string[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'png'
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage.from('card-images').upload(path, file)
        if (upErr) throw new Error('图片上传失败：' + upErr.message)
        const { data: urlData } = supabase.storage.from('card-images').getPublicUrl(path)
        urls.push(urlData.publicUrl)
      }

      // 2. 保存卡片：due = 录入时刻 → 立即进入今日队列（第 0 轮快速回顾）
      const { error: dbErr } = await supabase.from('cards').insert({
        user_id: user.id,
        subject_id: Number(subjectId),
        title: title.trim(),
        content: content.trim() || null,
        images: urls,
        status: 'learning',
        due_date: new Date().toISOString(),
        review_count: 0,
        lapses: 0,
      })
      if (dbErr) throw new Error('保存卡片失败：' + dbErr.message)

      navigate('/cards')
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">新建知识卡片</h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="space-y-2">
          <Label htmlFor="title">标题 *</Label>
          <Input
            id="title"
            placeholder="例如：牛顿第二定律"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">科目 *</Label>
          <select
            id="subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">请选择科目</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon ?? ''} {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">正文（笔记、公式、口诀等）</Label>
          <textarea
            id="content"
            rows={8}
            placeholder="把这个知识点的内容写在这里…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
          />
        </div>

        <div className="space-y-2">
          <Label>图片（可选，可多选）</Label>
          <div className="flex flex-wrap gap-3">
            {previews.map((p, i) => (
              <div key={p} className="relative">
                <img src={p} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -right-2 -top-2 rounded-full bg-slate-700 p-1 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400">
              <ImagePlus size={20} />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存卡片'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/cards')}>取消</Button>
        </div>
      </form>
    </div>
  )
}