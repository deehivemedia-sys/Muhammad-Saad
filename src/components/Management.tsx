import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FolderOpen, Tag, BookOpen, Users, Download, Upload, Database } from 'lucide-react';
import { Project, Head, Ledger, Party } from '../types';
import { cn } from '../lib/utils';

interface ManagementProps {
  onProjectChange: () => void;
}

export default function Management({ onProjectChange }: ManagementProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'ledgers' | 'parties' | 'categories'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [parties, setParties] = useState<Party[]>([]);

  // Form states
  const [newName, setNewName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    const endpoints: Record<string, string> = {
      projects: '/api/projects',
      categories: '/api/categories',
      ledgers: '/api/ledgers',
      parties: '/api/parties'
    };
    
    try {
      if (activeTab === 'ledgers') {
        const pRes = await fetch('/api/projects');
        setProjects(await pRes.json());
      }
      
      const res = await fetch(endpoints[activeTab]);
      const data = await res.json();
      
      if (activeTab === 'projects') setProjects(data);
      if (activeTab === 'categories') setCategories(data);
      if (activeTab === 'ledgers') setLedgers(data);
      if (activeTab === 'parties') setParties(data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    let body: any = { name: newName };
    let endpoint = `/api/${activeTab}`;

    if (activeTab === 'ledgers') {
      body.project_id = selectedProjectId;
    }
    if (activeTab === 'parties') body.type = partyType;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setNewName('');
        fetchData();
        if (activeTab === 'projects') onProjectChange();
      }
    } catch (err) {
      console.error('Add error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? All related data will be deleted.')) return;
    try {
      await fetch(`/api/${activeTab}/${id}`, { method: 'DELETE' });
      fetchData();
      if (activeTab === 'projects') onProjectChange();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        {[
          { id: 'projects', label: 'Projects', icon: FolderOpen },
          { id: 'categories', label: 'Heads', icon: Tag },
          { id: 'ledgers', label: 'Ledgers', icon: BookOpen },
          { id: 'parties', label: 'Parties', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn("px-4 py-2 flex items-center gap-2 font-medium transition-all border-b-2", 
              activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Container */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-bold text-lg mb-4">Add New {activeTab.slice(0, -1)}</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter name..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            {activeTab === 'ledgers' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {activeTab === 'parties' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Type</label>
                <div className="flex gap-2">
                  {(['customer', 'supplier'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPartyType(type)}
                      className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-all", 
                        partyType === type ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-4"
            >
              <Plus size={20} />
              Save {activeTab.slice(0, -1)}
            </button>
          </form>
        </div>

        {/* List Container */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  {activeTab === 'parties' && <th className="px-6 py-4">Type</th>}
                  {activeTab === 'ledgers' && <th className="px-6 py-4">Meta</th>}
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeTab === 'projects' ? projects : 
                  activeTab === 'categories' ? categories :
                  activeTab === 'ledgers' ? ledgers : 
                  parties
                ).map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-700">{item.name}</td>
                    {activeTab === 'parties' && (
                      <td className="px-6 py-4">
                        <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                          item.type === 'customer' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                        )}>
                          {item.type}
                        </span>
                      </td>
                    )}
                    {activeTab === 'ledgers' && (
                      <td className="px-6 py-4 text-xs text-slate-400">
                        Project ID: {item.project_id}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {((activeTab === 'projects' ? projects : 
                activeTab === 'categories' ? categories :
                activeTab === 'ledgers' ? ledgers : 
                parties
              ).length === 0) && (
              <div className="py-12 text-center text-slate-400 italic">No items found</div>
            )}
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="mt-12 bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Database className="text-blue-400" size={24} />
          <h3 className="text-xl font-bold">System Backup & Recovery</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Download your entire accounting database as an offline SQLite file. This includes all projects, transactions, and settings.</p>
            <a 
              href="/api/backup/export" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/50"
            >
              <Download size={20} />
              Export Database (.sqlite)
            </a>
          </div>
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-800 pt-8 md:pt-0 md:pl-8">
            <p className="text-slate-400 text-sm">Warning: Importing a file will permanently overwrite your current data. Please ensure the file is a valid .sqlite database.</p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all cursor-pointer border border-slate-700">
              <Upload size={20} />
              Import & Restore
              <input 
                type="file" 
                className="hidden" 
                accept=".sqlite" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('database', file);
                  try {
                    const res = await fetch('/api/backup/import', { method: 'POST', body: formData });
                    const result = await res.json();
                    if (res.ok) {
                      alert(result.message);
                      window.location.reload();
                    } else {
                      alert(result.error);
                    }
                  } catch (err) {
                    alert('Restore failed');
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
