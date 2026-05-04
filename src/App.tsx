/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Settings, 
  BarChart3, 
  Users,
  Wallet,
  Menu,
  X,
  Plus,
  Trash2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Project, Head, Ledger, Party, Transaction } from './types';
import { cn } from './lib/utils';

// Components
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import LedgerSheet from './components/LedgerSheet';
import Reports from './components/Reports';
import Management from './components/Management';

type View = 'dashboard' | 'transactions' | 'ledger-sheet' | 'reports' | 'management';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
      if (data.length > 0 && !activeProjectId) {
        setActiveProjectId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: PlusCircle },
    { id: 'ledger-sheet', label: 'Ledger Sheet', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'management', label: 'Management', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-slate-200 flex flex-col z-20"
      >
        <div className="p-6 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent leading-tight"
              >
                Shalimar Group
              </motion.h1>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-slate-100 rounded-md text-slate-500"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "w-full flex items-center p-3 rounded-xl transition-all duration-200 group text-left",
                currentView === item.id 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <item.icon size={20} className={cn(
                "flex-shrink-0 transition-colors",
                currentView === item.id ? "text-blue-600" : "group-hover:text-slate-700"
              )} />
              {isSidebarOpen && (
                <span className="ml-3 font-medium truncate">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 italic text-[10px] text-slate-400 text-center">
          {isSidebarOpen ? 'Offline Accounting Solution' : 'OFFLINE'}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header / Project Tabs */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 shrink-0">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  activeProjectId === p.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {p.name}
              </button>
            ))}
            {projects.length === 0 && (
              <span className="text-slate-400 text-sm">No projects. Go to Management to add one.</span>
            )}
          </div>
          
          <div className="ml-4 flex items-center gap-4 border-l border-slate-100 pl-4 text-xs font-mono text-slate-400 uppercase tracking-wider">
            Currency: PKR
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + activeProjectId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              {!activeProjectId && currentView !== 'management' ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                  <Settings size={48} className="mb-4 opacity-20" />
                  <p>Please select or create a project first.</p>
                </div>
              ) : (
                <>
                  {currentView === 'dashboard' && <Dashboard projectId={activeProjectId!} />}
                  {currentView === 'transactions' && <Transactions projectId={activeProjectId!} />}
                  {currentView === 'ledger-sheet' && <LedgerSheet projectId={activeProjectId!} />}
                  {currentView === 'reports' && <Reports projectId={activeProjectId!} />}
                  {currentView === 'management' && <Management onProjectChange={fetchProjects} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

