'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { FileUpload } from '@/components/upload/file-upload'
import { ReceiptTable } from '@/components/receipts/receipt-table'
import { ReceiptDetailModal } from '@/components/receipts/receipt-detail-modal'
import { ReceiptSummary } from '@/components/receipts/receipt-summary'
import { ReceiptEditForm } from '@/components/receipts/receipt-edit-form'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { LogOut, Plus, RefreshCw } from 'lucide-react'

type Receipt = Database['public']['Tables']['receipts']['Row']

export function Dashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    console.log('Dashboard - User state:', user?.id, user?.email)
    if (user) {
      fetchReceipts()
    }
  }, [user])

  // Safety timeout to ensure dashboard loading doesn't hang indefinitely
  useEffect(() => {
    const safetyId = setTimeout(() => {
      if (loading) {
        console.warn('Dashboard safety timeout - forcing loading to false')
        setLoading(false)
      }
    }, 10000) // 10s safety net
    return () => clearTimeout(safetyId)
  }, [])

  const fetchReceipts = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setReceipts(data || [])
    } catch (error) {
      console.error('Error fetching receipts:', error)
      toast({
        title: 'Fehler beim Laden',
        description: 'Die Belege konnten nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = async (fileUrl: string, fileName: string) => {
    if (!user) return

    try {
      // Create a new receipt entry
      const { data, error } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          source_file_url: fileUrl,
          needs_review: true,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Refresh the receipts list
      await fetchReceipts()
      
      toast({
        title: 'Beleg hinzugefügt',
        description: 'Der Beleg wurde hochgeladen und wird verarbeitet.',
      })

      setShowUpload(false)

      const triggerOCR = async (receiptId: string) => {
        try {
          // Add timeout to prevent hanging
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

          const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ receiptId }),
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error('OCR processing failed')
          }

          const result = await response.json()
          console.log('OCR result:', result)

          // Refresh receipts to show updated data
          await fetchReceipts()

          toast({
            title: 'OCR erfolgreich',
            description: 'Beleg wurde automatisch verarbeitet.',
          })
        } catch (error) {
          console.error('OCR error:', error)
          if (error instanceof Error && error.name === 'AbortError') {
            toast({
              title: 'OCR Timeout',
              description: 'Die Verarbeitung dauert zu lange. Versuchen Sie es erneut.',
              variant: 'destructive',
            })
          } else {
            toast({
              title: 'OCR fehlgeschlagen',
              description: 'Die automatische Verarbeitung ist fehlgeschlagen.',
              variant: 'destructive',
            })
          }
        }
      }

      // Don't await OCR - let it run in background
      triggerOCR(data.id)
      
    } catch (error) {
      console.error('Error creating receipt:', error)
      toast({
        title: 'Fehler',
        description: 'Der Beleg konnte nicht gespeichert werden.',
        variant: 'destructive',
      })
    }
  }

  const handleEditReceipt = (receipt: Receipt) => {
    setEditingReceipt(receipt)
    setShowUpload(false)
  }

  const handleViewReceipt = (receipt: Receipt) => {
    setViewingReceipt(receipt)
  }

  const handleRefresh = () => {
    fetchReceipts()
  }

  const handleDeleteReceipt = async (receipt: Receipt) => {
    if (!user) return

    console.log('Deleting receipt:', receipt.id)

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receipt.id)
        .eq('user_id', user.id) // Security: only delete own receipts

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }

      console.log('Receipt deleted successfully')

      // Refresh the receipts list
      await fetchReceipts()
      
      toast({
        title: 'Beleg gelöscht',
        description: 'Der Beleg wurde erfolgreich entfernt.',
      })
    } catch (error) {
      console.error('Error deleting receipt:', error)
      toast({
        title: 'Fehler',
        description: 'Der Beleg konnte nicht gelöscht werden.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveReceipt = async () => {
    await fetchReceipts()
    setEditingReceipt(null)
  }

  const handleCancelEdit = () => {
    setEditingReceipt(null)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      // Clear any cached auth state
      window.location.href = '/'
      toast({
        title: 'Abgemeldet',
        description: 'Sie wurden erfolgreich abgemeldet.',
      })
    } catch (error) {
      console.error('Sign out error:', error)
      toast({
        title: 'Fehler',
        description: 'Beim Abmelden ist ein Fehler aufgetreten.',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center">
                <span className="text-sm font-semibold text-white">T</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-medium text-gray-900">TaxMate</h1>
                <p className="text-xs text-gray-500">Belege verwalten und Steuern optimieren</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-medium text-gray-900">TaxMate</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                onClick={() => setShowUpload(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-normal px-3 py-2 sm:px-4"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Beleg hinzufügen</span>
              </Button>
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={signOut}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm"
              >
                <span className="hidden sm:inline">Abmelden</span>
                <LogOut className="h-4 w-4 sm:hidden" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <div className="space-y-4 sm:space-y-8">
          {/* Upload Section */}
          {showUpload && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Beleg hochladen</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>
              <FileUpload onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {/* Summary Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Übersicht</h2>
            <ReceiptSummary receipts={receipts} />
          </div>

          {/* Receipts Table */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <ReceiptTable
              receipts={receipts}
              onEditReceipt={handleEditReceipt}
              onViewReceipt={handleViewReceipt}
              onDeleteReceipt={handleDeleteReceipt}
            />
          </div>

          {/* Empty State */}
          {receipts.length === 0 && !showUpload && (
            <div className="bg-white rounded-lg border border-gray-200 p-12">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Plus className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Belege</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto text-sm">
                  Laden Sie Ihren ersten Beleg hoch, um mit der automatischen Extraktion und Verwaltung zu beginnen.
                </p>
                <Button 
                  onClick={() => setShowUpload(true)}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 text-sm font-normal"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ersten Beleg hinzufügen
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Receipt Detail Modal */}
      <ReceiptDetailModal
        receipt={viewingReceipt}
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
      />

      {/* Receipt Edit Form Modal */}
      {editingReceipt && (
        <ReceiptEditForm
          receipt={editingReceipt}
          onSave={handleSaveReceipt}
          onCancel={() => setEditingReceipt(null)}
        />
      )}
    </div>
  )
}
