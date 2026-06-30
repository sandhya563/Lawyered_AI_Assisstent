'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { willApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { FileText, Plus, LogOut } from 'lucide-react'

interface WillSummary {
  id: string
  status: string
  testatorFullName: string | null
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, token, logout, hydrate } = useAuthStore()
  const [wills, setWills] = useState<WillSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hydrate()
  }, [])

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadWills()
  }, [token])

  const loadWills = async () => {
    try {
      const { data } = await willApi.getAll()
      setWills(data)
    } catch (error) {
      toast.error('Failed to load wills')
    } finally {
      setLoading(false)
    }
  }

  const startNewWill = async () => {
    try {
      const { data } = await willApi.create()
      router.push(`/will/${data.id}`)
    } catch (error) {
      toast.error('Failed to create will')
    }
  }

  const continueWill = (willId: string) => {
    router.push(`/will/${willId}`)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'complete': return 'Complete'
      case 'in_progress': return 'In Progress'
      case 'draft': return 'Draft'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">AI Will Maker</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">My Wills</h2>
          <button onClick={startNewWill} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            New Will
          </button>
        </div>

        {wills.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No wills yet</h3>
            <p className="text-gray-600 mb-6">Create your first will with our AI assistant.</p>
            <button onClick={startNewWill} className="btn-primary">
              Start Creating Your Will
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {wills.map((will) => (
              <div key={will.id} className="card p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {will.testatorFullName || 'Untitled Will'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Last updated: {new Date(will.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(will.status)}`}>
                    {statusLabel(will.status)}
                  </span>
                  <button
                    onClick={() => continueWill(will.id)}
                    className="btn-secondary text-sm"
                  >
                    {will.status === 'complete' ? 'View' : 'Continue'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
