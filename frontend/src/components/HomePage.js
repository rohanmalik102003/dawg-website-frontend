'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Home, Search, Plus, MessageCircle, User, Camera, Image as ImageIcon } from 'lucide-react'
import { tasksAPI, applicationsAPI, chatAPI, reviewsAPI, usersAPI } from '@/lib/api'
import { uploadTaskImages, uploadUserAvatar, uploadChatImage } from '@/lib/firebase-storage'
import ReviewModal from './ReviewModal'
import ImageUpload from './ImageUpload'
import LocationPicker from './LocationPicker'
import NotificationCenter from './NotificationCenter'

export default function HomePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [task, setTask] = useState(null)
  const [revieweeUid, setRevieweeUid] = useState(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  // Task creation states
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    budget: '',
    deadline: '',
    preferred_time: '',
    time_flexible: false
  })
  const [taskImages, setTaskImages] = useState([])
  const [uploadingTask, setUploadingTask] = useState(false)

  // Chat states
  const [showChat, setShowChat] = useState(false)
  const [selectedChat, setSelectedChat] = useState(null)
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [uploadingChatImage, setUploadingChatImage] = useState(false)

  // Profile states
  const [showProfile, setShowProfile] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [editProfile, setEditProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    bio: '',
    location: ''
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // User tasks states
  const [userTasks, setUserTasks] = useState([])
  const [taskFilter, setTaskFilter] = useState('all') // all, created, applied, completed

  useEffect(() => {
    fetchTasks()
    if (user) {
      fetchUserProfile()
      fetchUserTasks()
      fetchChats()
    }
  }, [user])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await tasksAPI.getAll()
      setTasks(response.data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await usersAPI.getProfile(user.uid)
      setUserProfile(response.data)
      setProfileForm({
        display_name: response.data.display_name || '',
        bio: response.data.bio || '',
        location: response.data.location || ''
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const fetchUserTasks = async () => {
    try {
      const response = await tasksAPI.getUserTasks(user.uid)
      setUserTasks(response.data || [])
    } catch (error) {
      console.error('Error fetching user tasks:', error)
    }
  }

  const fetchChats = async () => {
    try {
      const response = await chatAPI.getUserChats(user.uid)
      setChats(response.data || [])
    } catch (error) {
      console.error('Error fetching chats:', error)
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setUploadingTask(true)
    
    try {
      // First create task
      const taskData = {
        ...taskForm,
        creator_uid: user.uid
      }
      const taskResponse = await tasksAPI.create(taskData)
      const taskId = taskResponse.data.id
      
      // Upload images if any
      let imageUrls = []
      if (taskImages.length > 0) {
        const uploadResults = await uploadTaskImages(taskImages, taskId, user.uid)
        imageUrls = uploadResults.map(result => result.url)
        
        // Update task with image URLs
        await tasksAPI.update(taskId, { images: imageUrls })
      }
      
      // Reset form
      setShowCreateTask(false)
      setTaskForm({
        title: '',
        description: '',
        category: '',
        location: '',
        budget: '',
        deadline: '',
        preferred_time: '',
        time_flexible: false
      })
      setTaskImages([])
      
      fetchTasks()
      alert('Aufgabe erfolgreich erstellt!')
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Fehler beim Erstellen der Aufgabe: ' + error.message)
    } finally {
      setUploadingTask(false)
    }
  }

  const handleApplyToTask = async (taskId) => {
    try {
      const application = {
        task_id: taskId,
        applicant_uid: user.uid,
        message: 'Ich bin interessiert an dieser Aufgabe!'
      }
      await applicationsAPI.create(application)
      alert('Bewerbung erfolgreich gesendet!')
      fetchTasks()
    } catch (error) {
      console.error('Error applying to task:', error)
    }
  }

  const handleAcceptApplication = async (applicationId, taskId) => {
    try {
      await applicationsAPI.accept(applicationId)
      alert('Bewerbung akzeptiert!')
      fetchTasks()
      fetchUserTasks()
    } catch (error) {
      console.error('Error accepting application:', error)
    }
  }

  const handleCompleteTask = async (taskId) => {
    try {
      await tasksAPI.complete(taskId)
      alert('Aufgabe als abgeschlossen markiert!')
      fetchTasks()
      fetchUserTasks()
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const handleStartChat = async (taskId, otherUserId) => {
    try {
      const chat = await chatAPI.createOrGetChat(taskId, user.uid, otherUserId)
      setSelectedChat(chat.data)
      setShowChat(true)
      fetchMessages(chat.data.id)
    } catch (error) {
      console.error('Error starting chat:', error)
    }
  }

  const fetchMessages = async (chatId) => {
    try {
      const response = await chatAPI.getMessages(chatId)
      setMessages(response.data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      await chatAPI.sendMessage(selectedChat.id, {
        sender_uid: user.uid,
        content: newMessage
      })
      setNewMessage('')
      fetchMessages(selectedChat.id)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleSendChatImage = async (file) => {
    setUploadingChatImage(true)
    try {
      const imageUrl = await uploadChatImage(file, selectedChat.id, user.uid)
      await chatAPI.sendMessage(selectedChat.id, {
        sender_uid: user.uid,
        message_type: 'image',
        image_url: imageUrl
      })
      fetchMessages(selectedChat.id)
    } catch (error) {
      console.error('Error sending image:', error)
      alert('Fehler beim Senden des Bildes: ' + error.message)
    } finally {
      setUploadingChatImage(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      await usersAPI.updateProfile(user.uid, profileForm)
      setEditProfile(false)
      fetchUserProfile()
      alert('Profil erfolgreich aktualisiert!')
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handleAvatarUpload = async (file) => {
    setUploadingAvatar(true)
    try {
      const avatarUrl = await uploadUserAvatar(file, user.uid)
      await usersAPI.updateProfile(user.uid, { avatar_url: avatarUrl })
      fetchUserProfile()
      alert('Profilbild erfolgreich aktualisiert!')
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Fehler beim Hochladen des Profilbildes: ' + error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleShowReview = (taskData, revieweeUid) => {
    setTask(taskData)
    setRevieweeUid(revieweeUid)
    setShowReviewModal(true)
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || task.category === selectedCategory
    const matchesStatus = !selectedStatus || task.status === selectedStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const filteredUserTasks = userTasks.filter(task => {
    if (taskFilter === 'created') return task.creator_uid === user?.uid
    if (taskFilter === 'applied') return task.applications?.some(app => app.applicant_uid === user?.uid)
    if (taskFilter === 'completed') return task.status === 'completed'
    return true
  })

  const categories = ['Haushalt', 'Garten', 'Handwerk', 'Transport', 'Einkaufen', 'Sonstiges']

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">DoIt</h1>
            {user && <NotificationCenter />}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* Home Tab */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Aufgaben suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Alle Kategorien</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Alle Status</option>
                      <option value="open">Offen</option>
                      <option value="matched">Vergeben</option>
                      <option value="completed">Abgeschlossen</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-600">Aufgaben werden geladen...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Keine Aufgaben gefunden.</p>
                  </div>
                ) : (
                  filteredTasks.map(task => (
                    <div key={task.id} className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
                          <p className="text-gray-600 mt-1">{task.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.status === 'open' ? 'bg-green-100 text-green-800' :
                          task.status === 'matched' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'open' ? 'Offen' : 
                           task.status === 'matched' ? 'Vergeben' : 'Abgeschlossen'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span>📍 {task.location}</span>
                        <span>🏷️ {task.category}</span>
                        {task.budget && <span>💰 {task.budget}€</span>}
                      </div>
                      <div className="flex gap-2">
                        {task.creator_uid !== user?.uid && task.status === 'open' && (
                          <button
                            onClick={() => handleApplyToTask(task.id)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Bewerben
                          </button>
                        )}
                        {task.creator_uid === user?.uid && task.applications && task.applications.length > 0 && (
                          <div className="flex gap-2">
                            {task.applications.map(app => (
                              <div key={app.id} className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">{app.applicant_name}</span>
                                <button
                                  onClick={() => handleAcceptApplication(app.id, task.id)}
                                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                >
                                  Akzeptieren
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {task.status === 'matched' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartChat(task.id, task.creator_uid === user?.uid ? task.tasker_uid : task.creator_uid)}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              Chat
                            </button>
                            {task.creator_uid === user?.uid && (
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                              >
                                Abschließen
                              </button>
                            )}
                          </div>
                        )}
                        {task.status === 'completed' && (
                          <button
                            onClick={() => handleShowReview(task, task.creator_uid === user?.uid ? task.tasker_uid : task.creator_uid)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                          >
                            Bewerten
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Create Task Tab */}
          {activeTab === 'create' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Neue Aufgabe erstellen</h2>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                  <input
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <textarea
                    required
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                    <select
                      required
                      value={taskForm.category}
                      onChange={(e) => setTaskForm({...taskForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Kategorie wählen</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget (€)</label>
                    <input
                      type="number"
                      value={taskForm.budget}
                      onChange={(e) => setTaskForm({...taskForm, budget: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standort</label>
                  <LocationPicker
                    onLocationSelect={(location) => {
                      setTaskForm({
                        ...taskForm, 
                        location: location.address,
                        latitude: location.latitude,
                        longitude: location.longitude
                      })
                    }}
                    initialLocation={taskForm.location}
                    disabled={uploadingTask}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={taskForm.deadline}
                      onChange={(e) => setTaskForm({...taskForm, deadline: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bevorzugte Zeit</label>
                    <select
                      value={taskForm.preferred_time}
                      onChange={(e) => setTaskForm({...taskForm, preferred_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Keine Präferenz</option>
                      <option value="morning">Morgens</option>
                      <option value="afternoon">Nachmittags</option>
                      <option value="evening">Abends</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={taskForm.time_flexible}
                    onChange={(e) => setTaskForm({...taskForm, time_flexible: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">Zeitlich flexibel</label>
                </div>
                
                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Bilder (optional)
                  </label>
                  <ImageUpload
                    images={taskImages}
                    onImagesChange={setTaskImages}
                    maxImages={3}
                    disabled={uploadingTask}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={uploadingTask}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadingTask ? 'Aufgabe wird erstellt...' : 'Aufgabe erstellen'}
                </button>
              </form>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              {!showChat ? (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Chats</h2>
                  {chats.length === 0 ? (
                    <p className="text-gray-600">Keine Chats vorhanden.</p>
                  ) : (
                    <div className="space-y-4">
                      {chats.map(chat => (
                        <div key={chat.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                             onClick={() => {
                               setSelectedChat(chat)
                               setShowChat(true)
                               fetchMessages(chat.id)
                             }}>
                          <h3 className="font-medium">{chat.task_title}</h3>
                          <p className="text-sm text-gray-600">Mit: {chat.other_user_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {chat.last_message_at ? new Date(chat.last_message_at).toLocaleString() : 'Keine Nachrichten'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">{selectedChat.task_title}</h2>
                    <button
                      onClick={() => setShowChat(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="h-96 border border-gray-200 rounded-lg p-4 mb-4 overflow-y-auto">
                    {messages.length === 0 ? (
                      <p className="text-gray-500">Keine Nachrichten vorhanden.</p>
                    ) : (
                      messages.map(message => (
                        <div key={message.id} className={`mb-4 ${message.sender_uid === user?.uid ? 'text-right' : 'text-left'}`}>
                          <div className={`inline-block p-3 rounded-lg max-w-xs ${
                            message.sender_uid === user?.uid 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {message.message_type === 'image' ? (
                              <div>
                                <img 
                                  src={message.image_url} 
                                  alt="Chat Bild" 
                                  className="max-w-full rounded-lg cursor-pointer"
                                  onClick={() => window.open(message.image_url, '_blank')}
                                />
                              </div>
                            ) : (
                              <p>{message.content}</p>
                            )}
                            <p className="text-xs mt-1 opacity-75">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <form onSubmit={handleSendMessage} className="flex flex-1">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Nachricht eingeben..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600"
                      >
                        Senden
                      </button>
                    </form>
                    
                    {/* Image Upload Button */}
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) handleSendChatImage(file)
                        }}
                        disabled={uploadingChatImage}
                        className="hidden"
                        id="chat-image-upload"
                      />
                      <label
                        htmlFor="chat-image-upload"
                        className={`flex items-center justify-center w-10 h-10 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 ${
                          uploadingChatImage ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploadingChatImage ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                        ) : (
                          <ImageIcon size={16} className="text-gray-500" />
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Profil</h2>
                <button
                  onClick={() => setEditProfile(!editProfile)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editProfile ? 'Abbrechen' : 'Bearbeiten'}
                </button>
              </div>

              {editProfile ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename</label>
                    <input
                      type="text"
                      value={profileForm.display_name}
                      onChange={(e) => setProfileForm({...profileForm, display_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Standort</label>
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
                  >
                    Profil speichern
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Profile Picture Section */}
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gray-200 rounded-full overflow-hidden">
                        {userProfile?.avatar_url ? (
                          <img 
                            src={userProfile.avatar_url} 
                            alt="Profilbild" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={32} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) handleAvatarUpload(file)
                        }}
                        disabled={uploadingAvatar}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className={`absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 cursor-pointer hover:bg-blue-600 ${
                          uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Camera size={16} />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-800">{userProfile?.display_name || 'Kein Name'}</h3>
                      <p className="text-gray-600">{userProfile?.email}</p>
                      {uploadingAvatar && <p className="text-sm text-blue-500">Bild wird hochgeladen...</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">Bio</h4>
                    <p className="text-gray-600">{userProfile?.bio || 'Keine Bio verfügbar'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">Standort</h4>
                    <p className="text-gray-600">{userProfile?.location || 'Kein Standort'}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">{userProfile?.completed_tasks || 0}</p>
                      <p className="text-sm text-gray-600">Abgeschlossene Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">{userProfile?.posted_tasks || 0}</p>
                      <p className="text-sm text-gray-600">Erstellte Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-500">{userProfile?.rating || 0}</p>
                      <p className="text-sm text-gray-600">Bewertung</p>
                    </div>
                  </div>
                </div>
              )}

              {/* User Tasks Section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Meine Aufgaben</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTaskFilter('all')}
                      className={`px-3 py-1 rounded-lg text-sm ${taskFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setTaskFilter('created')}
                      className={`px-3 py-1 rounded-lg text-sm ${taskFilter === 'created' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Erstellt
                    </button>
                    <button
                      onClick={() => setTaskFilter('applied')}
                      className={`px-3 py-1 rounded-lg text-sm ${taskFilter === 'applied' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Beworben
                    </button>
                    <button
                      onClick={() => setTaskFilter('completed')}
                      className={`px-3 py-1 rounded-lg text-sm ${taskFilter === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Abgeschlossen
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredUserTasks.length === 0 ? (
                    <p className="text-gray-500">Keine Aufgaben gefunden.</p>
                  ) : (
                    filteredUserTasks.map(task => (
                      <div key={task.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-800">{task.title}</h4>
                            <p className="text-sm text-gray-600">{task.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {task.status === 'open' ? 'Offen' : 
                               task.status === 'matched' ? 'Vergeben' : 'Abgeschlossen'}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {task.applications?.length || 0} Bewerbungen
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex justify-around py-2">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center py-2 px-3 rounded-lg ${activeTab === 'home' ? 'text-blue-500 bg-blue-50' : 'text-gray-600'}`}
              >
                <Home size={20} />
                <span className="text-xs mt-1">Home</span>
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex flex-col items-center py-2 px-3 rounded-lg ${activeTab === 'create' ? 'text-blue-500 bg-blue-50' : 'text-gray-600'}`}
              >
                <Plus size={20} />
                <span className="text-xs mt-1">Erstellen</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex flex-col items-center py-2 px-3 rounded-lg ${activeTab === 'chat' ? 'text-blue-500 bg-blue-50' : 'text-gray-600'}`}
              >
                <MessageCircle size={20} />
                <span className="text-xs mt-1">Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center py-2 px-3 rounded-lg ${activeTab === 'profile' ? 'text-blue-500 bg-blue-50' : 'text-gray-600'}`}
              >
                <User size={20} />
                <span className="text-xs mt-1">Profil</span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          task={task}
          revieweeUid={revieweeUid}
          onClose={() => setShowReviewModal(false)}
          onSubmit={() => {
            fetchTasks()
            fetchUserTasks()
          }}
        />
      )}
    </>
  )
}