export interface Project {
  id: number;
  name: string;
}

export interface Head {
  id: number;
  project_id: number;
  name: string;
}

export interface Ledger {
  id: number;
  project_id: number;
  name: string;
}

export interface Party {
  id: number;
  name: string;
  type: 'customer' | 'supplier';
}

export interface Transaction {
  id: number;
  project_id: number;
  ledger_id: number;
  head: string;
  party_id: number | null;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  note: string;
  party_name?: string;
  ledger_name?: string;
}

export interface LedgerStatementRow {
  date: string;
  note: string;
  head: string;
  party_name: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

