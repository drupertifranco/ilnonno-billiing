
import React, { useState } from 'react';
import { AppState, SystemUser, UserRole, TicketType } from '../types';
import { Database, Server, Terminal, Download, FileText, UserPlus, Shield, MessageSquare, CheckCircle, Bug, User, Container } from 'lucide-react';

interface TechPanelProps {
  state: AppState;
  onLogout: () => void;
  onAddUser: (u: SystemUser) => void;
  onResolveTicket: (id: string) => void;
}

export const TechPanel: React.FC<TechPanelProps> = ({ state, onLogout, onAddUser, onResolveTicket }) => {
  const [showDocs, setShowDocs] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: UserRole.ADMIN });
  const [userMsg, setUserMsg] = useState('');

  const handleDownloadLogs = () => {
    const headers = "ID,Timestamp,Level,User,Message\n";
    const rows = state.logs.map(l => `${l.id},${l.timestamp},${l.level},${l.user},"${l.message}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `System_Logs_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      setUserMsg("Error: Missing fields.");
      return;
    }
    onAddUser(newUser);
    setNewUser({ username: '', password: '', role: UserRole.ADMIN });
    setUserMsg("User created successfully.");
    setTimeout(() => setUserMsg(''), 3000);
  };

  // Ticket Filtering
  const openTickets = state.tickets.filter(t => t.status === 'OPEN');
  const userReports = openTickets.filter(t => t.type === TicketType.USER_FLAG);
  const bugReports = openTickets.filter(t => t.type === TicketType.SYSTEM_BUG);

  return (
    <div className="min-h-screen bg-espresso text-crema/80 font-mono text-sm">
      <header className="bg-[#2A2020] border-b border-sage/20 p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 text-sage">
          <Terminal className="w-5 h-5" />
          <span className="font-bold tracking-widest">TECH_SUPPORT_CONSOLE_V1</span>
        </div>
        <div className="flex gap-4 items-center">
            <button onClick={() => setShowDocs(!showDocs)} className="text-sage hover:text-crema flex items-center gap-2 text-xs transition">
                <FileText className="w-4 h-4" /> {showDocs ? 'HIDE_DOCS' : 'VIEW_DOCS'}
            </button>
            <button onClick={onLogout} className="text-terracotta hover:text-white uppercase text-xs tracking-widest border border-terracotta/50 px-3 py-1 rounded hover:bg-terracotta/20 transition">
                [Logout]
            </button>
        </div>
      </header>

      {/* Documentation Modal Overlay */}
      {showDocs && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-espresso border border-sage/40 w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl rounded-lg">
                <div className="bg-[#2A2020] p-2 border-b border-sage/20 flex justify-between items-center">
                    <span className="text-sage font-bold">MANUAL_AND_DEPLOYMENT.TXT</span>
                    <button onClick={() => setShowDocs(false)} className="text-sage hover:text-white">X</button>
                </div>
                <div className="p-6 overflow-auto font-mono text-xs leading-relaxed text-crema/70 whitespace-pre-wrap">
{`CANTEEN AUTOMATION API & WORKFLOWS
==================================

GLOBAL OBJECT: window.CanteenAutomation
DESCRIPTION: The application exposes a JS API on the 'window' object.
You can use this to integrate with external workflow triggers (e.g., barcode scanner scripts, Tampermonkey, or browser console automation).

AVAILABLE METHODS:

1. importCSV(csvString: string)
   - Imports or Updates employees in bulk.
   - Example: window.CanteenAutomation.importCSV("ID,Name,Dept,Limit\\n101,Test,HR,500");

2. debit(externalId: string, amount: number, note: string)
   - Charges an employee instantly.
   - Example: window.CanteenAutomation.debit("101", 10.50, "Lunch API");

3. credit(externalId: string, amount: number, note: string)
   - Registers a payment.
   - Example: window.CanteenAutomation.credit("101", 50.00, "Cash Payment");

4. getEmployee(externalId: string)
   - Returns JSON object of employee.

USAGE SCENARIO:
- External script detects barcode scan -> Calls 'debit' API -> Transaction logged.

----------------------------------

OPERATING PROCEDURES (ADMIN/TECH):
1. LOGIN:
   - Admin: Manages credits, payments, and employees.
   - Tech: Views logs, manages users, and resolves reported tickets.

2. TICKET SYSTEM:
   - Admin can file "User Report" (for employee behavior) or "Bug Report".
   - Tech must mark them as RESOLVED in the dashboard to clear the queue.

----------------------------------

INFRASTRUCTURE & DEPLOYMENT (DOCKER)
====================================

This application can be deployed as a containerized static asset.

[STANDARD DOCKERFILE]
Create a file named 'Dockerfile' in the root directory:

# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


[BUILD & RUN COMMANDS]

1. Build Image:
   $ docker build -t canteen-manager:latest .

2. Run Container:
   $ docker run -d -p 8080:80 --name canteen-app canteen-manager:latest

3. Verification:
   Open http://localhost:8080 in your browser.
`}
                </div>
            </div>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        
        {/* System Status */}
        <div className="bg-[#2A2020] border border-sage/20 rounded p-4 shadow-lg">
          <h2 className="text-crema font-bold mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-sage" /> System Status
          </h2>
          <div className="space-y-2 text-xs text-crema/60">
            <div className="flex justify-between border-b border-sage/10 pb-2">
              <span>DB_CONNECTION</span>
              <span className="text-sage">ACTIVE (LocalStorage)</span>
            </div>
            <div className="flex justify-between border-b border-sage/10 pb-2">
              <span>AUTOMATION_API</span>
              <span className="text-sage">ONLINE (window.CanteenAutomation)</span>
            </div>
             <div className="flex justify-between border-b border-sage/10 pb-2">
              <span>DEPLOYMENT_MODE</span>
              <span className="text-terracotta flex items-center gap-1"><Container className="w-3 h-3"/> WEB/CONTAINER</span>
            </div>
            <div className="flex justify-between border-b border-sage/10 pb-2">
              <span>TOTAL_EMPLOYEES</span>
              <span>{state.employees.length}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span>TOTAL_TRANSACTIONS</span>
              <span>{state.transactions.length}</span>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-[#2A2020] border border-sage/20 rounded p-4 shadow-lg">
           <h2 className="text-crema font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-terracotta" /> User Manager
           </h2>
           
           {/* List existing */}
           <div className="mb-4 text-xs max-h-24 overflow-y-auto bg-espresso p-2 rounded border border-sage/10">
             {state.systemUsers.map(u => (
                 <div key={u.username} className="flex justify-between mb-1">
                     <span className="text-crema">{u.username}</span>
                     <span className="text-sage">[{u.role}]</span>
                 </div>
             ))}
           </div>

           {/* Add Form */}
           <form onSubmit={handleCreateUser} className="space-y-2">
               <input 
                 type="text" 
                 placeholder="New Username" 
                 value={newUser.username}
                 onChange={e => setNewUser({...newUser, username: e.target.value})}
                 className="w-full bg-espresso border border-sage/30 rounded px-2 py-1 text-xs focus:border-terracotta outline-none text-crema"
               />
               <input 
                 type="password" 
                 placeholder="Password" 
                 value={newUser.password}
                 onChange={e => setNewUser({...newUser, password: e.target.value})}
                 className="w-full bg-espresso border border-sage/30 rounded px-2 py-1 text-xs focus:border-terracotta outline-none text-crema"
               />
               <select 
                 value={newUser.role}
                 onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                 className="w-full bg-espresso border border-sage/30 rounded px-2 py-1 text-xs focus:border-terracotta outline-none text-crema"
               >
                   <option value={UserRole.ADMIN}>ADMIN</option>
                   <option value={UserRole.TECH}>TECH</option>
               </select>
               <button type="submit" className="w-full bg-terracotta hover:bg-terracotta-dark text-white text-xs py-1.5 rounded transition uppercase tracking-widest">
                   CREATE USER
               </button>
               {userMsg && <div className="text-sage text-[10px] text-center">{userMsg}</div>}
           </form>
        </div>

        {/* Database Dump Preview */}
        <div className="bg-[#2A2020] border border-sage/20 rounded p-4 flex flex-col h-full shadow-lg">
          <h2 className="text-crema font-bold mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-sage" /> Data Integrity Check
          </h2>
          <div className="flex-1 bg-black/40 p-4 rounded overflow-auto text-xs text-sage font-mono border border-sage/10">
            <pre>{JSON.stringify({ 
              meta: { 
                version: "1.1.0", 
                timestamp: new Date().toISOString() 
              },
              tickets_queue: state.tickets.length,
              active_users: state.systemUsers.length
            }, null, 2)}</pre>
          </div>
        </div>

        {/* TICKET MANAGEMENT SECTION */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-[#2A2020] border border-sage/20 rounded p-4 shadow-lg">
           <h2 className="text-crema font-bold mb-4 flex items-center gap-2">
               <MessageSquare className="w-4 h-4 text-terracotta" /> Incident & Ticket Management
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* User Reports */}
               <div className="bg-espresso/50 p-3 rounded border border-sage/10">
                   <h3 className="text-xs font-bold text-crema mb-2 flex items-center gap-2 border-b border-sage/10 pb-1">
                       <User className="w-3 h-3 text-terracotta" /> USER REPORTS ({userReports.length})
                   </h3>
                   <div className="h-40 overflow-y-auto space-y-2 pr-1">
                       {userReports.length === 0 && <p className="text-sage/50 text-[10px] italic">No open reports.</p>}
                       {userReports.map(ticket => (
                           <div key={ticket.id} className="bg-[#2A2020] p-2 rounded border-l-2 border-terracotta flex justify-between items-start">
                               <div>
                                   <div className="text-white text-xs font-bold">{ticket.title}</div>
                                   <div className="text-crema/60 text-[10px]">{ticket.description}</div>
                                   <div className="text-sage/60 text-[9px] mt-1">Rep: {ticket.createdBy} | EmpID: {ticket.relatedEmployeeId || 'N/A'}</div>
                               </div>
                               <button onClick={() => onResolveTicket(ticket.id)} className="text-sage hover:text-white" title="Resolve">
                                   <CheckCircle className="w-4 h-4" />
                               </button>
                           </div>
                       ))}
                   </div>
               </div>

               {/* Bug Reports */}
               <div className="bg-espresso/50 p-3 rounded border border-sage/10">
                   <h3 className="text-xs font-bold text-crema mb-2 flex items-center gap-2 border-b border-sage/10 pb-1">
                       <Bug className="w-3 h-3 text-terracotta" /> SYSTEM BUGS ({bugReports.length})
                   </h3>
                   <div className="h-40 overflow-y-auto space-y-2 pr-1">
                       {bugReports.length === 0 && <p className="text-sage/50 text-[10px] italic">No open bugs.</p>}
                       {bugReports.map(ticket => (
                           <div key={ticket.id} className="bg-[#2A2020] p-2 rounded border-l-2 border-red-500 flex justify-between items-start">
                               <div>
                                   <div className="text-white text-xs font-bold">{ticket.title}</div>
                                   <div className="text-crema/60 text-[10px]">{ticket.description}</div>
                                   <div className="text-sage/60 text-[9px] mt-1">Rep: {ticket.createdBy}</div>
                               </div>
                               <button onClick={() => onResolveTicket(ticket.id)} className="text-sage hover:text-white" title="Resolve">
                                   <CheckCircle className="w-4 h-4" />
                               </button>
                           </div>
                       ))}
                   </div>
               </div>
           </div>
        </div>

        {/* Logs */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-[#2A2020] border border-sage/20 rounded p-4 shadow-lg">
           <div className="flex justify-between items-center mb-4">
               <h2 className="text-crema font-bold flex items-center gap-2">
                   <Shield className="w-4 h-4 text-sage" /> System Logs (Read-Only)
               </h2>
               <button 
                onClick={handleDownloadLogs}
                className="flex items-center gap-2 text-xs bg-sage/20 hover:bg-sage/40 px-3 py-1 rounded transition text-sage border border-sage/30"
               >
                   <Download className="w-3 h-3" /> EXPORT CSV
               </button>
           </div>
           <div className="bg-black/50 p-4 rounded h-40 overflow-y-auto font-mono text-xs border border-sage/10">
              {state.logs.length === 0 && <span className="text-sage/50">No logs generated yet...</span>}
              {state.logs.map(log => (
                <div key={log.id} className="mb-1 border-b border-white/5 pb-1">
                  <span className="text-sage/60">[{log.timestamp}]</span>
                  <span className={`mx-2 font-bold ${log.level === 'ERROR' ? 'text-terracotta' : log.level === 'WARNING' ? 'text-yellow-500' : 'text-blue-400'}`}>
                    {log.level}
                  </span>
                  <span className="text-crema/50">@{log.user}:</span>
                  <span className="text-crema ml-2">{log.message}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
