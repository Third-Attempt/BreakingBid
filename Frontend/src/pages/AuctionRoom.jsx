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

  if (!item) return <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">Loading Room...</div>;

  const isEnded = timeLeft === 'Auction Ended';

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      {/* Header */}
      <header className="bg-slate-900/60 border-b border-slate-800 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors">
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2 text-amber-500 font-mono font-medium text-lg tracking-wider">
            <Clock size={20} /> {timeLeft}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Item Details & Bidding */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
            <h1 className="text-4xl font-light mb-4">{item.name}</h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">{item.description}</p>
            
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-widest mb-1">Starting Price</p>
                <p className="text-2xl font-mono text-slate-300">${item.base_price}</p>
              </div>
              <div>
                <p className="text-sm text-amber-500/70 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <TrendingUp size={16} /> Current Highest Bid
                </p>
                <p className="text-4xl font-mono font-bold text-amber-500">${highestBid}</p>
              </div>
            </div>
          </div>

          {/* Bidding Terminal */}
          <div className="bg-slate-900/60 border border-slate-700 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
            
            <h3 className="text-xl font-medium mb-6 flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" /> Place Your Bid
            </h3>
            
            {isEnded ? (
              <div className="text-center py-8 bg-slate-950 rounded-xl border border-slate-800">
                {item.winner ? (
                  <>
                    <p className="text-amber-500 text-2xl font-bold mb-2 tracking-wide">🏆 Sold to {item.winner.username}!</p>
                    <p className="text-slate-400 font-medium text-lg">Final Price: <span className="text-white font-mono font-bold">${item.final_price?.toFixed(2)}</span></p>
                  </>
                ) : (
                  <p className="text-slate-500 font-medium text-lg">This auction has concluded without a winner.</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleBid} className="flex gap-4">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min={minRequiredBid}
                    value={bidValue}
                    onChange={(e) => setBidValue(e.target.value)}
                    placeholder={`Min: ${minRequiredBid.toFixed(2)}`}
                    required
                    disabled={isSubmitting}
                    className="w-full bg-slate-950 border border-slate-700 text-white pl-8 pr-4 py-4 rounded-xl font-mono text-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-8 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Confirm'} <Send size={18} />
                </button>
              </form>
            )}
            {!isEnded && (
              <p className="text-xs text-slate-500 mt-4 text-center">
                Bids are final. Minimum increment is 0.33% (${minDelta.toFixed(2)}).
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Live Feed */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 h-[600px] flex flex-col">
          <h3 className="text-lg font-medium mb-4 flex items-center justify-between">
            Live Feed
            <span className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Connected
            </span>
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {bids.length === 0 ? (
              <p className="text-center text-slate-500 mt-10">No bids placed yet.</p>
            ) : (
              bids.map((bid, i) => (
                <div 
                  key={bid.id || i} 
                  className={`p-4 rounded-xl border transition-all ${
                    i === 0 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-slate-950/50 border-slate-800'
                  } animate-in slide-in-from-top-4 fade-in duration-300`}
                >
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        Bidder #{bid.bidder_id} {bid.bidder_id === user?.id && <span className="text-amber-500">(You)</span>}
                      </p>
                      <p className={`font-mono font-bold ${i === 0 ? 'text-amber-500 text-xl' : 'text-slate-300 text-lg'}`}>
                        ${parseFloat(bid.value).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 font-mono">
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
