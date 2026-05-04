import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Wallet, Tag, User, StickyNote, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Ledger, Party, Transaction } from '../types';
import { format } from 'date-fns';
import { cn, formatPKR } from '../lib/utils';
import { HEAD_CATEGORIES } from '../constants';

interface TransactionsProps {
  projectId: number;
}

export default function Transactions({ projectId }: TransactionsProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newTx, setNewTx] = useState({
    head: '',
    ledger_id: '',
    party_id: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  });

  useEffect(() => {
    fetchMeta();
    fetchTransactions();
  }, [projectId]);

  const fetchMeta = async () => {
    try {
      const [cRes, lRes, pRes] = await Promise.all([
        fetch('/api/categories'),
        fetch(`/api/ledgers?project_id=${projectId}`),
        fetch('/api/parties')
      ]);
      const cats = await cRes.json();
      const lData = await lRes.json();
      setCategories(cats);
      setLedgers(lData);
      setParties(await pRes.json());
      
      // Auto-select first head/ledger
      if (cats.length > 0 && !newTx.head) {
        setNewTx(prev => ({ ...prev, head: cats[0].name }));
      }
      if (lData.length > 0 && !newTx.ledger_id) {
        setNewTx(prev => ({ ...prev, ledger_id: lData[0].id.toString() }));
      }
    } catch (err) {
      console.error('Meta fetch error:', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?project_id=${projectId}&limit=50`);
      setTransactions(await res.json());
    } catch (err) {
      console.error('TX fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.head || !newTx.ledger_id || !newTx.amount) {
      alert('Please fill required fields');
      return;
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTx,
          project_id: projectId,
          party_id: newTx.party_id || null,
          amount: parseFloat(newTx.amount)
        })
      });
      if (res.ok) {
        setNewTx({
          ...newTx,
          amount: '',
          note: '',
          party_id: ''
        });
        fetchTransactions();
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Transaction Form */}
      <div className="xl:col-span-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-0">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
            <Plus size={24} className="text-blue-600" />
            New Transaction
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setNewTx({ ...newTx, type: 'income' })}
                className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all", 
                  newTx.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setNewTx({ ...newTx, type: 'expense' })}
                className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all", 
                  newTx.type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Expense
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Category (Head)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={newTx.head}
                    onChange={(e) => setNewTx({ ...newTx, head: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                    required
                  >
                    <option value="">Select Head</option>
                    {categories.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Ledger</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={newTx.ledger_id}
                    onChange={(e) => setNewTx({ ...newTx, ledger_id: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                    required
                  >
                    <option value="">Select Ledger</option>
                    {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Party (Optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={newTx.party_id}
                    onChange={(e) => setNewTx({ ...newTx, party_id: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                  >
                    <option value="">Select Party</option>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Amount (PKR)</label>
                  <input
                    type="number"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    min="1"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Date</label>
                  <input
                    type="date"
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Note</label>
                <div className="relative">
                  <StickyNote className="absolute left-3 top-3 text-slate-400" size={16} />
                  <textarea
                    value={newTx.note}
                    onChange={(e) => setNewTx({ ...newTx, note: e.target.value })}
                    placeholder="Enter details..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-24 resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className={cn("w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-blue-200 transition-all transform active:scale-[0.98]", 
                newTx.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
              )}
            >
              Add {newTx.type === 'income' ? 'Credit' : 'Debit'}
            </button>
          </form>
        </div>
      </div>

      {/* Transaction History */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900">Transaction History</h3>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
            <Search size={16} />
            <input type="text" placeholder="Search..." className="bg-transparent focus:outline-none w-48" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 italic text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Ledger / Head</th>
                <th className="px-6 py-4">Party</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       <Calendar size={14} className="text-slate-300" />
                       <span className="text-sm font-medium text-slate-600">{tx.date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800 leading-tight">{tx.ledger_name}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">{tx.head}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{tx.party_name || '—'}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-xs text-slate-500 truncate">{tx.note || 'No notes'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={cn("flex items-center justify-end gap-2 font-mono font-bold", 
                      tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatPKR(tx.amount)}
                      {tx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-300">
                      <Wallet size={48} className="opacity-20" />
                      <p className="italic">No transactions found for this project</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
