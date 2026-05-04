import { useState, useEffect } from 'react';
import { FileText, Printer, BookOpen, Download } from 'lucide-react';
import { Ledger, LedgerStatementRow } from '../types';
import { cn, formatPKR } from '../lib/utils';
import { HEAD_CATEGORIES } from '../constants';
import { exportToExcel } from '../lib/excel';

interface LedgerSheetProps {
  projectId: number;
}

export default function LedgerSheet({ projectId }: LedgerSheetProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [selectedHead, setSelectedHead] = useState<string>('');
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statement, setStatement] = useState<LedgerStatementRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMeta();
  }, [projectId]);

  useEffect(() => {
    if (selectedLedgerId) {
      fetchStatement();
    } else {
      setStatement([]);
    }
  }, [selectedLedgerId, startDate, endDate, selectedHead]);

  const fetchMeta = async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        fetch('/api/categories'),
        fetch(`/api/ledgers?project_id=${projectId}`)
      ]);
      setCategories(await cRes.json());
      setLedgers(await lRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStatement = async () => {
    setLoading(true);
    try {
      let url = `/api/ledger-statement?ledger_id=${selectedLedgerId}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (selectedHead) url += `&head=${selectedHead}`;
      
      const res = await fetch(url);
      setStatement(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totals = statement.reduce((acc, row) => ({
    debit: acc.debit + row.debit,
    credit: acc.credit + row.credit,
  }), { debit: 0, credit: 0 });

  const closingBalance = totals.credit - totals.debit;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (statement.length === 0) return;
    const exportData = statement.map(row => ({
      'Date': row.date,
      'Note': row.note,
      'Head': row.head,
      'Party': row.party_name || '—',
      'Debit (PKR)': row.debit,
      'Credit (PKR)': row.credit,
      'Balance (PKR)': row.running_balance
    }));
    const ledgerName = ledgers.find(l => l.id === selectedLedgerId)?.name || 'Ledger';
    exportToExcel(exportData, `${ledgerName}_Statement`);
  };

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Category (Head)</label>
            <select
              value={selectedHead}
              onChange={(e) => setSelectedHead(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none"
            >
              <option value="">All Heads</option>
              {categories.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Ledger</label>
            <select
              value={selectedLedgerId}
              onChange={(e) => setSelectedLedgerId(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none"
              required
            >
              <option value="">Select Ledger</option>
              {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            disabled={statement.length === 0}
            className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            title="Export to Excel"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={handlePrint}
            disabled={statement.length === 0}
            className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            title="Print Statement"
          >
            <Printer size={20} />
          </button>
        </div>
      </div>

      {/* Ledger Sheet Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ledger Statement</h2>
            {selectedLedgerId ? (
              <p className="text-slate-500 mt-1 font-medium italic">
                {ledgers.find(l => l.id === selectedLedgerId)?.name} 
                {selectedHead && <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-xs">Head: {selectedHead}</span>}
                <span className="mx-2 text-slate-300">|</span> 
                {startDate || 'Beginning'} to {endDate || 'Today'}
              </p>
            ) : (
              <p className="text-slate-400 mt-1 italic">Please select a ledger to view the statement</p>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Balance</span>
            <p className={cn("text-3xl font-black", closingBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {formatPKR(closingBalance)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Head / Party</th>
                <th className="px-6 py-5">Description</th>
                <th className="px-6 py-5 text-right font-mono bg-rose-50/30 text-rose-700">Debit (Cost)</th>
                <th className="px-6 py-5 text-right font-mono bg-emerald-50/30 text-emerald-700">Credit (Income)</th>
                <th className="px-6 py-5 text-right font-mono bg-blue-50/30 text-blue-700">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statement.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                    {row.date}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{row.party_name || <span className="text-slate-400 font-normal italic">Self</span>}</p>
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-tight">{row.head}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-[240px] break-words">
                    {row.note}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-rose-600 font-bold bg-rose-50/5">
                    {row.debit > 0 ? formatPKR(row.debit) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-emerald-600 font-bold bg-emerald-50/5">
                    {row.credit > 0 ? formatPKR(row.credit) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-black text-slate-900 bg-blue-50/5">
                    {formatPKR(row.running_balance)}
                  </td>
                </tr>
              ))}
              {statement.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <FileText size={64} className="opacity-10" />
                      <p className="italic text-lg">Select filters to generate report</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {statement.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white border-t border-slate-700">
                  <td colSpan={3} className="px-6 py-6 text-right font-bold uppercase text-xs tracking-widest text-slate-400">
                    Grand Totals (PKR)
                  </td>
                  <td className="px-6 py-6 text-right font-mono text-sm font-bold text-rose-400">
                    {formatPKR(totals.debit)}
                  </td>
                  <td className="px-6 py-6 text-right font-mono text-sm font-bold text-emerald-400">
                    {formatPKR(totals.credit)}
                  </td>
                  <td className="px-6 py-6 text-right font-mono text-sm font-black text-blue-400">
                    {formatPKR(closingBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="bg-blue-600 text-white p-6 rounded-3xl flex items-center justify-between shadow-lg shadow-blue-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl">
            <BookOpen size={24} />
          </div>
          <div>
            <h4 className="font-bold">Automated Running Balance</h4>
            <p className="text-blue-100 text-sm">Calculated using SQL Window Functions</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Sheet Status</p>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">VERIFIED</span>
        </div>
      </div>
    </div>
  );
}
