import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/useAuthStore'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) { setError('密码至少需要 6 位'); return }
    if (password !== confirm) { setError('两次输入的密码不一致'); return }

    setLoading(true)
    const { data: codeOk, error: rpcError } = await supabase.rpc('check_invite_code', { code: inviteCode.trim() })
    if (rpcError || !codeOk) {
      setError('邀请码不正确。本系统为私密系统，注册需要邀请码。')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    if (data.session) {
      await supabase.rpc('ensure_my_invite_code')
      navigate('/')
    } else {
      setError('账号已创建，但需要邮箱确认：请去邮箱点确认链接后再登录。')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="text-4xl">🌱</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">加入 StudyFlow</h1>
          <p className="mt-1 text-sm text-slate-500">私密学习空间 · 需要邀请码才能注册</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码（至少 6 位）</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">确认密码</Label>
            <Input id="confirm" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite">邀请码</Label>
            <Input id="invite" placeholder="输入你收到的邀请码" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '注册中...' : '注册并进入'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          已经有账号了？{' '}
          <Link to="/login" className="font-medium text-slate-700 underline">去登录</Link>
        </p>
      </div>
    </div>
  )
}