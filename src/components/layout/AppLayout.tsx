import { useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, Brain, BarChart3, Settings as SettingsIcon, LogOut, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { supabase } from '@/lib/supabase'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)

  useEffect(() => {
    supabase.rpc('ensure_my_invite_code').then(() => {})
  }, [])

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/cards', label: '知识卡片', icon: BookOpen },
    { path: '/review', label: '开始复习', icon: Brain },
    { path: '/stats', label: '学习统计', icon: BarChart3 },
  ]

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 桌面侧边栏 */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 hidden md:flex flex-col">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <span className="text-3xl">🌱</span> StudyFlow
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            title="切换深浅色模式"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors",
                  isActive && "bg-slate-100 text-slate-900 font-medium"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="space-y-1 border-t border-slate-200 pt-4">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors",
              location.pathname === '/settings' && "bg-slate-100 text-slate-900 font-medium"
            )}
          >
            <SettingsIcon size={20} /> 设置
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <LogOut size={20} /> 退出登录
          </button>
        </div>
      </aside>

      {/* 移动端：顶栏 + 内容 + 底部导航 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="text-2xl">🌱</span> StudyFlow
          </div>
          <button onClick={toggleTheme} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10 overflow-auto">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2 text-xs text-slate-500',
              location.pathname === item.path && 'text-slate-900 font-medium'
            )}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}