
import { Employee, Transaction, LogEntry, TransactionType, AppState, SystemUser, Ticket, TicketType } from "../types";
import { LOCAL_STORAGE_KEY, SYSTEM_USERS } from "../constants";

// This service mimics the SQL Data Access Layer requested.
// It separates User/System data from Employee data.

const getInitialState = (): AppState => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    const parsedState = JSON.parse(stored);
    // Migration: Ensure systemUsers exists if loading from an older state version
    if (!parsedState.systemUsers || parsedState.systemUsers.length === 0) {
      parsedState.systemUsers = [...SYSTEM_USERS];
    }
    // Migration: Ensure tickets exist
    if (!parsedState.tickets) {
      parsedState.tickets = [];
    }
    return parsedState;
  }
  return {
    currentUser: null,
    employees: [],
    transactions: [],
    logs: [],
    systemUsers: [...SYSTEM_USERS], // Initial Seed
    tickets: []
  };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};

export const loadState = (): AppState => {
  return getInitialState();
};

export const logEvent = (state: AppState, message: string, level: 'INFO' | 'WARNING' | 'ERROR' = 'INFO'): AppState => {
  const newLog: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    message,
    user: state.currentUser?.username || 'SYSTEM'
  };
  return {
    ...state,
    logs: [newLog, ...state.logs].slice(0, 1000) // Keep last 1000 logs
  };
};

export const createTicket = (state: AppState, type: TicketType, title: string, description: string, relatedEmployeeId?: string): AppState => {
  const newTicket: Ticket = {
    id: crypto.randomUUID(),
    type,
    title,
    description,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    createdBy: state.currentUser?.username || 'System',
    relatedEmployeeId
  };
  return {
    ...state,
    tickets: [newTicket, ...state.tickets]
  };
};

export const resolveTicket = (state: AppState, ticketId: string): AppState => {
  return {
    ...state,
    tickets: state.tickets.map(t => t.id === ticketId ? { ...t, status: 'RESOLVED' } : t)
  };
};

// ACID Transaction Simulation
export const processTransaction = (
  state: AppState,
  employeeId: string,
  amount: number,
  type: TransactionType,
  note: string
): AppState => {
  // 1. Validate
  const empIndex = state.employees.findIndex(e => e.id === employeeId);
  if (empIndex === -1) throw new Error("Employee not found");

  const emp = state.employees[empIndex];
  
  // 2. Business Logic Checks
  let newBalance = emp.currentBalance;
  if (type === TransactionType.DEBIT) {
    if (emp.currentBalance + amount > emp.creditLimit) {
      throw new Error(`Credit limit exceeded. Limit: $${emp.creditLimit}, Current: $${emp.currentBalance}`);
    }
    newBalance += amount;
  } else if (type === TransactionType.CREDIT) {
    newBalance -= amount;
  }

  // 3. Atomicity (Create Transaction + Update Balance)
  const newTransaction: Transaction = {
    id: crypto.randomUUID(),
    employeeId: emp.id,
    amount,
    type,
    timestamp: new Date().toISOString(),
    performedBy: state.currentUser?.username || 'Unknown',
    note
  };

  const updatedEmployees = [...state.employees];
  updatedEmployees[empIndex] = { ...emp, currentBalance: newBalance };

  return {
    ...state,
    employees: updatedEmployees,
    transactions: [newTransaction, ...state.transactions]
  };
};

export const importEmployeesFromCSV = (state: AppState, csvText: string): AppState => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  // Validation of headers could go here
  
  const newEmployees: Employee[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 4) continue;

    // Check if exists by External ID to avoid duplicates (Upsert logic)
    const existingIndex = state.employees.findIndex(e => e.externalId === cols[0].trim());
    
    if (existingIndex === -1) {
        newEmployees.push({
            id: crypto.randomUUID(),
            externalId: cols[0].trim(),
            name: cols[1].trim(),
            department: cols[2].trim(),
            creditLimit: parseFloat(cols[3].trim()) || 0,
            currentBalance: 0
        });
    }
  }

  return {
      ...state,
      employees: [...state.employees, ...newEmployees]
  };
};
