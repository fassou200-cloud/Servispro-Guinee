import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Bell, X, Check, CheckCheck, CreditCard, Briefcase, 
  AlertCircle, MessageCircle, Clock, Phone, Volume2, VolumeX
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Audio context for Web Audio API
let audioContext = null;
let isAudioUnlocked = false;

// Create and play notification sound using Web Audio API
const playNotificationBeep = async () => {
  try {
    // Create or resume audio context
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume if suspended (browser policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const now = audioContext.currentTime;
    
    // Create oscillator for the sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant two-tone notification (C5 -> E5 -> G5)
    oscillator.frequency.setValueAtTime(523.25, now);        // C5
    oscillator.frequency.setValueAtTime(659.25, now + 0.12); // E5
    oscillator.frequency.setValueAtTime(783.99, now + 0.24); // G5
    
    // Volume envelope (fade in, sustain, fade out)
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.03);
    gainNode.gain.setValueAtTime(0.4, now + 0.12);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.24);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
    
    oscillator.type = 'sine';
    oscillator.start(now);
    oscillator.stop(now + 0.45);
    
    isAudioUnlocked = true;
    return true;
  } catch (e) {
    console.log('Web Audio error:', e.message);
    return false;
  }
};

// Unlock audio on first user interaction
const unlockAudio = async () => {
  if (isAudioUnlocked) return true;
  
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    isAudioUnlocked = true;
    console.log('Audio context unlocked');
    return true;
  } catch (e) {
    console.log('Audio unlock failed:', e.message);
    return false;
  }
};

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'payment_received':
      return <CreditCard className="h-5 w-5 text-green-500" />;
    case 'service_request':
      return <Briefcase className="h-5 w-5 text-blue-500" />;
    case 'job_accepted':
    case 'visit_accepted':
      return <Check className="h-5 w-5 text-emerald-500" />;
    case 'job_rejected':
    case 'visit_rejected':
    case 'visit_rejected_credit':
      return <X className="h-5 w-5 text-red-500" />;
    case 'job_completed':
      return <CheckCheck className="h-5 w-5 text-purple-500" />;
    case 'system':
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    case 'visit_request':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'refund_approved':
      return <CreditCard className="h-5 w-5 text-green-500" />;
    case 'refund_rejected':
      return <CreditCard className="h-5 w-5 text-red-500" />;
    case 'provider_no_show_credit':
      return <CreditCard className="h-5 w-5 text-orange-500" />;
    default:
      return <MessageCircle className="h-5 w-5 text-gray-500" />;
  }
};

const NotificationBell = ({ userType = 'provider' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  const getToken = () => {
    if (userType === 'provider') {
      return localStorage.getItem('token');
    } else if (userType === 'customer') {
      return localStorage.getItem('customerToken');
    }
    return null;
  };

  // Play notification sound
  const triggerNotificationSound = useCallback(async () => {
    if (!soundEnabled) return;
    await playNotificationBeep();
  }, [soundEnabled]);

  // Trigger vibration
  const triggerVibration = useCallback(() => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.log('Vibration not supported');
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((title, message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200]
      });
    }
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchNotifications = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      const endpoint = userType === 'provider' 
        ? `${API}/notifications/provider`
        : `${API}/notifications/customer`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const endpoint = userType === 'provider'
        ? `${API}/notifications/unread-count/provider`
        : `${API}/notifications/unread-count/customer`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newCount = response.data.unread_count || 0;
      
      // Check if we have new notifications
      if (newCount > lastNotificationCount && lastNotificationCount > 0) {
        // New notification arrived!
        triggerNotificationSound();
        triggerVibration();
        
        // Try to show browser notification
        showBrowserNotification(
          'Nouvelle notification ServisPro',
          'Vous avez reçu une nouvelle notification'
        );
      }
      
      setLastNotificationCount(newCount);
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setLastNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const endpoint = userType === 'provider'
        ? `${API}/notifications/mark-all-read/provider`
        : `${API}/notifications/mark-all-read/customer`;
      
      await axios.put(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setLastNotificationCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Initialize and fetch notifications
  useEffect(() => {
    // Initialize audio system
    initNotificationAudio();
    
    // Unlock audio on first user interaction (required by browsers)
    const handleFirstInteraction = () => {
      unlockAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    
    // Initial fetch
    fetchUnreadCount();
    
    // Poll for new notifications every 10 seconds (faster polling)
    const interval = setInterval(fetchUnreadCount, 10000);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [userType]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} j`;
    return date.toLocaleDateString('fr-FR');
  };

  // Toggle sound
  const toggleSound = (e) => {
    e.stopPropagation();
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    if (newState) {
      // Play a test sound when enabling
      playNotificationSound(true);
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        data-testid="notification-bell"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification Panel */}
          <Card className="absolute right-0 top-12 w-80 md:w-96 max-h-[70vh] overflow-hidden z-50 shadow-2xl rounded-2xl border-0">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-lg">Notifications</h3>
                {/* Sound toggle */}
                <button
                  onClick={toggleSound}
                  className={`p-1 rounded-full ${soundEnabled ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                  title={soundEnabled ? 'Son activé' : 'Son désactivé'}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Tout marquer comme lu
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[50vh]">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucune notification</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Les nouvelles notifications apparaîtront ici
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (!notification.is_read) markAsRead(notification.id);
                      setSelectedNotification(selectedNotification?.id === notification.id ? null : notification);
                    }}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      notification.is_read 
                        ? 'bg-white hover:bg-gray-50' 
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.is_read ? 'bg-gray-100' : 'bg-white shadow-sm'
                      }`}>
                        <NotificationIcon type={notification.notification_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                          {notification.title}
                        </p>
                        
                        {/* Show full message when selected, otherwise show truncated */}
                        {selectedNotification?.id === notification.id ? (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-gray-700 whitespace-pre-line">
                              {notification.message}
                            </p>
                            {/* Show provider phone prominently if available */}
                            {notification.provider_phone && (
                              <div className="mt-3 p-2 bg-white rounded-lg border border-green-300 flex items-center gap-2">
                                <Phone className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700">
                                  Appelez le prestataire : 
                                </span>
                                <a 
                                  href={`tel:${notification.provider_phone}`}
                                  className="text-green-600 font-bold hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {notification.provider_phone}
                                </a>
                              </div>
                            )}
                            {/* Show credit amount if available */}
                            {notification.credit_amount && (
                              <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-bold text-purple-700">
                                  Crédit ajouté : {notification.credit_amount.toLocaleString('fr-FR')} GNF
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(notification.created_at)}
                        </div>
                      </div>
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="sticky bottom-0 bg-white border-t p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-gray-600"
                >
                  Fermer
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
