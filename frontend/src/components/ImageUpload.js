'use client'

import { useState, useRef } from 'react'
import { Camera, X, Upload } from 'lucide-react'
import { validateImageFile, createImagePreview, cleanupImagePreview } from '@/lib/firebase-storage'

export default function ImageUpload({ 
  images = [], 
  onImagesChange, 
  maxImages = 3, 
  disabled = false 
}) {
  const [previews, setPreviews] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()

  const handleFileSelect = (files) => {
    const newFiles = []
    const newPreviews = []

    Array.from(files).slice(0, maxImages - images.length).forEach(file => {
      try {
        validateImageFile(file)
        newFiles.push(file)
        newPreviews.push({
          file,
          url: createImagePreview(file),
          id: Date.now() + Math.random()
        })
      } catch (error) {
        alert(error.message)
      }
    })

    if (newFiles.length > 0) {
      const updatedImages = [...images, ...newFiles]
      const updatedPreviews = [...previews, ...newPreviews]
      
      onImagesChange(updatedImages)
      setPreviews(updatedPreviews)
    }
  }

  const handleFileInput = (e) => {
    handleFileSelect(e.target.files)
    e.target.value = '' // Reset input
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!disabled) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index)
    const updatedPreviews = previews.filter((_, i) => i !== index)
    
    // Cleanup preview URL
    if (previews[index]) {
      cleanupImagePreview(previews[index].url)
    }
    
    onImagesChange(updatedImages)
    setPreviews(updatedPreviews)
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : disabled
              ? 'border-gray-200 bg-gray-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            disabled={disabled}
            className="hidden"
          />
          
          <div className="text-center">
            <div className="flex justify-center mb-3">
              {dragOver ? (
                <Upload className="h-8 w-8 text-blue-500" />
              ) : (
                <Camera className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {dragOver
                ? 'Bilder hier ablegen...'
                : 'Bilder hochladen oder hierher ziehen'
              }
            </p>
            <button
              type="button"
              onClick={openFileDialog}
              disabled={disabled}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Bilder auswählen
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Bis zu {maxImages} Bilder, max. 10MB pro Bild
            </p>
          </div>
        </div>
      )}

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previews.map((preview, index) => (
            <div key={preview.id} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={preview.url}
                  alt={`Vorschau ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              )}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {Math.round(preview.file.size / 1024)}KB
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Info */}
      {images.length > 0 && (
        <div className="text-sm text-gray-600">
          {images.length} von {maxImages} Bildern ausgewählt
        </div>
      )}
    </div>
  )
}