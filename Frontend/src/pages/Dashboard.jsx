import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { LogOut, Plus, Clock, Gavel, TrendingUp, Search, Calendar, Tag, Loader2, Play } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState("0");
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [now, setNow] = useState(Date.now());
  
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
      start_time: defaultStart,
      end_time: defaultEnd
    });
    setShowModal(true);
  };

  const handleStartChange = (date) => {
    if (!date) {
      setNewItem(prev => ({ ...prev, start_time: '' }));
      return;
    }
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

  const fetchItems = async (currentPage, currentSearch, currentStatus) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/items/?page=${currentPage}&search=${currentSearch}&status=${currentStatus}`);
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
    fetchItems(page, debouncedSearch, statusFilter);
  }, [page, debouncedSearch, statusFilter]);

  // Update relative time every second for a live countdown
  useEffect(() => {
    const timeInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

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
      statusClass = "text-emerald-400";
      dotColor = "bg-emerald-500";
    } else {
      return { text: "Ended", statusClass: "text-red-400", dotColor: "bg-red-500", isUpcoming: false };
    }

    const diff = targetTime - now;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    
    let timeStr;
    if (h > 24) timeStr = `${Math.floor(h/24)}d ${h%24}h`;
    else if (h > 0) timeStr = `${h}h ${m}m`;
    else timeStr = `${m}m ${s}s`;

    return { text: `${prefix} ${timeStr}`, statusClass, dotColor, isUpcoming: now < start };
  };

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
      fetchItems(1, '', statusFilter);
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
    <div className="min-h-screen bg-[#0f172a] text-white p-8 font-sans">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-light tracking-wider">
            Breaking<span className="font-semibold text-amber-500">Bid</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.username}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={openModal}
            className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-5 py-2.5 rounded-lg border border-amber-500/30 hover:bg-amber-500 hover:text-slate-900 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)]"
          >
            <Plus size={18} /> New Auction
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-medium flex items-center gap-2">
              <Gavel className="text-amber-500" /> Auctions
            </h2>
            
            <select 
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
                setItems([]);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 cursor-pointer"
            >
              <option value="0">Ongoing</option>
              <option value="1">Upcoming</option>
              <option value="2">Finished</option>
              <option value="3">All Auctions</option>
            </select>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-500 group-focus-within:text-amber-500 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Search auctions..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all backdrop-blur-md placeholder:text-slate-500"
            />
          </div>
        </div>
        
        {items.length === 0 && !isLoading ? (
          <div className="text-center py-32 bg-slate-900/40 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-xl">
            <Search size={48} className="mx-auto text-slate-700 mb-4" />
            <h3 className="text-lg text-slate-300 font-medium mb-1">No auctions found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search or create a new auction.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item, index) => {
              const isLast = items.length === index + 1;
              const timeInfo = getTimeLeftInfo(item);
              return (
                <Link 
                  to={`/item/${item.id}`} 
                  key={item.id}
                  ref={isLast ? lastElementRef : null}
                  className="group bg-slate-900/60 border border-slate-800 rounded-xl p-6 hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-all duration-300 flex flex-col h-full backdrop-blur-sm relative"
                >
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${timeInfo.dotColor} shadow-[0_0_8px_currentColor] animate-pulse`}></div>
                  </div>
                  
                  <div className="flex-1 mt-2">
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-amber-500 transition-colors truncate pr-6">{item.name}</h3>
                    <p className="text-slate-400 text-sm mb-6 line-clamp-3 leading-relaxed">{item.desc || "No description provided."}</p>
                  </div>
                  
                  <div className="flex justify-between items-end pt-4 border-t border-slate-800/50 mt-auto">
                    <div>
                      <p className="text-[10px] text-amber-500/80 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                        <TrendingUp size={10} /> Current Bid
                      </p>
                      <p className="font-mono text-xl text-white font-medium">${Number(item.current_price ?? item.base_price).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1 justify-end">
                        {timeInfo.isUpcoming ? <Play size={10} /> : <Clock size={10} />}
                        {timeInfo.isUpcoming ? 'Starts' : 'Time Left'}
                      </p>
                      <p className={`text-sm font-medium ${timeInfo.statusClass}`}>
                        {timeInfo.text}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-amber-500" size={32} />
          </div>
        )}
      </main>

      {/* Enhanced Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
            
            <h2 className="text-2xl font-light mb-6 flex items-center gap-2">
              <Gavel className="text-amber-500" size={24} /> List an Item
            </h2>
            
            <form onSubmit={handleCreate} className="space-y-5 relative z-10">
              <div>
                <label className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Tag size={12} /> Item Name
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Vintage Rolex Submariner"
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all placeholder:text-slate-600" 
                  value={newItem.name} 
                  onChange={e => setNewItem({...newItem, name: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  required 
                  placeholder="Describe the item's condition and history..."
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all placeholder:text-slate-600 resize-none" 
                  rows="3" 
                  value={newItem.desc} 
                  onChange={e => setNewItem({...newItem, desc: e.target.value})}
                ></textarea>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Starting Price ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 font-mono">$</div>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    required 
                    placeholder="0.00"
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all" 
                    value={newItem.base_price} 
                    onChange={e => setNewItem({...newItem, base_price: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar size={12} /> Start Time
                  </label>
                  <div className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-3 text-slate-200 text-xs focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/50 transition-all">
                    <DatePicker
                      selected={newItem.start_time ? new Date(newItem.start_time) : null}
                      onChange={handleStartChange}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={1}
                      timeCaption="Time"
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="bg-transparent w-full text-white outline-none"
                      placeholderText="Select Start Time"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      fixedHeight
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock size={12} /> End Time
                  </label>
                  <div className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-3 py-3 text-slate-200 text-xs focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/50 transition-all">
                    <DatePicker
                      selected={newItem.end_time ? new Date(newItem.end_time) : null}
                      onChange={(date) => date && setNewItem(prev => ({...prev, end_time: formatDateTime(date)}))}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={1}
                      timeCaption="Time"
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="bg-transparent w-full text-white outline-none"
                      placeholderText="Select End Time"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      fixedHeight
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-6 border-t border-slate-800/80">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 bg-amber-500 text-slate-900 text-sm font-semibold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
