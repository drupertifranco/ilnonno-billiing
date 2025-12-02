
import React, { useState, useEffect } from 'react';
import { User, UserRole, AppState, TransactionType, SystemUser, TicketType } from './types';
import { loadState, saveState, logEvent, processTransaction, importEmployeesFromCSV, createTicket, resolveTicket } from './services/storageService';
import { LoginForm } from './components/LoginForm';
import { AdminPanel } from './components/AdminPanel';
import { TechPanel } from './components/TechPanel';

const App: React.FC = () => {
  // Central State Management (Simulating the Database State)
  const [appState, setAppState] = useState<AppState>({
    currentUser: null,
    employees: [],
    transactions: [],
    logs: [],
    systemUsers: [], // Initialized by storageService
    tickets: []
  });

  // Load "DB" on mount
  useEffect(() => {
    const loaded = loadState();
    setAppState(loaded);
  }, []);

  // Persist "DB" on change (Simulating SQL commit)
  useEffect(() => {
    saveState(appState);
  }, [appState]);

  // Expose Automation API for external workflows
  useEffect(() => {
    window.CanteenAutomation = {
      debit: (externalId: string, amount: number, note: string) => {
        try {
          // We need a way to access current state in event loop.
          // Since this closure captures initial state, we use the functional update pattern or ref, 
          // but for simplicity in this demo, we will read from LocalStorage or assume optimistic UI updates
          // WARNING: In a real React app, exposing state to window requires a Ref to access current state.
          // For this demo, we will grab the latest appState from the setter callback to be safe,
          // OR we re-implement logic to load->modify->save to localStorage directly.
          
          setAppState(currentState => {
            const emp = currentState.employees.find(e => e.externalId === externalId);
            if (!emp) {
               console.error("API Error: Employee not found");
               return currentState;
            }
            try {
              const newState = processTransaction(currentState, emp.id, amount, TransactionType.DEBIT, note || "API Debit");
              logEvent(newState, `API Debit: ${externalId} -$${amount}`, 'INFO');
              return newState;
            } catch(e) {
              console.error(e);
              return currentState;
            }
          });
        } catch (e) {
          console.error("Automation API Error", e);
        }
      },
      credit: (externalId: string, amount: number, note: string) => {
        setAppState(currentState => {
            const emp = currentState.employees.find(e => e.externalId === externalId);
            if (!emp) return currentState;
            const newState = processTransaction(currentState, emp.id, amount, TransactionType.CREDIT, note || "API Credit");
            return newState;
        });
      },
      getEmployee: (externalId: string) => {
        // Limitation: This reads from the captured state at effect time unless we use a Ref.
        // For 100% correctness in React 18 strict mode, we'd use a ref. 
        // We will just return from the current appState state variable, bearing in mind it updates on render.
        return appState.employees.find(e => e.externalId === externalId);
      },
      importCSV: (csvData: string) => {
        setAppState(currentState => importEmployeesFromCSV(currentState, csvData));
      },
      help: () => {
        console.log(`
          Canteen Automation API:
          - debit(externalId, amount, note)
          - credit(externalId, amount, note)
          - importCSV(csvString)
          - getEmployee(externalId)
        `);
      }
    };
  }, [appState.employees]); // Re-bind when employees change so getEmployee is fresh-ish

  const handleLogin = (user: User) => {
    const newState = logEvent(appState, `User Login: ${user.username}`, 'INFO');
    setAppState({ ...newState, currentUser: user });
  };

  const handleLogout = () => {
    setAppState(prev => ({ ...prev, currentUser: null }));
  };

  const handleImport = (csv: string) => {
    try {
      const newState = importEmployeesFromCSV(appState, csv);
      const loggedState = logEvent(newState, `Imported Employees via CSV`, 'INFO');
      setAppState(loggedState);
    } catch (e: any) {
      alert("Import failed: " + e.message);
    }
  };

  const handleTransaction = (empId: string, amount: number, type: TransactionType, note: string) => {
    try {
      const newState = processTransaction(appState, empId, amount, type, note);
      // We don't log every transaction to system logs to avoid noise, but in real life we might.
      setAppState(newState);
    } catch (e: any) {
      // Log the error
      const errorState = logEvent(appState, `Transaction Failed: ${e.message}`, 'ERROR');
      setAppState(errorState);
      throw e; // Re-throw for UI to display
    }
  };

  const handleAddSystemUser = (newUser: SystemUser) => {
      // Check for duplicate
      if (appState.systemUsers.find(u => u.username === newUser.username)) {
          alert("User already exists!");
          return;
      }
      
      const updatedUsers = [...appState.systemUsers, newUser];
      const newState = logEvent(
          { ...appState, systemUsers: updatedUsers }, 
          `New System User Created: ${newUser.username} (${newUser.role})`, 
          'WARNING' // Warning level as this is a security event
      );
      setAppState(newState);
  };

  const handleReportIssue = (type: TicketType, title: string, desc: string, empId?: string) => {
    const newState = createTicket(appState, type, title, desc, empId);
    setAppState(newState);
  };

  const handleResolveTicket = (id: string) => {
    const newState = resolveTicket(appState, id);
    setAppState(newState);
  };

  // Rendering logic based on Roles
  if (!appState.currentUser) {
    return <LoginForm systemUsers={appState.systemUsers} onLogin={handleLogin} />;
  }

  if (appState.currentUser.role === UserRole.TECH) {
    return (
        <TechPanel 
            state={appState} 
            onLogout={handleLogout} 
            onAddUser={handleAddSystemUser}
            onResolveTicket={handleResolveTicket}
        />
    );
  }

  if (appState.currentUser.role === UserRole.ADMIN) {
    return (
      <AdminPanel 
        state={appState} 
        onImport={handleImport} 
        onTransaction={handleTransaction} 
        onLogout={handleLogout} 
        onReportIssue={handleReportIssue}
      />
    );
  }

  return <div>Unknown Role Error</div>;
};

export default App;
