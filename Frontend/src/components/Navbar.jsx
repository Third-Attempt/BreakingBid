import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, User, Users, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Profile', path: '/profile', icon: <User size={18} /> },
    { name: 'Users', path: '/users', icon: <Users size={18} /> }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="max-w-7xl mx-auto mb-8 border-b border-[var(--color-elite-border)] pb-6 pt-8 px-6 lg:px-8 relative z-50">
      <div className="flex justify-between items-center">
        {/* Logo & Welcome */}
        <div>
          <Link to="/dashboard" className="text-3xl md:text-4xl font-display font-light tracking-wider text-white hover:opacity-80 transition-opacity">
            Breaking<span className="font-semibold text-[var(--color-elite-accent)]">Bid</span>
          </Link>
          <p className="text-[#a1a1aa] text-xs md:text-sm mt-1 hidden md:block">
            Welcome back, <span className="text-white font-medium">{user?.username}</span>
          </p>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive(link.path) 
                    ? 'bg-[var(--color-elite-accent)]/20 text-[var(--color-elite-accent)] shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                    : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            ))}
          </nav>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#a1a1aa] hover:text-red-400 transition-colors duration-300 px-3 font-medium text-sm border-l border-[var(--color-elite-border)] pl-6"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#a1a1aa] hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 mt-4 bg-[#0a0a0c] border border-[var(--color-elite-border)] rounded-xl shadow-2xl p-4 flex flex-col gap-2 z-50">
          <p className="text-[#a1a1aa] text-xs mb-2 px-4">Signed in as <span className="text-white">{user?.username}</span></p>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive(link.path) 
                  ? 'bg-[var(--color-elite-accent)]/10 text-[var(--color-elite-accent)]' 
                  : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
              }`}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
          <div className="h-px bg-[var(--color-elite-border)] my-2"></div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#a1a1aa] hover:text-red-400 hover:bg-red-400/10 transition-colors text-left"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      )}
    </header>
  );
}
