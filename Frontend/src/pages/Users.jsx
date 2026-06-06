import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Users as UsersIcon, Search, UserCircle2 } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const observer = useRef();

  const fetchUsers = async (currentPage) => {
    if (isLoading && currentPage > 1) return;
    setIsLoading(true);
    try {
      // Backend only supports pagination /users/?page=X currently
      const res = await api.get(`/users/?page=${currentPage}`);
      const newUsers = res.data;
      
      if (newUsers.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (currentPage === 1) {
        setUsers(newUsers);
      } else {
        setUsers(prev => {
          const existingIds = new Set(prev.map(u => u.id));
          const filteredNew = newUsers.filter(u => !existingIds.has(u.id));
          return [...prev, ...filteredNew];
        });
      }
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const lastElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  // Client-side filtering
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <h2 className="text-2xl font-display font-medium flex items-center gap-3 text-white">
          <UsersIcon className="text-[var(--color-elite-accent)]" size={24} /> Network
        </h2>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-[#a1a1aa] group-focus-within:text-[var(--color-elite-accent)] transition-colors duration-300" />
          </div>
          <input 
            type="text" 
            placeholder="Search users..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full solid-panel pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--color-elite-accent)] focus:ring-1 focus:ring-[var(--color-elite-accent)]/50 transition-all duration-300 placeholder:text-[#a1a1aa] text-white font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUsers.map((u, index) => {
          const isLast = filteredUsers.length === index + 1;
          return (
            <Link 
              key={u.id} 
              to={`/users/${u.id}`}
              ref={isLast ? lastElementRef : null}
              className="solid-panel p-6 flex items-center gap-5 hover:border-[var(--color-elite-accent)]/50 hover:bg-white/[0.02] transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 border border-[var(--color-elite-border)] flex items-center justify-center text-[var(--color-elite-accent)] group-hover:scale-110 transition-transform">
                <UserCircle2 size={24} />
              </div>
              <div>
                <h3 className="font-display font-medium text-white group-hover:text-[var(--color-elite-accent)] transition-colors text-lg">@{u.username}</h3>
                <p className="text-xs text-[#a1a1aa]">User #{u.id}</p>
              </div>
            </Link>
          );
        })}
        
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="solid-panel p-6 flex items-center gap-5 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-[var(--color-elite-border)]"></div>
            <div className="flex-1">
              <div className="w-24 h-5 bg-[var(--color-elite-border)] rounded mb-2"></div>
              <div className="w-16 h-3 bg-[var(--color-elite-border)] rounded"></div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredUsers.length === 0 && !isLoading && (
        <div className="text-center py-32 solid-panel">
          <UsersIcon size={48} className="mx-auto text-[var(--color-elite-border)] mb-4" />
          <p className="text-[#a1a1aa]">No users found matching your search.</p>
        </div>
      )}
    </div>
  );
}
