import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { LogOut, Plus, Clock, Gavel, TrendingUp, Search, Calendar, Tag, Loader2, Play } from 'lucide-react';

const AuctionCard = ({ item, refCallback }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Only update this specific card's timer every second
    const timeInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const getTimeLeftInfo = (item) => {
    const start = new Date(item.start_time).getTime();
    const end = new Date(item.end_time).getTime();
    
    let targetTime;
    let prefix;
    let statusClass;
    let dotColor;

    if (now < start) {
      targetTime = start;
      prefix = "Starts in";
      statusClass = "text-blue-400";
      dotColor = "bg-blue-500";
    } else if (now >= start && now < end) {
      targetTime = end;
      prefix = "Ends in";
      statusClass = "text-[var(--color-elite-accent)]";
      dotColor = "bg-[var(--color-elite-accent)]";
    } else {
      return { text: "Ended", statusClass: "text-red-400", dotColor: "bg-red-500", isUpcoming: false, isEnded: true };
    }

    const diff = targetTime - now;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    
    let timeStr;
    if (h > 24) timeStr = `${Math.floor(h/24)}d ${h%24}h`;
    else if (h > 0) timeStr = `${h}h ${m}m`;
    else timeStr = `${m}m ${s}s`;

    return { text: `${prefix} ${timeStr}`, statusClass, dotColor, isUpcoming: now < start, isEnded: false };
  };

  const timeInfo = getTimeLeftInfo(item);

  return (
    <Link 
      to={`/item/${item.id}`} 
      ref={refCallback}
      className="group solid-panel p-6 hover:border-[var(--color-elite-accent)]/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:scale-[1.02] transition-all duration-300 flex flex-col h-full relative overflow-hidden"
    >
      <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
        <div className={`w-2.5 h-2.5 rounded-full ${timeInfo.dotColor} shadow-[0_0_10px_currentColor] animate-pulse`}></div>
      </div>
      
      <div className="flex-1 mt-2 relative z-10">
        <h3 className="text-xl font-display font-semibold mb-3 text-white group-hover:text-[var(--color-elite-accent)] transition-colors duration-300 pr-8">{item.name}</h3>
        <p className="text-[#a1a1aa] text-sm mb-8 line-clamp-3 leading-relaxed">{item.desc || "No description provided."}</p>
      </div>
      
      <div className="flex justify-between items-end pt-5 border-t border-[var(--color-elite-border)] mt-auto relative z-10">
        <div>
          <p className="text-[11px] text-[#a1a1aa] uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1.5">
            <TrendingUp size={12} className={timeInfo.isEnded ? "text-zinc-500" : "text-[var(--color-elite-accent)]"} /> 
            {timeInfo.isEnded ? (item.winner_id ? "Winning Bid" : "Unsold") : "Current Bid"}
          </p>
          <p className={`font-mono text-2xl font-medium tracking-tight ${timeInfo.isEnded && !item.winner_id ? 'text-zinc-500' : 'text-white'}`}>
            ${Number(item.current_price ?? item.base_price).toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[#a1a1aa] uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1.5 justify-end">
            {timeInfo.isUpcoming ? <Play size={12} /> : <Clock size={12} />}
            {timeInfo.isUpcoming ? 'Starts' : 'Time Left'}
          </p>
          <p className={`text-sm font-mono font-medium ${timeInfo.statusClass}`}>
            {timeInfo.text}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState("0");
  const [sortByPrice, setSortByPrice] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  
  const observer = useRef();

  // Modal State
  const [newItem, setNewItem] = useState({
    name: '',
    desc: '',
    base_price: '',
    start_time: '',
    end_time: ''
  });

  const startRef = useRef(null);
  const endRef = useRef(null);

  // Format to YYYY-MM-DDTHH:mm required by datetime-local
  const formatDateTime = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date - offset)).toISOString().slice(0, 16);
  };

  // Calculate default times for the modal
  const openModal = () => {
    const defaultStart = new Date();
    const defaultEnd = new Date(defaultStart.getTime() + 6 * 60000); // +6 mins

    setNewItem({
      name: '',
      desc: '',
      base_price: '',
      start_time: formatDateTime(defaultStart),
      end_time: formatDateTime(defaultEnd)
    });
    setShowModal(true);
  };

  const handleStartChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setNewItem(prev => ({ ...prev, start_time: '' }));
      return;
    }
    const date = new Date(val);
    const nowObj = new Date();
    // Max of (selected start, current time)
    const effectiveStart = date > nowObj ? date : nowObj;
    const newEndObj = new Date(effectiveStart.getTime() + 6 * 60000); // +6 mins
    
    setNewItem(prev => ({
      ...prev,
      start_time: formatDateTime(date),
      end_time: formatDateTime(newEndObj)
    }));
  };

  // Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearch !== search) {
        setDebouncedSearch(search);
        setPage(1); 
        setItems([]); 
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [search, debouncedSearch]);

  const fetchItems = async (currentPage, currentSearch, currentStatus, currentSort) => {
    if (isLoading && currentPage > 1) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/items/?page=${currentPage}&search=${currentSearch}&status=${currentStatus}&sort=${currentSort}`);
      const newItems = res.data;
      
      if (newItems.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (currentPage === 1) {
        setItems(newItems);
      } else {
        setItems(prev => {
          // Prevent duplicates due to strict mode or racing
          const existingIds = new Set(prev.map(i => i.id));
          const filteredNew = newItems.filter(i => !existingIds.has(i.id));
          return [...prev, ...filteredNew];
        });
      }
    } catch (err) {
      toast.error("Failed to load auctions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(page, debouncedSearch, statusFilter, sortByPrice);
  }, [page, debouncedSearch, statusFilter, sortByPrice]);

  // Intersection Observer for Infinite Scroll
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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    
    try {
      const payload = {
        ...newItem,
        base_price: parseFloat(newItem.base_price),
        start_time: new Date(newItem.start_time).toISOString(),
        end_time: new Date(newItem.end_time).toISOString(),
      };
      await api.post('/items/', payload);
      toast.success("Auction created successfully");
      setShowModal(false);
      
      // Refresh top items
      setPage(1);
      setSearch('');
      fetchItems(1, '', statusFilter, sortByPrice);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create auction");
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="w-full">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <h2 className="text-2xl font-display font-medium flex items-center gap-3 text-white">
              <Gavel className="text-[var(--color-elite-accent)]" size={24} /> Auctions
            </h2>
            <button 
              onClick={openModal}
              className="flex items-center gap-2 bg-[var(--color-elite-accent)]/10 text-[var(--color-elite-accent)] px-4 py-2 rounded-xl border border-[var(--color-elite-accent)]/30 hover:bg-[var(--color-elite-accent)] hover:text-black transition-all duration-300 font-medium text-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            >
              <Plus size={16} /> New
            </button>
            
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                  setItems([]);
                }}
                className="appearance-none bg-black solid-panel border-[var(--color-elite-border)] text-white text-sm rounded-xl pl-4 pr-10 py-2 focus:outline-none focus:border-[var(--color-elite-accent)] focus:ring-1 focus:ring-[var(--color-elite-accent)]/50 cursor-pointer font-medium transition-all"
              >
                <option value="0" className="bg-black">Ongoing</option>
                <option value="1" className="bg-black">Upcoming</option>
                <option value="2" className="bg-black">Finished</option>
                <option value="3" className="bg-black">All Auctions</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <div className="w-2 h-2 border-b-2 border-r-2 border-[var(--color-elite-accent)] transform rotate-45 -translate-y-0.5"></div>
              </div>
            </div>

            <button
              onClick={() => {
                setSortByPrice(!sortByPrice);
                setPage(1);
                setItems([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                sortByPrice 
                  ? 'bg-[var(--color-elite-accent)]/10 text-[var(--color-elite-accent)] border-[var(--color-elite-accent)]/30' 
                  : 'bg-black solid-panel text-[#a1a1aa] border-[var(--color-elite-border)] hover:text-white'
              }`}
            >
              <TrendingUp size={16} /> Price
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-[#a1a1aa] group-focus-within:text-[var(--color-elite-accent)] transition-colors duration-300" />
            </div>
            <input 
              type="text" 
              placeholder="Search auctions..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full solid-panel pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--color-elite-accent)] focus:ring-1 focus:ring-[var(--color-elite-accent)]/50 transition-all duration-300 placeholder:text-[#a1a1aa] text-white font-medium"
            />
          </div>
        </div>
        
        {items.length === 0 && !isLoading ? (
          <div className="text-center py-32 solid-panel border-[var(--color-elite-border)]">
            <Search size={56} className="mx-auto text-[var(--color-elite-border)] mb-6 opacity-50" />
            <h3 className="text-xl text-white font-display font-medium mb-2">No auctions found</h3>
            <p className="text-[#a1a1aa]">Try adjusting your search or create a new auction.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {items.map((item, index) => {
              const isLast = items.length === index + 1;
              return (
                <AuctionCard 
                  key={item.id} 
                  item={item} 
                  refCallback={isLast ? lastElementRef : null} 
                />
              );
            })}
            
            {/* Sleek Skeleton Loaders */}
            {isLoading && Array.from({ length: items.length === 0 ? 8 : 4 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="solid-panel p-6 flex flex-col h-[280px] relative overflow-hidden animate-pulse">
                <div className="w-3/4 h-7 bg-[var(--color-elite-border)] rounded-md mt-2 mb-4"></div>
                <div className="w-full h-4 bg-[var(--color-elite-border)] rounded-md mb-2"></div>
                <div className="w-5/6 h-4 bg-[var(--color-elite-border)] rounded-md mb-2"></div>
                <div className="w-4/6 h-4 bg-[var(--color-elite-border)] rounded-md mb-8"></div>
                
                <div className="flex justify-between items-end pt-5 border-t border-[var(--color-elite-border)] mt-auto">
                  <div>
                    <div className="w-16 h-3 bg-[var(--color-elite-border)] rounded-md mb-2"></div>
                    <div className="w-24 h-6 bg-[var(--color-elite-border)] rounded-md"></div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-16 h-3 bg-[var(--color-elite-border)] rounded-md mb-2"></div>
                    <div className="w-20 h-5 bg-[var(--color-elite-border)] rounded-md"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/90 p-4 animate-in fade-in duration-200">
          <div className="solid-panel rounded-2xl p-8 max-w-md w-full relative overflow-hidden">
            <h2 className="text-2xl font-display font-medium mb-8 text-white flex items-center gap-3">
              <Gavel className="text-[var(--color-elite-accent)]" size={24} /> List an Item
            </h2>
            
            <form onSubmit={handleCreate} className="space-y-6 relative z-10">
              <div>
                <label className="block text-[11px] text-[#a1a1aa] font-semibold uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Tag size={12} /> Item Name
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Vintage Rolex Submariner"
                  className="w-full bg-[#000000]/40 border border-[var(--color-elite-border)] rounded-xl px-4 py-3.5 text-white text-sm focus:border-[var(--color-elite-accent)] focus:ring-1 focus:ring-[var(--color-elite-accent)]/50 focus:outline-none transition-all placeholder:text-[#52525b]" 
                  value={newItem.name} 
                  onChange={e => setNewItem({...newItem, name: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-[11px] text-[#a1a1aa] font-semibold uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  required 
                  placeholder="Describe the item's condition and history..."
                  className="w-full bg-[#000000]/40 border border-[var(--color-elite-border)] rounded-xl px-4 py-3.5 text-white text-sm focus:border-[var(--color-elite-accent)] focus:ring-1 focus:ring-[var(--color-elite-accent)]/50 focus:outline-none transition-all placeholder:text-[#52525b] resize-none" 
                  rows="3" 
                  value={newItem.desc} 
                  onChange={e => setNewItem({...newItem, desc: e.target.value})}
                ></textarea>
              </div>
              
              <div>
                <label className="block text-[11px] text-[#a1a1aa] font-semibold uppercase tracking-widest mb-2">Starting Price ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a1a1aa] font-mono">$</div>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    required 
                    placeholder="0.00"
                    className="w-full bg-[#000000]/40 border border-[var(--color-elite-border)] rounded-xl pl-8 pr-4 py-3.5 text-white font-mono text-sm focus:border-[var(--color-elite-accent)] focus:ring-1 focus:ring-[var(--color-elite-accent)]/50 focus:outline-none transition-all" 
                    value={newItem.base_price} 
                    onChange={e => setNewItem({...newItem, base_price: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-[#a1a1aa] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Calendar size={12} /> Start Time
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full bg-[#000000]/40 border border-[var(--color-elite-border)] rounded-xl px-4 py-3.5 text-white text-sm focus-within:border-[var(--color-elite-accent)] focus-within:ring-1 focus-within:ring-[var(--color-elite-accent)]/50 transition-all font-medium [color-scheme:dark]"
                    value={newItem.start_time}
                    onChange={handleStartChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#a1a1aa] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Clock size={12} /> End Time
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full bg-[#000000]/40 border border-[var(--color-elite-border)] rounded-xl px-4 py-3.5 text-white text-sm focus-within:border-[var(--color-elite-accent)] focus-within:ring-1 focus-within:ring-[var(--color-elite-accent)]/50 transition-all font-medium [color-scheme:dark]"
                    value={newItem.end_time}
                    onChange={(e) => setNewItem(prev => ({...prev, end_time: e.target.value}))}
                    required
                  />
                </div>
              </div>
              
              <div className="flex gap-4 pt-8 border-t border-[var(--color-elite-border)]">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  disabled={isCreating}
                  className="flex-1 px-4 py-3.5 border border-[var(--color-elite-border)] text-white text-sm font-semibold rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="flex-1 px-4 py-3.5 bg-[var(--color-elite-accent)] text-black text-sm font-bold rounded-xl hover:bg-[var(--color-elite-accent-hover)] transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isCreating ? 'Creating...' : 'List Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
