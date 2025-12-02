
export enum UserRole {
  ADMIN = 'ADMIN',
  TECH = 'TECH',
  NONE = 'NONE'
}

export interface User {
  username: string;
  role: UserRole;
}

export interface SystemUser extends User {
  password: string; // Plaintext for demo simplicity, would be hashed in production
}

export interface Employee {
  id: string; // Internal UUID
  externalId: string; // Badge Number / CSV ID
  name: string;
  department: string;
  creditLimit: number;
  currentBalance: number;
}

export enum TransactionType {
  DEBIT = 'DEBIT',   // Charge (Buying food)
  CREDIT = 'CREDIT', // Payment (Employee paying off debt)
  ADJUSTMENT = 'ADJUSTMENT' // Tech/Admin correction
}

export interface Transaction {
  id: string;
  employeeId: string;
  amount: number;
  type: TransactionType;
  timestamp: string;
  performedBy: string; // Username of Admin
  note?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  user: string;
}

// New Entity for Reporting
export enum TicketType {
  USER_FLAG = 'USER_FLAG',   // Admin reporting an employee (Business Issue)
  SYSTEM_BUG = 'SYSTEM_BUG'  // Admin reporting a crash/bug (Tech Issue)
}

export interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  createdBy: string;
  relatedEmployeeId?: string; // Optional link to employee
}

export interface AppState {
  currentUser: User | null;
  employees: Employee[];
  transactions: Transaction[];
  logs: LogEntry[];
  systemUsers: SystemUser[];
  tickets: Ticket[];
}

// Global API Definition for Window object
declare global {
  interface Window {
    CanteenAutomation: {
      debit: (externalId: string, amount: number, note: string) => void;
      credit: (externalId: string, amount: number, note: string) => void;
      getEmployee: (externalId: string) => Employee | undefined;
      importCSV: (csvData: string) => void;
      help: () => void;
    }
  }
}
