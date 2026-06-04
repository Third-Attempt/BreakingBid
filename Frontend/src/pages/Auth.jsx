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
      toast.error(err.response?.data?.detail || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px]"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light tracking-wider text-white mb-2">
            Breaking<span className="font-semibold text-amber-500">Bid</span>
          </h1>
          <p className="text-slate-400 text-sm tracking-widest uppercase">
            Exclusive Auctions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Username - Required for both Login and Register */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-500" />
              </div>
              <input 
                type="text" 
                placeholder="Username" 
                className={`w-full bg-slate-950/50 border ${
                  usernameStatus === 'taken' ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50' :
                  usernameStatus === 'available' ? 'border-green-500/50 focus:border-green-500/50 focus:ring-green-500/50' :
                  'border-slate-700/50 focus:border-amber-500/50 focus:ring-amber-500/50'
                } text-white pl-11 pr-12 py-3 rounded-lg focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600`}
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
              {!isLogin && usernameStatus && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  {usernameStatus === 'checking' && <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />}
                  {usernameStatus === 'available' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {usernameStatus === 'taken' && <XCircle className="h-5 w-5 text-red-500" />}
                </div>
              )}
            </div>
            
            {/* Live Feedback text */}
            {!isLogin && usernameStatus === 'taken' && (
              <p className="text-red-400 text-xs mt-1 ml-1">This username is already taken.</p>
            )}
            {!isLogin && usernameStatus === 'available' && (
              <p className="text-green-400 text-xs mt-1 ml-1">Username is available!</p>
            )}

            {/* Email - Only required for Register */}
            {!isLogin && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="w-full bg-slate-950/50 border border-slate-700/50 text-white pl-11 pr-4 py-3 rounded-lg focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-slate-600"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full bg-slate-950/50 border border-slate-700/50 text-white pl-11 pr-4 py-3 rounded-lg focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-slate-600"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-500 font-medium py-3 rounded-lg hover:bg-amber-500 hover:text-slate-900 transition-all duration-300"
          >
            {isLogin ? 'Enter' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            {isLogin ? "Request an invitation (Register)" : "Already have access? (Login)"}
          </button>
        </div>
      </div>
    </div>
  );
}
