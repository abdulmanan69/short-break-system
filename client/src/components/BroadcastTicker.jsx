import { useState, useEffect } from 'react';
import { socket } from '../context/AuthContext';
import axios from 'axios';
import { Megaphone, X } from 'lucide-react';
import { API_URL } from '../config';

// Removed local socket creation

export default function BroadcastTicker({ isAdmin = false }) {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
    socket.on('broadcast_update', (data) => {
        setMessage(data.message);
    });
    return () => socket.off('broadcast_update');
  }, []);

  const fetchSettings = async () => {
      try {
          const res = await axios.get(`${API_URL}/api/break/settings`);
          if(res.data.broadcast) setMessage(res.data.broadcast);
      } catch(e) {}
  };

  const clearBroadcast = async () => {
      if(!confirm("Clear active broadcast?")) return;
      try { await axios.post(`${API_URL}/api/admin/broadcast/clear`); setMessage(null); } catch(e){}
  }

  if (!message) return null;

  return (
    <div className="bg-black text-white py-3 relative overflow-hidden shadow-2xl border-b border-slate-800 z-[100]">
        <div className="flex items-center">
            {/* Static Icon Label */}
            <div className="bg-black pl-4 pr-2 z-10 flex items-center gap-2 text-primary-400">
                <Megaphone size={18} className="animate-pulse" />
                <span className="text-xs uppercase tracking-widest font-black border-r border-slate-700 pr-4">Broadcast</span>
            </div>
            
            {/* Scrolling Content */}
            <div className="whitespace-nowrap animate-marquee flex items-center">
                <span className="text-sm md:text-base font-bold uppercase tracking-wide px-4">
                    {message} ——— {message} ——— {message} ——— {message} ——— {message} ——— {message}
                </span>
            </div>
        </div>

        {isAdmin && (
            <button 
                onClick={clearBroadcast} 
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-400 p-1.5 rounded hover:bg-red-600 hover:text-white transition-all z-20" 
                title="Clear Broadcast"
            >
                <X size={14} />
            </button>
        )}
    </div>
  );
}