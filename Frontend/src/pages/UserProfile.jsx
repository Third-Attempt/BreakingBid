import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { UserCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get(`/users/${id}`);
        setProfile(res.data);
      } catch (err) {
        toast.error("User not found");
        navigate('/users');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--color-elite-accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="animate-in fade-in duration-500 max-w-3xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#a1a1aa] hover:text-white transition-colors mb-8 text-sm font-medium"
      >
        <ArrowLeft size={16} /> Back to Network
      </button>

      <div className="glass-panel p-10 relative overflow-hidden text-center group">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-32 w-64 h-64 bg-[var(--color-elite-accent)]/10 rounded-full blur-3xl group-hover:bg-[var(--color-elite-accent)]/20 transition-all duration-700"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-black border border-[var(--color-elite-border)] flex items-center justify-center text-[var(--color-elite-accent)] mb-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <UserCircle2 size={64} strokeWidth={1} />
          </div>
          
          <h1 className="text-4xl font-display font-medium text-white mb-2">@{profile.username}</h1>
          <p className="text-[#a1a1aa] flex items-center gap-2 text-sm uppercase tracking-widest font-semibold mb-8">
            <ShieldCheck size={16} className="text-[var(--color-elite-accent)]" /> Verified Member
          </p>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <div className="bg-black/50 border border-[var(--color-elite-border)] rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#a1a1aa] font-semibold mb-1">User ID</p>
              <p className="font-mono text-white text-lg">#{profile.id}</p>
            </div>
            <div className="bg-black/50 border border-[var(--color-elite-border)] rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#a1a1aa] font-semibold mb-1">Member Status</p>
              <p className="font-sans text-[var(--color-elite-accent)] font-medium text-lg">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
