import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Lock, Mail, User, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: ''
  });

  const [usernameStatus, setUsernameStatus] = useState(null); // 'checking', 'available', 'taken'

  // Debouncing logic for real-time username checking
  useEffect(() => {
    // We only check if we are registering, and if the user actually typed something
    if (isLogin || formData.username.trim().length === 0) {
      setUsernameStatus(null);
      return;
    }

    setUsernameStatus('checking');

    // Wait 500ms after the user STOPS typing before firing the API request
    const timeoutId = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/check-username/${formData.username}`);
        setUsernameStatus(res.data.available ? 'available' : 'taken');
      } catch (err) {
        setUsernameStatus(null);
      }
    }, 500);

    // If the user types again before 500ms is up, cancel the previous timeout
    return () => clearTimeout(timeoutId);
  }, [formData.username, isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', {
          username: formData.username,
          password: formData.password
        });
        login(res.data.access_token);
        toast.success("Welcome back.");
        navigate('/dashboard');
      } else {
        await api.post('/auth/register', {
          email: formData.email,
          username: formData.username,
          password: formData.password
        });
        toast.success("Registration successful. Please log in.");
        setIsLogin(true);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : "An error occurred");
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-[#f4f4f5] relative overflow-hidden font-sans">
      <div className="relative z-10 w-full max-w-md p-10 solid-panel animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-light tracking-wider text-white mb-2">
            Breaking<span className="font-semibold text-[var(--color-elite-accent)]">Bid</span>
          </h1>
          <p className="text-[#a1a1aa] text-xs font-semibold tracking-widest uppercase">
            Exclusive Auctions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            {/* Username - Required for both Login and Register */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-[#a1a1aa]" />
              </div>
              <input 
                type="text" 
                placeholder="Username" 
                className={`w-full bg-[#000000]/40 border ${
                  usernameStatus === 'taken' ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' :
                  usernameStatus === 'available' ? 'border-[var(--color-elite-accent)]/50 focus:border-[var(--color-elite-accent)] focus:ring-[var(--color-elite-accent)]/50' :
                  'border-[var(--color-elite-border)] focus:border-[var(--color-elite-accent)] focus:ring-[var(--color-elite-accent)]/50'
                } text-white pl-12 pr-12 py-3.5 rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-[#52525b] font-medium`}
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
              {!isLogin && usernameStatus && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  {usernameStatus === 'checking' && <Loader2 className="h-5 w-5 text-[var(--color-elite-accent)] animate-spin" />}
                  {usernameStatus === 'available' && <CheckCircle2 className="h-5 w-5 text-[var(--color-elite-accent)]" />}
                  {usernameStatus === 'taken' && <XCircle className="h-5 w-5 text-red-500" />}
                </div>
              )}
            </div>
            
            {/* Live Feedback text */}
            {!isLogin && usernameStatus === 'taken' && (
              <p className="text-red-400 text-xs mt-1 ml-1 font-medium">This username is already taken.</p>
            )}
            {!isLogin && usernameStatus === 'available' && (
              <p className="text-[var(--color-elite-accent)] text-xs mt-1 ml-1 font-medium">Username is available!</p>
            )}

            {/* Email - Only required for Register */}
            {!isLogin && (
              <div className="relative animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#a1a1aa]" />
                </div>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="w-full bg-[#000000]/40 border border-[var(--color-elite-border)] text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[var(--color-elite-accent)] focus:ring-1 focus:ring-[var(--color-elite-accent)]/50 transition-all placeholder:text-[#52525b] font-medium"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-[#a1a1aa]" />
              </div>
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full bg-[#000000]/40 border border-[var(--color-elite-border)] text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[var(--color-elite-accent)] focus:ring-1 focus:ring-[var(--color-elite-accent)]/50 transition-all placeholder:text-[#52525b] font-medium"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-[var(--color-elite-accent)]/10 border border-[var(--color-elite-accent)]/30 text-[var(--color-elite-accent)] font-bold py-3.5 rounded-xl hover:bg-[var(--color-elite-accent)] hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] text-lg mt-2"
          >
            {isLogin ? 'Enter' : 'Register'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#a1a1aa] hover:text-white text-sm font-medium transition-colors duration-300"
          >
            {isLogin ? "Request an invitation (Register)" : "Already have access? (Login)"}
          </button>
        </div>
      </div>
    </div>
  );
}
