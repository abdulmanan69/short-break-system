import { useState, useEffect, useMemo } from 'react';
import { useAuth, socket } from '../context/AuthContext';
import axios from 'axios';
import { Users, Clock, Shield, Activity, Plus, Settings, StopCircle, RefreshCw, Megaphone, Wifi, Lock, UserCheck, UserX, Edit2, Trash2, LogOut, Menu, X, Bell, UserPlus, ChevronUp, ChevronDown, Phone, Download } from 'lucide-react';
import { API_URL } from '../config';
import BroadcastTicker from '../components/BroadcastTicker';

export default function AdminDashboard() {
  const { user: currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); 
  const [userSubTab, setUserSubTab] = useState('active');
  const [activeStatus, setActiveStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordForm, setPasswordForm] = useState(null); 
  const [newUser, setNewUser] = useState({ username: '', name: '', gender: 'male', role: 'employee', password: '', quota: 30 });
  const [myPasswordChange, setMyPasswordChange] = useState({ current: '', new: '' });
  const [globalSettings, setGlobalSettings] = useState({ max_male_breaks: 1, max_female_breaks: 1, default_quota: 30, global_theme: 'light' });

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchStatus();
    fetchUsers();
    fetchCallbacks();
    fetchGlobalSettings();
    if(currentUser) socket.emit('user_connected', currentUser.id);

    socket.on('status_change', (data) => { setActiveStatus(data); fetchUsers(); });
    socket.on('online_users_update', (ids) => setOnlineUserIds(ids));

    return () => {
        socket.off('status_change');
        socket.off('online_users_update');
    };
  }, [isSuperAdmin, currentUser]);

  const fetchGlobalSettings = async () => {
      try { const res = await axios.get(`${API_URL}/api/admin/settings`, getHeaders()); setGlobalSettings(prev => ({ ...prev, ...res.data })); } catch(e){}
  }

  const handleUpdateGlobalSettings = async (e) => {
      e.preventDefault();
      try { await axios.post(`${API_URL}/api/admin/settings`, globalSettings, getHeaders()); alert("Settings updated."); } catch(e) { alert("Failed"); }
  }

  const handleNotifyUser = async (userId) => {
      const msg = prompt("Send alert to user:");
      if(msg) try { await axios.post(`${API_URL}/api/admin/notify/${userId}`, { message: msg }, getHeaders()); alert("Sent."); } catch(e){}
  }

  const fetchStatus = async () => { try { const res = await axios.get(`${API_URL}/api/break/status`); setActiveStatus(res.data); } catch(e){} };
  const fetchUsers = async () => { try { const res = await axios.get(`${API_URL}/api/admin/users`, getHeaders()); setUsers(res.data); } catch(e){} };
  const fetchCallbacks = async () => { try { const res = await axios.get(`${API_URL}/api/callback`, getHeaders()); setCallbacks(res.data); } catch(e){} };
  
  const requestSort = (key) => {
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
      setSortConfig({ key, direction });
  }

  const sortedUsers = useMemo(() => {
      let sortableItems = [...users];
      if (sortConfig.key !== null) {
          sortableItems.sort((a, b) => {
              const aVal = sortConfig.key === 'identity' ? (a.name || a.username) : a[sortConfig.key];
              const bVal = sortConfig.key === 'identity' ? (b.name || b.username) : b[sortConfig.key];
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return sortableItems;
  }, [users, sortConfig]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/auth/register`, newUser, getHeaders());
      alert('User created!');
      setNewUser({ username: '', name: '', gender: 'male', role: 'employee', password: '', quota: 30 });
      setShowUserForm(false);
      fetchUsers();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handleUpdateUser = async (e) => {
      e.preventDefault();
      try { await axios.put(`${API_URL}/api/admin/user/${editingUser.id}`, editingUser, getHeaders()); setEditingUser(null); fetchUsers(); } catch(e) { alert("Failed"); }
  };

  const handleDeleteUser = async (userId) => {
      if(!confirm("DELETE PERMANENTLY?")) return;
      try { await axios.delete(`${API_URL}/api/admin/user/${userId}`, getHeaders()); fetchUsers(); } catch(e) {}
  }

  const handleToggleActive = async (user) => {
      try { await axios.put(`${API_URL}/api/admin/user/${user.id}`, { isActive: !user.isActive }, getHeaders()); fetchUsers(); } catch(e) {}
  };

  const handleForceLogoutSession = async (userId) => {
      if(!confirm("Logout user from all devices?")) return;
      try { await axios.post(`${API_URL}/api/admin/force-logout-session/${userId}`, {}, getHeaders()); fetchUsers(); alert("Logged out."); } catch(e) {}
  }

  const handleForceStop = async (userId) => {
      if(!confirm("Force stop this active break?")) return;
      try { await axios.post(`${API_URL}/api/admin/force-stop/${userId}`, {}, getHeaders()); alert("Break stopped."); } catch(e) {}
  }

  const handleResetUsage = async (userId) => {
    if(!confirm("Reset today's usage?")) return;
    try { await axios.post(`${API_URL}/api/admin/reset-usage/${userId}`, {}, getHeaders()); fetchUsers(); alert("Usage reset."); } catch(e) {}
  }

  const handleBroadcast = async () => {
      const msg = prompt("Set broadcast message:");
      if(msg) await axios.post(`${API_URL}/api/admin/broadcast`, { message: msg }, getHeaders());
  }

  const handleChangeMyPassword = async (e) => {
      e.preventDefault();
      try { await axios.post(`${API_URL}/api/auth/change-password`, { currentPassword: myPasswordChange.current, newPassword: myPasswordChange.new }, getHeaders()); alert("Success"); setMyPasswordChange({ current: '', new: '' }); } catch(e) { alert(e.response?.data?.error || "Failed"); }
  }

  const handleResetPassword = async (e) => {
      e.preventDefault();
      const newPass = document.getElementById('newPass').value;
      try {
          await axios.post(`${API_URL}/api/admin/reset-password/${passwordForm.userId}`, { newPassword: newPass }, getHeaders());
          alert("Password reset.");
          setPasswordForm(null);
      } catch(e) { alert("Failed"); }
  }
  
  const handleDownloadCSV = () => {
      const headers = ['Agent Name', 'Phone Number', 'Closer Name', 'Scheduled Time', 'Timestamp'];
      const rows = callbacks.map(cb => [
          cb.agent?.name || cb.agent?.username || 'Unknown',
          cb.phoneNumber,
          cb.closerName,
          cb.callbackTime ? new Date(cb.callbackTime).toLocaleString() : '-',
          new Date(cb.createdAt).toLocaleString()
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `callbacks_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  const navClass = (tab) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`;

  const SortIcon = ({ col }) => {
      if (sortConfig.key !== col) return <ChevronUp size={12} className="opacity-20" />;
      return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-primary-500" /> : <ChevronDown size={12} className="text-primary-500" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      
      <aside className={`w-64 bg-slate-900 text-white flex-col fixed md:relative h-full z-30 transition-transform transform md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:flex`}>
        <div className="p-6 flex items-center gap-3 font-bold text-xl border-b border-slate-800">
            <Shield className="text-primary-500" /> {isSuperAdmin ? 'Super Admin' : 'Admin'}
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
            <button onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} className={navClass('overview')}><Activity size={20} /> Overview</button>
            <button onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }} className={navClass('users')}><Users size={20} /> Users</button>
            <button onClick={() => { setActiveTab('callbacks'); setMobileMenuOpen(false); }} className={navClass('callbacks')}><Phone size={20} /> Callbacks</button>
            <button onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} className={navClass('settings')}><Settings size={20} /> Settings</button>
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={logout} className="w-full text-left px-4 py-2 text-slate-400 hover:text-white font-bold">Logout</button></div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <BroadcastTicker isAdmin={isSuperAdmin} />
          
          <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-40">
             <div className="flex items-center gap-2 font-bold"><Shield className="text-primary-500" /> Panel</div>
             <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X/> : <Menu/>}</button>
          </div>

          <div className="p-4 md:p-8 flex-1 overflow-y-auto">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <h2 className="text-3xl font-black capitalize text-slate-800">{activeTab}</h2>
                  <div className="flex flex-wrap gap-3">
                      {isSuperAdmin && (
                          <button onClick={handleBroadcast} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-slate-800 text-sm shadow-md transition-all font-bold">
                              <Megaphone size={16} /> Broadcast
                          </button>
                      )}
                      <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 text-sm font-bold">
                          <Wifi size={16} className={onlineUserIds.length > 0 ? "text-green-500" : "text-slate-400"} />
                          <span>{onlineUserIds.length} Online</span>
                      </div>
                  </div>
              </header>

              {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
                        <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-6">Live Status</h3>
                        {activeStatus?.isLocked ? (
                            <div className="bg-red-50 p-8 rounded-2xl border-2 border-red-100 text-center relative overflow-hidden">
                                <h4 className="text-4xl font-black text-red-600 mb-2 tracking-tighter">BUSY</h4>
                                <p className="text-xl font-bold text-slate-800">{activeStatus.activeUser?.username}</p>
                                <button onClick={() => handleForceStop(activeStatus.activeUser?.id)} className="mt-6 bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 flex items-center gap-2 mx-auto font-bold shadow-lg">
                                    <StopCircle size={20} /> Force Release
                                </button>
                            </div>
                        ) : (
                            <div className="bg-green-50 p-8 rounded-2xl border-2 border-green-100 text-center">
                                <h4 className="text-4xl font-black text-green-600 mb-2 tracking-tighter">CLEAR</h4>
                                <p className="text-slate-600 font-bold">Slot available.</p>
                            </div>
                        )}
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
                          <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-6 flex items-center gap-2">Online Agents</h3>
                          <div className="space-y-3">
                              {onlineUserIds.length === 0 ? <p className="text-slate-400">Nobody online.</p> :
                                  users.filter(u => onlineUserIds.includes(u.id) || onlineUserIds.includes(String(u.id))).map(u => (
                                      <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                          <div className="flex items-center gap-3">
                                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                              <span className="font-bold text-slate-800">{u.name || u.username}</span>
                                          </div>
                                          <span className="text-[10px] font-black uppercase text-slate-400">{u.role}</span>
                                      </div>
                                  ))
                              }
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'users' && (
                  <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
                              {['active', 'inactive'].map(t => (
                                  <button key={t} onClick={() => setUserSubTab(t)} className={`flex-1 md:w-32 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${userSubTab === t ? (t === 'active' ? 'bg-primary-600 text-white' : 'bg-red-600 text-white') : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
                              ))}
                          </div>
                          <button onClick={() => setShowUserForm(true)} className="w-full md:w-auto bg-primary-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-700 font-bold shadow-lg shadow-primary-200 transition-all active:scale-95"><UserPlus size={20} /> Add Account</button>
                      </div>

                      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-x-auto">
                          <table className="w-full text-left min-w-[800px]">
                              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                                  <tr>
                                      <th className="p-6 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => requestSort('identity')}>
                                          <div className="flex items-center gap-2 text-nowrap">Identity <SortIcon col="identity"/></div>
                                      </th>
                                      <th className="p-6 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => requestSort('role')}>
                                          <div className="flex items-center gap-2">Role <SortIcon col="role"/></div>
                                      </th>
                                      <th className="p-6 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => requestSort('usedToday')}>
                                          <div className="flex items-center gap-2">Stats (Today) <SortIcon col="usedToday"/></div>
                                      </th>
                                      <th className="p-6 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => requestSort('dailyQuotaMinutes')}>
                                          <div className="flex items-center gap-2 text-nowrap">Quota <SortIcon col="dailyQuotaMinutes"/></div>
                                      </th>
                                      <th className="p-6 text-right">Operations</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {sortedUsers.filter(u => userSubTab === 'active' ? u.isActive : !u.isActive).map(user => (
                                      <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                          <td className="p-6">
                                              <div className="font-black text-slate-800 text-lg">{user.name || user.username}</div>
                                              <div className="text-xs text-slate-400 font-bold flex items-center gap-2">@{user.username} <span className="w-1 h-1 bg-slate-300 rounded-full"></span> {user.gender}</div>
                                          </td>
                                          <td className="p-6 text-xs uppercase font-black">{user.role}</td>
                                          <td className="p-6">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                      <div 
                                                        className={`h-full transition-all duration-1000 ${user.usedToday >= user.dailyQuotaMinutes ? 'bg-red-500' : 'bg-primary-500'}`} 
                                                        style={{ width: `${Math.min(100, (user.usedToday / user.dailyQuotaMinutes) * 100)}%` }}
                                                      ></div>
                                                  </div>
                                                  <span className="text-sm font-black text-slate-700">{user.usedToday}m</span>
                                              </div>
                                          </td>
                                          <td className="p-6 font-black text-slate-500">{user.dailyQuotaMinutes}m</td>
                                          <td className="p-6 text-right">
                                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button onClick={() => handleNotifyUser(user.id)} className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"><Bell size={18}/></button>
                                                  <button onClick={() => handleForceLogoutSession(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={18}/></button>
                                                  <button onClick={() => handleResetUsage(user.id)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"><RefreshCw size={18}/></button>
                                                  <button onClick={() => setEditingUser(user)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18}/></button>
                                                  <button onClick={() => setPasswordForm({ userId: user.id })} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Lock size={18}/></button>
                                                  <button onClick={() => handleToggleActive(user)} className={`p-2 rounded-lg transition-colors ${user.isActive ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}>{user.isActive ? <UserX size={18}/> : <UserCheck size={18}/>}</button>
                                                  {!user.isActive && <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={18}/></button>}
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {activeTab === 'callbacks' && (
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <h3 className="text-xl font-bold text-slate-700">Recent Callback Requests</h3>
                          <button onClick={handleDownloadCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-bold shadow-md">
                              <Download size={18} /> Download CSV
                          </button>
                      </div>
                      
                      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                          <table className="w-full text-left">
                              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                                  <tr>
                                      <th className="p-6">Agent</th>
                                      <th className="p-6">Phone Number</th>
                                      <th className="p-6">Closer Name</th>
                                      <th className="p-6">Scheduled Time</th>
                                      <th className="p-6">Timestamp</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {callbacks.length === 0 ? (
                                      <tr>
                                          <td colSpan="5" className="p-8 text-center text-slate-400 font-bold italic">No callbacks found.</td>
                                      </tr>
                                  ) : (
                                      callbacks.map(cb => (
                                          <tr key={cb.id} className="hover:bg-slate-50/50 transition-colors">
                                              <td className="p-6 font-bold text-slate-800">{cb.agent?.name || cb.agent?.username}</td>
                                              <td className="p-6 font-mono text-slate-600">{cb.phoneNumber}</td>
                                              <td className="p-6 font-medium text-slate-700">{cb.closerName}</td>
                                              <td className="p-6 font-bold text-blue-600">
                                                {cb.callbackTime ? new Date(cb.callbackTime).toLocaleString() : '-'}
                                              </td>
                                              <td className="p-6 text-sm text-slate-500">{new Date(cb.createdAt).toLocaleString()}</td>
                                          </tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {activeTab === 'settings' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
                      {isSuperAdmin && (
                          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Settings className="text-primary-600"/> Configuration</h3>
                              <form onSubmit={handleUpdateGlobalSettings} className="space-y-6">
                                  <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                          <label className="text-xs font-black text-slate-400 uppercase">Max Male Slots</label>
                                          <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={globalSettings.max_male_breaks} onChange={e=>setGlobalSettings({...globalSettings, max_male_breaks: e.target.value})}/>
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-xs font-black text-slate-400 uppercase">Max Female Slots</label>
                                          <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={globalSettings.max_female_breaks} onChange={e=>setGlobalSettings({...globalSettings, max_female_breaks: e.target.value})}/>
                                      </div>
                                  </div>
                                  <button className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">Apply Rules</button>
                              </form>
                          </div>
                      )}
                      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 h-fit">
                          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Lock className="text-slate-400"/> Security</h3>
                          <form onSubmit={handleChangeMyPassword} className="space-y-4">
                              <input type="password" placeholder="Current Password" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-primary-500 outline-none" value={myPasswordChange.current} onChange={e=>setMyPasswordChange({...myPasswordChange, current: e.target.value})}/>
                              <input type="password" placeholder="New Password" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-primary-500 outline-none" value={myPasswordChange.new} onChange={e=>setMyPasswordChange({...myPasswordChange, new: e.target.value})}/>
                              <button className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">Update Password</button>
                          </form>
                      </div>
                  </div>
              )}

              <footer className="mt-auto pt-12 pb-4 text-center border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                      System Architecture & Development by <a href="https://github.com/abdulmanan69" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600 transition-colors">abdulmanan69</a>
                  </p>
              </footer>
          </div>
      </main>

      {/* MODALS */}
      {showUserForm && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <form onSubmit={handleCreateUser} className="bg-white p-8 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
                  <h3 className="text-2xl font-black text-slate-800">New Account</h3>
                  <input type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                  <input type="text" placeholder="Username" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                  <div className="flex gap-4 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
                      <select className="flex-1 bg-transparent font-bold outline-none text-sm" value={newUser.gender} onChange={e => setNewUser({...newUser, gender: e.target.value})}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                      </select>
                      <select className="flex-1 bg-transparent font-bold outline-none text-sm" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                          <option value="employee">Employee</option>
                          {isSuperAdmin && <option value="admin">Admin</option>}
                      </select>
                  </div>
                  <input type="password" placeholder="Password" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                  <input type="number" placeholder="Daily Quota (mins)" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={newUser.quota} onChange={e => setNewUser({...newUser, quota: parseInt(e.target.value)})} />
                  <div className="flex gap-2">
                      <button type="button" onClick={()=>setShowUserForm(false)} className="flex-1 text-slate-400 font-bold">Cancel</button>
                      <button type="submit" className="flex-2 bg-primary-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl">Create</button>
                  </div>
              </form>
          </div>
      )}

      {editingUser && (
           <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
               <form onSubmit={handleUpdateUser} className="bg-white p-8 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
                   <h3 className="text-2xl font-black text-slate-800">Edit Identity</h3>
                   <input type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                   <div className="flex gap-4 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100 text-sm font-bold">
                      <select className="flex-1 bg-transparent" value={editingUser.gender} onChange={e => setEditingUser({...editingUser, gender: e.target.value})}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                      </select>
                      {isSuperAdmin && (
                          <select className="flex-1 bg-transparent" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                              <option value="employee">Employee</option>
                              <option value="admin">Admin</option>
                              <option value="superadmin">Super Admin</option>
                          </select>
                      )}
                   </div>
                   <input type="number" placeholder="Quota" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" value={editingUser.dailyQuotaMinutes} onChange={e => setEditingUser({...editingUser, dailyQuotaMinutes: parseInt(e.target.value)})} />
                   <div className="flex items-center gap-3 p-2 font-bold text-slate-600">
                       <label className="text-xs uppercase font-black">Active:</label>
                       <input type="checkbox" checked={editingUser.isActive} onChange={e => setEditingUser({...editingUser, isActive: e.target.checked})} className="w-5 h-5 accent-primary-600" />
                   </div>
                   <div className="flex gap-2">
                       <button type="button" onClick={()=>setEditingUser(null)} className="flex-1 text-slate-400 font-bold">Cancel</button>
                       <button type="submit" className="flex-2 bg-primary-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl">Save</button>
                   </div>
               </form>
           </div>
      )}

      {passwordForm && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <form onSubmit={handleResetPassword} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative">
                  <h3 className="text-xl font-black text-slate-800">Reset Password</h3>
                  <input type="password" id="newPass" placeholder="New Password" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary-500" />
                  <div className="flex gap-2">
                      <button type="button" onClick={() => setPasswordForm(null)} className="flex-1 text-slate-400 font-bold">Cancel</button>
                      <button type="submit" className="flex-2 bg-red-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl">Confirm</button>
                  </div>
              </form>
          </div>
      )}

    </div>
  );
}