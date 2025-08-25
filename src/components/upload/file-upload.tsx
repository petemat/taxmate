'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { generateStoragePath, formatFileSize } from '@/lib/utils'
import { Camera, Upload, FileText, Loader2, X } from 'lucide-react'

interface FileUploadProps {
  onUploadComplete: (fileUrl: string, fileName: string) => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Nur JPG, PNG, WebP und PDF Dateien sind erlaubt.'
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `Datei ist zu groß. Maximum: ${formatFileSize(MAX_FILE_SIZE)}`
    }
    
    return null
  }

  const uploadFile = async (file: File) => {
    console.log('Starting upload for file:', file.name, 'User:', user?.id)
    
    if (!user) {
      toast({
        title: 'Nicht angemeldet',
        description: 'Sie müssen angemeldet sein, um Dateien hochzuladen.',
        variant: 'destructive',
      })
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      toast({
        title: 'Ungültige Datei',
        description: validationError,
        variant: 'destructive',
      })
      return
    }

    setUploading(true)

    try {
      const filePath = generateStoragePath(user.id, file.name)
      console.log('Uploading to path:', filePath)
      
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      console.log('Upload result:', { data, error })

      if (error) {
        console.error('Supabase storage error:', error)
        throw error
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(data.path)

      toast({
        title: 'Upload erfolgreich',
        description: `${file.name} wurde hochgeladen.`,
      })

      onUploadComplete(publicUrl, file.name)
      setSelectedFile(null)
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload fehlgeschlagen',
        description: 'Die Datei konnte nicht hochgeladen werden. Bitte versuchen Sie es erneut.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Upload area */}
      <Card className={`transition-colors ${dragOver ? 'border-primary bg-primary/5' : ''}`}>
        <CardContent className="p-4 sm:p-6">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-8 text-center transition-colors hover:border-muted-foreground/50"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  {selectedFile.type.startsWith('image/') ? (
                    <FileText className="h-12 w-12 text-primary" />
                  ) : (
                    <FileText className="h-12 w-12 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    onClick={() => uploadFile(selectedFile)}
                    disabled={uploading}
                    className="w-full sm:w-auto"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Wird hochgeladen...
                      </>
                    ) : (
                      'Hochladen'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearSelectedFile}
                    disabled={uploading}
                    className="w-full sm:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium">Beleg hochladen</p>
                  <p className="text-sm text-muted-foreground">
                    Ziehen Sie eine Datei hierher oder wählen Sie eine aus
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG, WebP oder PDF • Max. {formatFileSize(MAX_FILE_SIZE)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={openCamera} variant="outline" className="w-full sm:w-auto">
                    <Camera className="mr-2 h-4 w-4" />
                    Kamera
                  </Button>
                  <Button onClick={openFileDialog} variant="outline" className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Datei wählen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload progress or instructions */}
      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                Datei wird hochgeladen und KI-Extraktion wird gestartet...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
