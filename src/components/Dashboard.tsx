import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, Clock, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react';
import { Transaction } from '../types';
import { cn, formatPKR } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  projectId: number;
}

export default function Dashboard({ projectId }: DashboardProps) {
  const [stats, setStats] = useState({ total_income: 0, total_expense: 0 });
  const [lastTransactions, setLastTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [projectId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, transRes] = await Promise.all([
        fetch(`/api/reports/dashboard`),
        fetch(`/api/transactions?project_id=${projectId}&limit=10`)
      ]);
      const statsData = await statsRes.json();
      const transData = await transRes.json();
      
      setStats(statsData || { total_income: 0, total_expense: 0 });
      setLastTransactions(transData);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Income', amount: stats.total_income, color: '#10b981' },
    { name: 'Expense', amount: stats.total_expense, color: '#ef4444' }
  ];

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200"></div>)}
      </div>
      <div className="h-64 bg-white rounded-2xl border border-slate-200"></div>
    </div>;
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+ PKR</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Total Income</h3>
          <p className="text-2xl font-bold mt-1 text-slate-900">{formatPKR(stats.total_income)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown size={24} />
            </div>
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">- PKR</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Total Expense</h3>
          <p className="text-2xl font-bold mt-1 text-slate-900">{formatPKR(stats.total_expense)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Wallet size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Net Balance</h3>
          <p className={cn("text-2xl font-bold mt-1", stats.total_income - stats.total_expense >= 0 ? "text-slate-900" : "text-rose-600")}>
            {formatPKR(stats.total_income - stats.total_expense)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" />
            Income vs Expense
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatPKR(value)}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Last Transactions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-indigo-600" />
              Recent Transactions
            </div>
          </h3>
          <div className="space-y-4">
            {lastTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                    {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{tx.ledger_name}</p>
                    <p className="text-xs text-slate-500">{tx.date}</p>
                  </div>
                </div>
                <p className={cn("text-sm font-bold", tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                  {tx.type === 'income' ? '+' : '-'}{formatPKR(tx.amount)}
                </p>
              </div>
            ))}
            {lastTransactions.length === 0 && (
              <p className="text-center text-slate-400 py-8 italic">No recent transactions</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
