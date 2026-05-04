import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, PieChart as PieIcon, ArrowRight, Download, BookOpen } from 'lucide-react';
import { cn, formatPKR } from '../lib/utils';
import { exportToExcel } from '../lib/excel';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

interface ReportsProps {
  projectId: number;
}

export default function Reports({ projectId }: ReportsProps) {
  const [projectWise, setProjectWise] = useState<any[]>([]);
  const [ledgerWise, setLedgerWise] = useState<any[]>([]);
  const [headWise, setHeadWise] = useState<any[]>([]);
  const [partyBalances, setPartyBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [projectId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [pRes, lRes, hRes, pbRes] = await Promise.all([
        fetch('/api/reports/project-wise'),
        fetch('/api/reports/ledger-wise'),
        fetch(`/api/reports/head-wise?project_id=${projectId}`),
        fetch('/api/reports/party-balances')
      ]);
      setProjectWise(await pRes.json());
      setLedgerWise(await lRes.json());
      setHeadWise(await hRes.json());
      setPartyBalances(await pbRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportProjectSummary = () => {
    const data = projectWise.map(p => ({
      'Project': p.project_name,
      'Total Income (PKR)': p.total_income,
      'Total Expense (PKR)': p.total_expense,
      'Net Balance (PKR)': p.total_income - p.total_expense,
      'Status': p.total_income >= p.total_expense ? 'Profitable' : 'Deficit'
    }));
    exportToExcel(data, 'Project_Summary');
  };

  const exportCategorySummary = () => {
    const data = headWise.map(h => ({
      'Category': h.head_name || 'Others',
      'Total Income (PKR)': h.total_income,
      'Total Expense (PKR)': h.total_expense,
      'Net (PKR)': h.total_income - h.total_expense
    }));
    exportToExcel(data, 'HeadWise_Expenses');
  };

  const exportLedgerSummary = () => {
    const data = ledgerWise.map(l => ({
      'Ledger': l.ledger_name,
      'Project': l.project_name,
      'Total Income (PKR)': l.total_income,
      'Total Expense (PKR)': l.total_expense,
      'Net (PKR)': l.total_income - l.total_expense
    }));
    exportToExcel(data, 'LedgerWise_Summary');
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) return <div className="animate-pulse space-y-8">
     <div className="h-64 bg-white rounded-3xl border border-slate-200"></div>
     <div className="grid grid-cols-2 gap-8">
       <div className="h-96 bg-white rounded-3xl border border-slate-200"></div>
       <div className="h-96 bg-white rounded-3xl border border-slate-200"></div>
     </div>
  </div>;

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Business Reports</h2>
        <div className="flex gap-2">
          <button 
            onClick={exportProjectSummary}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <Download size={18} />
            Projects Excel
          </button>
        </div>
      </div>

      {/* Head-wise Summary (Pie Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <PieIcon size={24} className="text-blue-600" />
              Expenses by Category
            </h3>
            <button 
              onClick={exportCategorySummary}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Download size={20} />
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={headWise.filter(h => h.total_expense > 0)}
                  dataKey="total_expense"
                  nameKey="head_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                >
                  {headWise.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={24} className="text-emerald-600" />
            Category Totals
          </h3>
          <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
            {headWise.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">{h.head_name}</p>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">In: {formatPKR(h.total_income)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-rose-600">{formatPKR(h.total_expense)}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total Spent</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger-wise Analysis */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-8">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BookOpen size={24} className="text-orange-600" />
            Ledger-wise Summary
          </h3>
          <button 
            onClick={exportLedgerSummary}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Download size={14} />
            Export
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ledgerWise.map((l, idx) => (
            <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{l.project_name}</p>
                <h4 className="font-bold text-slate-800 text-lg mb-4">{l.ledger_name}</h4>
              </div>
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">Net Balance</p>
                  <p className={cn("font-mono font-bold", (l.total_income - l.total_expense) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {formatPKR(l.total_income - l.total_expense)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Churn</p>
                  <p className="text-xs font-mono font-bold text-slate-600">{formatPKR(l.total_income + l.total_expense)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
          <Users size={24} className="text-indigo-600" />
          Party Balances (Receivable / Payable)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partyBalances.map((p, idx) => {
            const isReceivable = p.balance > 0;
            return (
              <div key={idx} className={cn("p-6 rounded-3xl border transition-all hover:scale-[1.02]", 
                isReceivable ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
              )}>
                <div className="flex justify-between items-start mb-4">
                  <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full", 
                    isReceivable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  )}>
                    {p.party_type === 'customer' ? 'Customer' : 'Supplier'}
                  </span>
                  <ArrowRight size={16} className={cn(isReceivable ? 'text-emerald-300' : 'text-rose-300')} />
                </div>
                <h4 className="font-black text-slate-900 text-lg truncate mb-1">{p.party_name}</h4>
                <p className={cn("text-xs font-bold uppercase tracking-widest", 
                  isReceivable ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {isReceivable ? 'Receivable' : 'Payable'}
                </p>
                <p className={cn("text-2xl font-black mt-4", 
                  isReceivable ? 'text-emerald-700' : 'text-rose-700'
                )}>
                  {formatPKR(p.balance)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project-wise Net Analysis */}
      <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-blue-900/20">
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-3">
            <BarChart3 size={32} className="text-blue-400" />
            Cross-Project Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {projectWise.map((p, idx) => (
              <div key={idx} className="border-l-2 border-slate-800 pl-6 space-y-2">
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">{p.project_name}</p>
                <p className="text-2xl font-black text-white">{formatPKR(p.total_income - p.total_expense)}</p>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", p.total_income >= p.total_expense ? 'bg-emerald-400' : 'bg-rose-400')}></span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase italic">
                    {p.total_income >= p.total_expense ? 'Profitable' : 'Deficit'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
}
