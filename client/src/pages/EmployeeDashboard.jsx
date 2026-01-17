import { useState, useEffect } from 'react';
import { useAuth, socket } from '../context/AuthContext'; 
import axios from 'axios';
import { Coffee, Play, Timer, AlertCircle, Settings, X, BellRing, Phone, Send, Clock } from 'lucide-react';
import { API_URL } from '../config';
import BroadcastTicker from '../components/BroadcastTicker';

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [systemStatus, setSystemStatus] = useState({ isLocked: false, activeUser: null, startTime: null });
  const [mySummary, setMySummary] = useState({ totalUsed: 0, logs: [] });
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [passChange, setPassChange] = useState({ current: '', new: '' });
  const [timeOffset, setTimeOffset] = useState(0);

  // Callback State
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [showMyCallbacks, setShowMyCallbacks] = useState(false);
  const [myCallbacks, setMyCallbacks] = useState([]);
  const [callbackData, setCallbackData] = useState({ phoneNumber: '', closerName: '', callbackTime: '' });
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackMessage, setCallbackMessage] = useState('');
  
  // Notification Permission State
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');

  useEffect(() => {
    socket.emit('user_connected', user.id); 
    fetchStatus();
    fetchSummary();
    
    // Request Notification Permission on load if supported
    if (typeof Notification !== 'undefined' && Notification.permission === "default") {
      Notification.requestPermission().then(setNotifPermission);
    }

    socket.on('status_change', (data) => {
      setSystemStatus(data);
      if (!data.isLocked) fetchSummary();
    });
    
    socket.on('admin_notification', (data) => {
        alert("ADMIN MESSAGE: " + data.message);
    });
    
    // Individual Browser Notification
    socket.on('personal_notification', (data) => {
        if(data.userId == user.id) {
             if (Notification.permission === "granted") {
                new Notification("Short Break System", { 
                    body: data.message,
                    icon: '/favicon.ico' // Ensure icon exists or use generic
                });
             } else {
                alert("ADMIN ALERT: " + data.message);
             }
        }
    });

    return () => {
        socket.off('status_change');
        socket.off('admin_notification');
        socket.off('personal_notification');
    };
  }, []);

  useEffect(() => {
    let interval;
    if (systemStatus.isLocked && systemStatus.startTime) {
      interval = setInterval(() => {
        const start = new Date(systemStatus.startTime).getTime();
        const now = new Date().getTime() + timeOffset;
        const diff = Math.floor((now - start) / 1000);
        setElapsed(Math.max(0, diff)); 
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [systemStatus, timeOffset]);

  const fetchStatus = async () => { 
      try { 
          const res = await axios.get(`${API_URL}/api/break/status`); 
          setSystemStatus(res.data); 
          if(res.data.serverTime) {
              const serverTime = new Date(res.data.serverTime).getTime();
              const clientTime = new Date().getTime();
              setTimeOffset(serverTime - clientTime);
          }
      } catch (err) { console.error(err); } 
  };

  const fetchSummary = async () => { try { const res = await axios.get(`${API_URL}/api/break/summary/${user.id}`); setMySummary(res.data); } catch (err) { console.error(err); } };
  
  const fetchMyCallbacks = async () => {
      try {
          const res = await axios.get(`${API_URL}/api/callback/my`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setMyCallbacks(res.data);
          setShowMyCallbacks(true);
      } catch(e) {
          alert("Failed to fetch callbacks.");
      }
  }

  const handleStartBreak = async () => {
    try {
      setLoading(true); setError('');
      await axios.post(`${API_URL}/api/break/start`, { userId: user.id });
    } catch (err) { setError(err.response?.data?.error || 'Failed to start break'); } 
    finally { setLoading(false); }
  };

  const handleStopBreak = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/break/stop`, { userId: user.id });
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };
  
  const handleChangePassword = async (e) => {
      e.preventDefault();
      try {
          await axios.post(`${API_URL}/api/auth/change-password`, { 
              currentPassword: passChange.current,
              newPassword: passChange.new 
          }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          alert("Password changed successfully.");
          setShowSettings(false);
          setPassChange({ current: '', new: '' });
      } catch(e) { alert(e.response?.data?.error || "Failed"); }
  }

  const handleSubmitCallback = async (e) => {
      e.preventDefault();
      setCallbackLoading(true);
      setCallbackMessage('');
      try {
          await axios.post(`${API_URL}/api/callback`, callbackData, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setCallbackMessage('Callback submitted successfully!');
          setCallbackData({ phoneNumber: '', closerName: '', callbackTime: '' });
          setTimeout(() => {
              setShowCallbackModal(false);
              setCallbackMessage('');
          }, 1500);
      } catch (err) {
          setCallbackMessage(err.response?.data?.error || 'Failed to submit callback.');
      } finally {
          setCallbackLoading(false);
      }
  };

  const requestNotificationAccess = () => {
      Notification.requestPermission().then(permission => {
          setNotifPermission(permission);
          if(permission === 'granted') {
              new Notification("Notifications Enabled", { body: "You will now receive alerts from your Admin." });
          }
      });
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isMe = systemStatus.activeUser?.id == user.id;
  const isQuotaExceeded = mySummary.totalUsed >= user.dailyQuotaMinutes;
  const displayTotalUsed = isMe ? Math.round((mySummary.totalUsed + (elapsed / 60)) * 10) / 10 : mySummary.totalUsed;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 overflow-hidden">
      <BroadcastTicker />
      
      {/* Notification Prompt Banner */}
      {notifPermission === 'default' && (
          <div className="bg-slate-900 text-white p-3 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500 shadow-xl z-20 border-b border-primary-500/30">
              <BellRing size={16} className="text-primary-400 animate-pulse" />
              <p className="text-sm font-medium">
                Important: Please <button onClick={requestNotificationAccess} className="text-primary-400 font-black underline hover:text-primary-300 transition-colors cursor-pointer">click here to allow notifications</button> so you can receive alerts from the Admin.
              </p>
          </div>
      )}

      {notifPermission === 'unsupported' && (
          <div className="bg-orange-600 text-white p-3 text-xs font-bold text-center z-20 shadow-md">
              Your browser blocks notifications on non-secure connections (HTTP). To receive alerts, please use "localhost" or setup HTTPS.
          </div>
      )}

      {notifPermission === 'denied' && (
          <div className="bg-red-600 text-white p-2 text-[10px] font-black uppercase tracking-widest text-center z-20 shadow-md">
              Notifications are BLOCKED. Click the lock icon in your browser address bar to reset permissions.
          </div>
      )}

      <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10 relative">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Coffee className="text-primary-600" /> Short Break System
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-slate-700 font-medium hidden md:inline">Welcome, {user.name || user.username}</span>
          <button onClick={() => setShowCallbackModal(true)} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors font-bold text-sm shadow-sm">
             <Phone size={18} /> Add Callback
          </button>
          <button onClick={fetchMyCallbacks} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors font-bold text-sm shadow-sm">
             <Clock size={18} /> History
          </button>
          <button onClick={() => setShowSettings(true)} className="text-slate-500 hover:text-primary-600"><Settings size={20}/></button>
          <button onClick={logout} className="text-sm text-red-600 hover:text-red-800 font-semibold">Logout</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 z-0 overflow-y-auto">
        
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg text-center transform transition-all hover:scale-105 duration-300 relative border border-slate-100">
          
          <div className="mb-8">
            {systemStatus.isLocked ? (
              isMe ? (
                <div className="animate-pulse">
                  <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                    <Coffee size={64} />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tighter uppercase">You are on Break</h2>
                  <p className="text-slate-600 mt-2 font-medium">Enjoy your rest!</p>
                </div>
              ) : (
                <div>
                  <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                    <Timer size={64} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tighter uppercase">System Busy</h2>
                  <p className="text-slate-600 mt-2 font-medium">
                    <span className="font-black text-slate-900 uppercase">@{systemStatus.activeUser?.username}</span> is away.
                  </p>
                </div>
              )
            ) : (
              <div>
                <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                  <Play size={64} className="ml-2" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tighter uppercase">Need a Break?</h2>
                <p className="text-slate-600 mt-2 font-medium italic">The break slot is currently free.</p>
              </div>
            )}
          </div>

          <div className="text-5xl font-black font-mono text-slate-900 mb-8 tabular-nums">
            {systemStatus.isLocked ? formatTime(elapsed) : '--:--'}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 flex items-center justify-center gap-2 border border-red-100 font-bold text-sm">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div className="flex justify-center gap-4">
            {systemStatus.isLocked ? (
              isMe ? (
                <button 
                  type="button"
                  onClick={handleStopBreak}
                  disabled={loading}
                  className={`bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full text-lg font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 w-full ${loading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {loading ? 'Closing...' : 'Resume Work'}
                </button>
              ) : (
                <button type="button" disabled className="bg-slate-200 text-slate-400 px-8 py-4 rounded-full text-lg font-black uppercase tracking-widest w-full cursor-not-allowed border border-slate-300">
                  Wait for Slot
                </button>
              )
            ) : (
              <button 
                type="button"
                onClick={handleStartBreak}
                disabled={loading || isQuotaExceeded}
                className={`px-8 py-4 rounded-full text-lg font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 w-full ${
                    isQuotaExceeded 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400' 
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                } ${loading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {loading ? 'Opening...' : isQuotaExceeded ? 'Limit Reached' : 'Take a Break'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-lg">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 flex flex-col items-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Quota</p>
            <p className="text-3xl font-black text-slate-800 tabular-nums">{user.dailyQuotaMinutes}m</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 flex flex-col items-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Consumption</p>
            <p className={`text-3xl font-black tabular-nums ${displayTotalUsed >= user.dailyQuotaMinutes ? 'text-red-600' : 'text-green-600'}`}>
              {displayTotalUsed}m
            </p>
          </div>
        </div>

        <footer className="mt-12 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                Developed by <a href="https://github.com/abdulmanan69" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600 transition-colors">abdulmanan69</a>
            </p>
        </footer>
      </main>

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl w-full max-w-sm relative shadow-2xl">
                  <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  <h3 className="font-black text-2xl text-slate-800 mb-6 uppercase tracking-tighter">Identity Settings</h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Existing Password</label>
                          <input type="password" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={passChange.current} onChange={e => setPassChange({...passChange, current: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">New Secure Password</label>
                          <input type="password" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={passChange.new} onChange={e => setPassChange({...passChange, new: e.target.value})} />
                      </div>
                      <button className="bg-primary-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-primary-700 w-full transition-all active:scale-95">Update Credentials</button>
                  </form>
              </div>
          </div>
      )}

      {/* Callback Modal */}
      {showCallbackModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl w-full max-w-sm relative shadow-2xl">
                  <button onClick={() => setShowCallbackModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  <h3 className="font-black text-2xl text-slate-800 mb-6 uppercase tracking-tighter flex items-center gap-2">
                      <Phone className="text-primary-600" /> New Callback
                  </h3>
                  <form onSubmit={handleSubmitCallback} className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Phone Number</label>
                          <input type="text" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={callbackData.phoneNumber} onChange={e => setCallbackData({...callbackData, phoneNumber: e.target.value})} placeholder="+1 (555) 000-0000" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Closer Name</label>
                          <input type="text" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={callbackData.closerName} onChange={e => setCallbackData({...callbackData, closerName: e.target.value})} placeholder="e.g. John Doe" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Callback Time</label>
                          <input type="datetime-local" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={callbackData.callbackTime} onChange={e => setCallbackData({...callbackData, callbackTime: e.target.value})} />
                      </div>
                      
                      {callbackMessage && (
                          <div className={`text-xs font-bold text-center ${callbackMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                              {callbackMessage}
                          </div>
                      )}

                      <button disabled={callbackLoading} className="bg-primary-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-primary-700 w-full transition-all active:scale-95 flex items-center justify-center gap-2">
                          {callbackLoading ? 'Submitting...' : <><Send size={18} /> Submit Callback</>}
                      </button>
                  </form>
              </div>
          </div>
      )}
      
      {/* My Callbacks Modal */}
      {showMyCallbacks && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl w-full max-w-2xl relative shadow-2xl h-[80vh] flex flex-col">
                  <button onClick={() => setShowMyCallbacks(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  <h3 className="font-black text-2xl text-slate-800 mb-6 uppercase tracking-tighter flex items-center gap-2">
                      <Clock className="text-primary-600" /> My Callbacks
                  </h3>
                  <div className="flex-1 overflow-y-auto">
                    {myCallbacks.length === 0 ? (
                        <p className="text-center text-slate-400 font-bold mt-10">No callbacks recorded yet.</p>
                    ) : (
                        <table className="w-full text-left">
                              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest sticky top-0">
                                  <tr>
                                      <th className="p-4">Phone</th>
                                      <th className="p-4">Closer</th>
                                      <th className="p-4">Scheduled Time</th>
                                      <th className="p-4">Created At</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {myCallbacks.map(cb => (
                                      <tr key={cb.id} className="hover:bg-slate-50 transition-colors text-sm">
                                          <td className="p-4 font-mono font-bold text-slate-700">{cb.phoneNumber}</td>
                                          <td className="p-4 font-bold text-slate-800">{cb.closerName}</td>
                                          <td className="p-4 text-blue-600 font-bold">
                                            {cb.callbackTime ? new Date(cb.callbackTime).toLocaleString() : '-'}
                                          </td>
                                          <td className="p-4 text-slate-400 text-xs">
                                              {new Date(cb.createdAt).toLocaleDateString()}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                        </table>
                    )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}