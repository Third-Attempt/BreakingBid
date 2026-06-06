import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api, { API_URL } from '../api';
import toast from 'react-hot-toast';
import { ArrowLeft, Clock, TrendingUp, AlertCircle, Send } from 'lucide-react';

export default function AuctionRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);
  
  const [item, setItem] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidValue, setBidValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [timeOffset, setTimeOffset] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const ws = useRef(null);
  const bidsContainerRef = useRef(null);

  // 1. Initial Load & Time Sync
  useEffect(() => {
    const init = async () => {
      try {
        // Sync clock with server
        const timeRes = await api.get('/server-time');
        const serverTime = new Date(timeRes.data.server_time).getTime();
        const localTime = Date.now();
        setTimeOffset(serverTime - localTime);

        // Fetch item and past bids
        const [itemRes, bidsRes] = await Promise.all([
          api.get(`/items/${id}`),
          api.get(`/items/${id}/bids/`)
        ]);
        
        setItem(itemRes.data);
        // Sort bids descending (newest top)
        setBids(bidsRes.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      } catch (err) {
        toast.error("Failed to load auction");
        navigate('/dashboard');
      }
    };
    init();
  }, [id, navigate]);

  // 2. WebSocket Connection
  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const connectWs = () => {
      if (!isMounted) return;
      
      // Dynamically convert http to ws and https to wss for production
      const wsProtocol = API_URL.startsWith('https') ? 'wss:' : 'ws:';
      const wsHost = API_URL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${wsHost}/items/${id}/bids/ws?token=${token}`;
      
      // Create WebSocket connection
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'newbid') {
          // Add new bid to the top of the list
          setBids(prev => {
            // Prevent duplicate bids from being added if two websockets accidentally fire
            if (prev.some(b => b.value === data.value && b.bidder_id === data.bidder_id)) {
              return prev;
            }
            return [{
              id: Date.now(), // temporary UI id
              value: data.value,
              bidder_id: data.bidder_id,
              username: data.bidder_name || data.username,
              created_at: data.server_time
            }, ...prev];
          });
        }
        
        if (data.type === 'outbid') {
          toast('⚠️ You have been outbid!', {
            icon: '🔥',
            style: { border: '1px solid #fbbf24', color: '#fbbf24' }
          });
        }
      };

      ws.current.onclose = () => {
        // Reconnect logic if disconnected unexpectedly
        if (isMounted) {
          setTimeout(connectWs, 3000);
        }
      };
    };

    connectWs();
    return () => {
      isMounted = false;
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [id, token]);

  // 3. Live Countdown Timer
  useEffect(() => {
    if (!item) return;
    
    const calculateTimeLeft = () => {
      // Apply offset to prevent users cheating by changing laptop time
      const trueNow = Date.now() + timeOffset;
      const end = new Date(item.end_time).getTime();
      const difference = end - trueNow;
      
      if (difference <= 0) {
        setTimeLeft('Auction Ended');
        return;
      }
      
      const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const m = Math.floor((difference / 1000 / 60) % 60);
      const s = Math.floor((difference / 1000) % 60);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [item, timeOffset]);

  const highestBid = bids.length > 0 ? bids[0].value : item?.base_price;
  const minDelta = Math.ceil((highestBid || 0) * 0.0033);
  const minRequiredBid = (highestBid || 0) + minDelta;

  const handleBid = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const val = parseFloat(bidValue);
    
    if (val <= highestBid + minDelta) {
      toast.error(`Bid must be at least $${minRequiredBid.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/items/${id}/bids/`, { value: val });
      setBidValue('');
      // Note: We don't manually add the bid to the UI here. 
      // We let the WebSocket broadcast event do it to ensure 100% truth.
    } catch (err) {
      toast.error(err.response?.data?.detail || "Bid failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) {
    return (
      <div className="min-h-screen text-[#f4f4f5] font-sans p-8">
        <header className="max-w-6xl mx-auto flex items-center justify-between mb-8 pb-6 border-b border-[var(--color-elite-border)] animate-pulse">
          <div className="w-40 h-6 bg-[var(--color-elite-border)] rounded-md"></div>
          <div className="w-24 h-6 bg-[var(--color-elite-border)] rounded-md"></div>
        </header>
        <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="solid-panel p-8 animate-pulse h-64">
              <div className="w-3/4 h-10 bg-[var(--color-elite-border)] rounded-md mb-4"></div>
              <div className="w-full h-4 bg-[var(--color-elite-border)] rounded-md mb-2"></div>
              <div className="w-5/6 h-4 bg-[var(--color-elite-border)] rounded-md mb-8"></div>
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-[var(--color-elite-border)]">
                <div>
                  <div className="w-24 h-3 bg-[var(--color-elite-border)] rounded-md mb-2"></div>
                  <div className="w-32 h-8 bg-[var(--color-elite-border)] rounded-md"></div>
                </div>
                <div>
                  <div className="w-32 h-3 bg-[var(--color-elite-border)] rounded-md mb-2"></div>
                  <div className="w-40 h-10 bg-[var(--color-elite-border)] rounded-md"></div>
                </div>
              </div>
            </div>
            <div className="glass-panel p-8 animate-pulse h-40 border border-[var(--color-elite-border)]"></div>
          </div>
          <div className="glass-panel p-6 h-[600px] animate-pulse">
            <div className="w-32 h-6 bg-[var(--color-elite-border)] rounded-md mb-6"></div>
            <div className="space-y-4">
              <div className="w-full h-20 bg-[var(--color-elite-border)] rounded-xl"></div>
              <div className="w-full h-20 bg-[var(--color-elite-border)] rounded-xl"></div>
              <div className="w-full h-20 bg-[var(--color-elite-border)] rounded-xl"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isEnded = timeLeft === 'Auction Ended';

  return (
    <div className="min-h-screen text-[#f4f4f5] font-sans pb-12">
      {/* Header */}
      <header className="bg-[#000000]/40 border-b border-[var(--color-elite-border)] backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white transition-colors duration-300 font-medium">
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2 text-[var(--color-elite-accent)] font-mono font-medium text-lg tracking-wider">
            <Clock size={20} /> {timeLeft}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Item Details & Bidding */}
        <div className="lg:col-span-2 space-y-8">
          <div className="solid-panel p-10 relative overflow-hidden">

            <h1 className="text-3xl md:text-4xl font-display font-medium mb-4 text-white tracking-tight">{item.name}</h1>
            <p className="text-[#a1a1aa] text-base leading-relaxed mb-8">{item.description}</p>
            
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-[var(--color-elite-border)]">
              <div>
                <p className="text-xs text-[#a1a1aa] uppercase tracking-widest font-semibold mb-2">Starting Price</p>
                <p className="text-2xl font-mono text-[#f4f4f5] tracking-tight">${item.base_price}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-elite-accent)] uppercase tracking-widest font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp size={16} /> Current Highest Bid
                </p>
                <p className="text-4xl font-mono font-bold text-[var(--color-elite-accent)] tracking-tight">${Number(highestBid).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Bidding Terminal (Sticky for easy access) */}
          <div className="glass-panel p-8 relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.05)] sticky top-[100px] z-40">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-elite-accent)] to-transparent opacity-50"></div>
            
            <h3 className="text-2xl font-display font-medium mb-8 text-white flex items-center gap-3">
              <AlertCircle size={24} className="text-[var(--color-elite-accent)]" /> Place Your Bid
            </h3>
            
            {isEnded ? (
              <div className="text-center py-10 bg-[#000000]/40 rounded-xl border border-[var(--color-elite-border)]">
                {item.winner ? (
                  <>
                    <p className="text-[var(--color-elite-accent)] text-3xl font-display font-bold mb-3 tracking-wide">🏆 Sold to {item.winner.username}!</p>
                    <p className="text-[#a1a1aa] font-medium text-lg">Final Price: <span className="text-white font-mono font-bold text-2xl ml-2">${item.final_price?.toFixed(2)}</span></p>
                  </>
                ) : (
                  <p className="text-[#a1a1aa] font-medium text-lg">This auction has concluded without a winner.</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleBid} className="flex gap-4">
                <div className="relative flex-1">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#a1a1aa] font-mono text-xl">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min={minRequiredBid}
                    value={bidValue}
                    onChange={(e) => setBidValue(e.target.value)}
                    placeholder={`Min: ${minRequiredBid.toFixed(2)}`}
                    required
                    disabled={isSubmitting}
                    className="w-full bg-[#000000]/40 border border-[var(--color-elite-border)] text-white pl-12 pr-6 py-4 rounded-xl font-mono text-lg focus:outline-none focus:border-[var(--color-elite-accent)] focus:ring-1 focus:ring-[var(--color-elite-accent)]/50 transition-all disabled:opacity-50"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[var(--color-elite-accent)] hover:bg-[var(--color-elite-accent-hover)] text-black font-bold px-8 rounded-xl transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.2)] text-base"
                >
                  {isSubmitting ? 'Sending...' : 'Confirm'} <Send size={20} />
                </button>
              </form>
            )}
            {!isEnded && (
              <p className="text-xs text-[#a1a1aa] mt-5 text-center font-medium uppercase tracking-widest">
                Bids are final. Minimum increment is 0.33% (${minDelta.toFixed(2)}).
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Live Feed */}
        <div className="glass-panel p-8 h-[750px] flex flex-col relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[var(--color-elite-card)] to-transparent pointer-events-none z-10"></div>
          
          <h3 className="text-xl font-display font-medium mb-6 text-white flex items-center justify-between">
            Live Feed
            <span className="flex items-center gap-2 text-xs font-mono text-[var(--color-elite-accent)] bg-[var(--color-elite-accent)]/10 px-3 py-1.5 rounded-full border border-[var(--color-elite-accent)]/20 uppercase tracking-widest font-semibold">
              <span className="w-2 h-2 rounded-full bg-[var(--color-elite-accent)] animate-pulse shadow-[0_0_10px_currentColor]"></span>
              Connected
            </span>
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-3 scrollbar-thin scrollbar-thumb-[var(--color-elite-border)] pb-12 relative z-0">
            {bids.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#a1a1aa] font-medium text-lg">No bids placed yet.</p>
                <p className="text-[#52525b] text-sm mt-2">Be the first to bid on this item.</p>
              </div>
            ) : (
              bids.map((bid, i) => (
                <div 
                  key={bid.id || i} 
                  className={`p-5 rounded-xl border transition-all duration-500 ${
                    i === 0 
                      ? 'bg-[var(--color-elite-accent)]/15 border-[var(--color-elite-accent)]/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : (bid.bidder_id === user?.id || bid.bidder?.id === user?.id)
                        ? 'bg-white/10 border-white/20 opacity-100'
                        : 'bg-[#000000]/40 border-[var(--color-elite-border)] opacity-70'
                  } animate-in slide-in-from-top-4 fade-in`}
                >
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[11px] text-[#a1a1aa] uppercase tracking-widest font-semibold mb-1.5">
                        {bid.username || bid.bidder?.username || `Bidder #${bid.bidder_id || bid.bidder?.id}`} {(bid.bidder_id === user?.id || bid.bidder?.id === user?.id) && <span className="text-[var(--color-elite-accent)] ml-1">(You)</span>}
                      </p>
                      <p className={`font-mono tracking-tight ${i === 0 ? 'text-[var(--color-elite-accent)] font-bold text-xl' : 'text-[#e4e4e7] font-medium text-lg'}`}>
                        ${parseFloat(bid.value).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#a1a1aa] font-mono tracking-wider">
                      {new Date(bid.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
