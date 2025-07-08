import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'
import imageCompression from 'browser-image-compression'

// Image compression options
const compressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
  fileType: 'image/jpeg'
}

/**
 * Upload user avatar to Firebase Storage
 */
export const uploadUserAvatar = async (file, userId) => {
  try {
    console.log('Starting avatar upload for user:', userId)
    
    // Compress image
    const compressedFile = await imageCompression(file, compressionOptions)
    console.log('Image compressed:', {
      originalSize: file.size,
      compressedSize: compressedFile.size
    })
    
    // Create reference
    const fileName = `avatar_${Date.now()}.jpg`
    const storageRef = ref(storage, `avatars/${userId}/${fileName}`)
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, compressedFile)
    console.log('File uploaded successfully:', snapshot.metadata.fullPath)
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    console.log('Download URL:', downloadURL)
    
    return downloadURL
  } catch (error) {
    console.error('Error uploading avatar:', error)
    throw new Error('Fehler beim Hochladen des Profilbildes: ' + error.message)
  }
}

/**
 * Upload task images to Firebase Storage
 */
export const uploadTaskImages = async (files, taskId, userId) => {
  try {
    console.log('Starting task images upload:', { taskId, userId, fileCount: files.length })
    
    const uploadPromises = files.map(async (file, index) => {
      // Compress image
      const compressedFile = await imageCompression(file, compressionOptions)
      
      // Create reference
      const fileName = `task_${taskId}_${index}_${Date.now()}.jpg`
      const storageRef = ref(storage, `tasks/${userId}/${taskId}/${fileName}`)
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, compressedFile)
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      return {
        url: downloadURL,
        fileName: fileName,
        path: snapshot.metadata.fullPath
      }
    })
    
    const results = await Promise.all(uploadPromises)
    console.log('All task images uploaded:', results)
    
    return results
  } catch (error) {
    console.error('Error uploading task images:', error)
    throw new Error('Fehler beim Hochladen der Bilder: ' + error.message)
  }
}

/**
 * Upload chat image to Firebase Storage
 */
export const uploadChatImage = async (file, chatId, userId) => {
  try {
    console.log('Starting chat image upload:', { chatId, userId })
    
    // Compress image
    const compressedFile = await imageCompression(file, compressionOptions)
    
    // Create reference
    const fileName = `chat_${Date.now()}.jpg`
    const storageRef = ref(storage, `chats/${chatId}/${fileName}`)
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, compressedFile)
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    console.log('Chat image uploaded:', downloadURL)
    return downloadURL
  } catch (error) {
    console.error('Error uploading chat image:', error)
    throw new Error('Fehler beim Hochladen des Bildes: ' + error.message)
  }
}

/**
 * Delete file from Firebase Storage
 */
export const deleteFile = async (filePath) => {
  try {
    const storageRef = ref(storage, filePath)
    await deleteObject(storageRef)
    console.log('File deleted successfully:', filePath)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw new Error('Fehler beim Löschen der Datei: ' + error.message)
  }
}

/**
 * Validate image file
 */
export const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Nur JPEG, PNG und WebP Bilder sind erlaubt')
  }
  
  if (file.size > maxSize) {
    throw new Error('Bild ist zu groß. Maximum: 10MB')
  }
  
  return true
}

/**
 * Create image preview URL
 */
export const createImagePreview = (file) => {
  return URL.createObjectURL(file)
}

/**
 * Cleanup preview URL
 */
export const cleanupImagePreview = (url) => {
  URL.revokeObjectURL(url)
}