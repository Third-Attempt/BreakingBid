import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, Gavel, History, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('wallet');
  
  const [items, setItems] = useState([]);
  const [bids, setBids] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Real-time user stats
  const [stats, setStats] = useState({
    wallet: user?.wallet || 0,
    rolling_debt: user?.rolling_debt || 0
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch current user stats to get fresh wallet/debt
        const userRes = await api.get('/users/me');
        setStats({ wallet: userRes.data.wallet, rolling_debt: userRes.data.rolling_debt });

        // Fetch all profile data concurrently
        const [itemsRes, bidsRes, walletRes] = await Promise.all([
          api.get('/profile/items?factor=0'),
          api.get('/profile/bids?factor=0'),
          api.get('/profile/wallet?factor=0')
        ]);
        
        setItems(itemsRes.data);
        setBids(bidsRes.data);
        setTransactions(walletRes.data);
      } catch (err) {
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const totalWealth = stats.wallet + stats.rolling_debt;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Wallet Dashboard Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="glass-panel p-8 col-span-1 lg:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[var(--color-elite-accent)]/10 rounded-full blur-3xl group-hover:bg-[var(--color-elite-accent)]/20 transition-all duration-700"></div>
          
          <h2 className="text-xl font-display font-medium text-white mb-8 flex items-center gap-3">
            <Wallet className="text-[var(--color-elite-accent)]" size={24} /> Financial Portfolio
          </h2>
          
          <div className="flex flex-col md:flex-row gap-8 md:gap-16">
            <div>
              <p className="text-[#a1a1aa] text-xs uppercase tracking-widest font-semibold mb-2">Available Balance</p>
              <p className="text-5xl font-mono text-white font-medium">${stats.wallet.toFixed(2)}</p>
            </div>
            
            <div className="hidden md:block w-px h-16 bg-[var(--color-elite-border)] self-end"></div>
            
            <div>
              <p className="text-[#a1a1aa] text-xs uppercase tracking-widest font-semibold mb-2 flex items-center gap-2">
                <ShieldAlert size={14} className="text-yellow-500" /> Escrow / Locked
              </p>
              <p className="text-3xl font-mono text-zinc-400 font-medium">${stats.rolling_debt.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="solid-panel p-8 flex flex-col justify-center">
          <p className="text-[#a1a1aa] text-xs uppercase tracking-widest font-semibold mb-2">Total Wealth</p>
          <p className="text-4xl font-mono text-[var(--color-elite-accent)] font-medium mb-6">${totalWealth.toFixed(2)}</p>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#a1a1aa]">Active Bids</span>
              <span className="text-white font-mono">{bids.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#a1a1aa]">Auctions Won/Listed</span>
              <span className="text-white font-mono">{items.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex gap-4 mb-8 border-b border-[var(--color-elite-border)] overflow-x-auto pb-px">
        {['wallet', 'items', 'bids'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-semibold capitalize whitespace-nowrap transition-all duration-300 relative ${
              activeTab === tab 
                ? 'text-[var(--color-elite-accent)]' 
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            {tab === 'wallet' && <History className="inline mr-2" size={16} />}
            {tab === 'items' && <Gavel className="inline mr-2" size={16} />}
            {tab === 'bids' && <Clock className="inline mr-2" size={16} />}
            {tab === 'wallet' ? 'Ledger' : tab === 'items' ? 'My Auctions' : 'My Bids'}
            
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-elite-accent)] rounded-t-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="w-8 h-8 border-2 border-[var(--color-elite-accent)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* LEDGER TAB */}
            {activeTab === 'wallet' && (
              <div className="solid-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-[var(--color-elite-border)]">
                        <th className="px-6 py-4 text-xs uppercase tracking-widest text-[#a1a1aa] font-semibold">Type</th>
                        <th className="px-6 py-4 text-xs uppercase tracking-widest text-[#a1a1aa] font-semibold">Amount</th>
                        <th className="px-6 py-4 text-xs uppercase tracking-widest text-[#a1a1aa] font-semibold">Item ID</th>
                        <th className="px-6 py-4 text-xs uppercase tracking-widest text-[#a1a1aa] font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-elite-border)]">
                      {transactions.length === 0 && (
                        <tr><td colSpan="4" className="px-6 py-8 text-center text-[#a1a1aa]">No transactions yet.</td></tr>
                      )}
                      {transactions.map((tx, i) => {
                        // Determine if it's credit or debit for the current user
                        const isCredit = tx.to_id === user?.id;
                        return (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                                isCredit ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {isCredit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {tx.category}
                              </span>
                            </td>
                            <td className={`px-6 py-4 font-mono font-medium ${isCredit ? 'text-green-400' : 'text-white'}`}>
                              {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-400">
                              {tx.item_id ? <Link to={`/item/${tx.item_id}`} className="hover:text-[var(--color-elite-accent)] transition-colors">#{tx.item_id}</Link> : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-400">
                              {new Date(tx.time).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MY AUCTIONS TAB */}
            {activeTab === 'items' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.length === 0 && (
                  <div className="col-span-full py-16 text-center text-[#a1a1aa]">You haven't participated in any auctions yet.</div>
                )}
                {items.map(item => (
                  <Link key={item.id} to={`/item/${item.id}`} className="solid-panel p-6 hover:border-[var(--color-elite-accent)]/50 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-display font-medium text-lg text-white group-hover:text-[var(--color-elite-accent)] transition-colors">{item.name}</h3>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded font-semibold ${item.seller.id === user?.id ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {item.seller.id === user?.id ? 'Selling' : 'Won'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-6">
                      <div>
                        <p className="text-[11px] text-[#a1a1aa] uppercase tracking-widest mb-1">Final Price</p>
                        <p className="font-mono text-xl text-white">${Number(item.final_price || item.current_price || item.base_price).toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-[#a1a1aa]">{new Date(item.end_time).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* MY BIDS TAB */}
            {activeTab === 'bids' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bids.length === 0 && (
                  <div className="col-span-full py-16 text-center text-[#a1a1aa]">You haven't placed any bids yet.</div>
                )}
                {bids.map(bid => (
                  <Link key={bid.id} to={`/item/${bid.item.id}`} className="solid-panel p-6 hover:border-[var(--color-elite-accent)]/50 transition-all group">
                    <p className="text-sm text-[#a1a1aa] mb-2">Bid on:</p>
                    <h3 className="font-display font-medium text-lg text-white group-hover:text-[var(--color-elite-accent)] transition-colors truncate">{bid.item.name}</h3>
                    
                    <div className="flex justify-between items-end mt-6 pt-4 border-t border-[var(--color-elite-border)]">
                      <div>
                        <p className="text-[11px] text-[#a1a1aa] uppercase tracking-widest mb-1">Your Bid</p>
                        <p className="font-mono text-xl text-[var(--color-elite-accent)]">${bid.value.toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-[#a1a1aa]">{new Date(bid.created_at).toLocaleTimeString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
