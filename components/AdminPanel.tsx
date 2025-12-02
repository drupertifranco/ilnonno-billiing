import React, { useState, useMemo } from 'react';
import { Employee, TransactionType, AppState, TicketType } from '../types';
import { MOCK_CSV_DATA } from '../constants';
import { Search, Upload, PlusCircle, DollarSign, AlertCircle, History, User, Calendar, FileText, Download, Briefcase, Sparkles, AlertTriangle, Bug } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { ChatBot } from './ChatBot';

interface AdminPanelProps {
  state: AppState;
  onImport: (csv: string) => void;
  onTransaction: (empId: string, amount: number, type: TransactionType, note: string) => void;
  onLogout: () => void;
  onReportIssue: (type: TicketType, title: string, desc: string, empId?: string) => void;
}

const MokaIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 19h20" />
      <path d="M4 19v-9l2-3h12l2 3v9" />
      <path d="M6 10h12" />
      <path d="M10 2v5" />
      <path d="M14 2v5" />
      <path d="M8 2h8" />
      <path d="M18 13h3a2 2 0 0 1 2 2v2" />
    </svg>
  );

export const AdminPanel: React.FC<AdminPanelProps> = ({ state, onImport, onTransaction, onLogout, onReportIssue }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.DEBIT);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  
  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<TicketType>(TicketType.USER_FLAG);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  // Optimized Search
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return state.employees;
    const lower = searchTerm.toLowerCase();
    return state.employees.filter(e => 
      e.name.toLowerCase().includes(lower) || 
      e.externalId.includes(lower) ||
      e.department.toLowerCase().includes(lower)
    );
  }, [state.employees, searchTerm]);

  // Chart Data
  const chartData = useMemo(() => {
    const deptTotals: {[key: string]: number} = {};
    state.employees.forEach(e => {
      deptTotals[e.department] = (deptTotals[e.department] || 0) + e.currentBalance;
    });
    return Object.keys(deptTotals).map(dept => ({
      name: dept,
      debt: deptTotals[dept]
    }));
  }, [state.employees]);

  // Employee History
  const employeeHistory = useMemo(() => {
    if (!selectedEmployee) return [];
    return state.transactions
      .filter(t => t.employeeId === selectedEmployee.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [state.transactions, selectedEmployee]);

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setError('');
    
    try {
      onTransaction(selectedEmployee.id, parseFloat(amount), transactionType, note);
      setAmount('');
      setNote('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitReport = (e: React.FormEvent) => {
      e.preventDefault();
      onReportIssue(reportType, reportTitle, reportDesc, selectedEmployee?.id);
      setIsReportModalOpen(false);
      setReportTitle('');
      setReportDesc('');
      alert("Report submitted to Tech Support.");
  };

  const handleAnalyze = async () => {
    if (!process.env.API_KEY) {
      setAnalysis("API Key not found in environment.");
      return;
    }

    setIsThinking(true);
    setAnalysis(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const summaryData = state.employees.map(e => ({
        name: e.name,
        dept: e.department,
        bal: e.currentBalance,
        lim: e.creditLimit,
        utilization: ((e.currentBalance / e.creditLimit) * 100).toFixed(1) + '%'
      }));
      const recentTransactions = state.transactions.slice(0, 50).map(t => ({
        date: t.timestamp,
        type: t.type,
        amt: t.amount,
        user: t.performedBy
      }));

      const prompt = `
        Perform a comprehensive Balance Analysis Report for this Canteen system.
        EMPLOYEE DATA (Snapshot): ${JSON.stringify(summaryData.slice(0, 100))}
        RECENT TRANSACTIONS (Last 50): ${JSON.stringify(recentTransactions)}
        TASKS: 1. Executive Summary 2. High Risk Identification 3. Transaction Patterns 4. Recommendations
        Format as a clean, professional report with bold headers.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      setAnalysis(response.text);
    } catch (e: any) {
      setAnalysis(`Error generating analysis: ${e.message}`);
    } finally {
      setIsThinking(false);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportGeneralReport = () => {
    const headers = "ID,Name,Department,Credit Limit,Current Balance,Status\n";
    const rows = state.employees.map(e => {
      const status = e.currentBalance > e.creditLimit ? "OVER LIMIT" : "OK";
      return `${e.externalId},"${e.name}",${e.department},${e.creditLimit},${e.currentBalance},${status}`;
    }).join("\n");
    downloadCSV(headers + rows, `Canteen_General_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportUserHistory = () => {
    if (!selectedEmployee) return;
    const headers = "Date,Transaction Type,Amount,Performed By,Note\n";
    const rows = employeeHistory.map(t => {
      return `${new Date(t.timestamp).toLocaleString()},${t.type},${t.amount},${t.performedBy},"${t.note || ''}"`;
    }).join("\n");
    downloadCSV(headers + rows, `Statement_${selectedEmployee.name}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="min-h-screen bg-crema flex flex-col font-sans text-espresso">
      {/* Header - Espresso Profundo */}
      <header className="bg-espresso text-crema shadow-xl sticky top-0 z-50 border-b-4 border-terracotta">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="bg-crema p-2 rounded-full shadow-lg">
                <MokaIcon className="w-6 h-6 text-espresso" />
             </div>
             <div>
                <h1 className="text-2xl font-serif font-bold tracking-wide">IlNonno</h1>
                <p className="text-xs text-sage font-medium tracking-widest uppercase">Admin Console</p>
             </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
             <button 
                onClick={() => setIsReportModalOpen(true)}
                className="hidden sm:flex items-center gap-2 bg-terracotta/20 text-terracotta hover:bg-terracotta/40 border border-terracotta/50 px-3 py-1.5 rounded-md text-sm transition"
             >
                 <AlertTriangle className="w-4 h-4" /> Report Issue
             </button>
             <div className="text-right hidden sm:block">
                 <span className="block text-xs text-sage">Operador</span>
                 <span className="text-sm font-semibold text-crema">{state.currentUser?.username}</span>
             </div>
             <button onClick={onLogout} className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-md text-sm transition text-crema">Logout</button>
          </div>
        </div>
      </header>

      {/* Report Modal */}
      {isReportModalOpen && (
          <div className="fixed inset-0 z-[60] bg-espresso/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-crema rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-espresso/20">
                  <div className="bg-espresso p-4 flex justify-between items-center text-crema">
                      <h3 className="font-bold flex items-center gap-2 font-serif">
                          <AlertTriangle className="w-5 h-5 text-terracotta" /> Submit Ticket
                      </h3>
                      <button onClick={() => setIsReportModalOpen(false)} className="hover:text-terracotta">✕</button>
                  </div>
                  <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
                      <div className="flex gap-4">
                          <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition ${reportType === TicketType.USER_FLAG ? 'bg-terracotta/10 border-terracotta ring-1 ring-terracotta' : 'bg-white border-sage/30'}`}>
                              <input type="radio" name="rtype" className="hidden" onClick={() => setReportType(TicketType.USER_FLAG)} />
                              <div className="flex flex-col items-center gap-2 text-center">
                                  <User className="w-6 h-6 text-terracotta" />
                                  <span className="font-bold text-sm text-espresso">Report Employee</span>
                              </div>
                          </label>
                          <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition ${reportType === TicketType.SYSTEM_BUG ? 'bg-espresso/10 border-espresso ring-1 ring-espresso' : 'bg-white border-sage/30'}`}>
                              <input type="radio" name="rtype" className="hidden" onClick={() => setReportType(TicketType.SYSTEM_BUG)} />
                              <div className="flex flex-col items-center gap-2 text-center">
                                  <Bug className="w-6 h-6 text-espresso" />
                                  <span className="font-bold text-sm text-espresso">Report Bug</span>
                              </div>
                          </label>
                      </div>
                      
                      {reportType === TicketType.USER_FLAG && selectedEmployee && (
                           <div className="text-xs text-terracotta bg-terracotta/10 p-2 rounded border border-terracotta/20">
                               Reporting: {selectedEmployee.name} ({selectedEmployee.externalId})
                           </div>
                      )}

                      <div>
                          <label className="block text-sm font-bold text-espresso mb-1">Subject</label>
                          <input 
                            required 
                            className="w-full border border-sage/30 bg-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-terracotta outline-none" 
                            placeholder="Brief subject..."
                            value={reportTitle}
                            onChange={(e) => setReportTitle(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-espresso mb-1">Description</label>
                          <textarea 
                            required 
                            className="w-full border border-sage/30 bg-white rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-terracotta outline-none resize-none" 
                            placeholder="Provide details..."
                            value={reportDesc}
                            onChange={(e) => setReportDesc(e.target.value)}
                          />
                      </div>
                      <div className="flex justify-end pt-2">
                          <button type="submit" className="bg-terracotta text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-terracotta-dark shadow-md">Submit Ticket</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* Left Col: Operations & List (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Quick Stats & Import */}
          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl shadow-sm border border-sage/20 flex flex-wrap gap-4 justify-between items-center">
            <div>
              <h2 className="text-lg font-serif font-bold text-espresso">Operations</h2>
              <p className="text-sm text-sage">Daily management & reports</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={handleAnalyze}
                disabled={isThinking}
                className="flex items-center gap-2 bg-espresso text-crema shadow-md border border-transparent px-3 py-2 rounded-lg hover:bg-espresso/90 transition text-sm font-medium disabled:opacity-70"
              >
                {isThinking ? (
                  <>Thinking...</>
                ) : (
                  <><Sparkles className="w-4 h-4 text-terracotta" /> AI Analysis</>
                )}
              </button>
              <button 
                onClick={handleExportGeneralReport}
                className="flex items-center gap-2 bg-sage text-white border border-transparent px-3 py-2 rounded-lg hover:bg-sage-dark transition text-sm font-medium"
              >
                <FileText className="w-4 h-4" /> Export All
              </button>
              <button 
                onClick={() => onImport(MOCK_CSV_DATA)}
                className="flex items-center gap-2 bg-crema text-espresso border border-sage/30 px-3 py-2 rounded-lg hover:bg-white transition text-sm font-medium"
              >
                <Upload className="w-4 h-4" /> Import CSV
              </button>
            </div>
          </div>

           {/* AI Analysis Result */}
           {analysis && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-terracotta/30 text-espresso text-sm whitespace-pre-wrap animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-espresso via-terracotta to-sage"></div>
              <h3 className="font-bold mb-4 text-terracotta flex items-center gap-2 text-lg font-serif">
                  <Sparkles className="w-5 h-5" />
                  Gemini Balance Analysis
              </h3>
              <div className="prose prose-sm max-w-none text-espresso/80 font-serif">
                {analysis}
              </div>
            </div>
          )}

          {/* Search & List */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/20 overflow-hidden flex flex-col h-[650px]">
            <div className="p-4 border-b border-sage/10 bg-crema/30 backdrop-blur">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-sage" />
                <input 
                  type="text" 
                  placeholder="Scan Badge ID or Type Name..." 
                  className="w-full pl-10 pr-4 py-2.5 border border-sage/30 rounded-lg focus:ring-2 focus:ring-terracotta focus:border-terracotta focus:outline-none transition shadow-sm bg-white"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-0">
              {filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-sage">
                  <p>No employees found.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase bg-espresso/5 text-espresso/60 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-5 py-3 font-semibold">ID</th>
                      <th className="px-5 py-3 font-semibold">Employee</th>
                      <th className="px-5 py-3 font-semibold text-right">Balance</th>
                      <th className="px-5 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/10">
                    {filteredEmployees.map(emp => {
                       const isOverLimit = emp.currentBalance > emp.creditLimit;
                       let rowClass = "hover:bg-crema transition cursor-pointer group";
                       if (selectedEmployee?.id === emp.id) rowClass = "bg-espresso/10";
                       else if (isOverLimit) rowClass += " bg-terracotta/5 hover:bg-terracotta/10";

                       return (
                        <tr key={emp.id} onClick={() => setSelectedEmployee(emp)} className={rowClass}>
                          <td className="px-5 py-3 font-mono text-sage group-hover:text-espresso">{emp.externalId}</td>
                          <td className="px-5 py-3">
                              <div className="font-medium text-espresso">{emp.name}</div>
                              <div className="text-xs text-sage">{emp.department}</div>
                          </td>
                          <td className="px-5 py-3 text-right">
                              <div className={`font-mono font-bold ${isOverLimit ? 'text-terracotta' : 'text-espresso'}`}>
                                ${emp.currentBalance.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-sage">of ${emp.creditLimit}</div>
                          </td>
                          <td className="px-5 py-3">
                            <button 
                              className={`text-xs font-bold px-3 py-1.5 rounded-full transition uppercase tracking-wider ${selectedEmployee?.id === emp.id ? 'bg-espresso text-crema shadow-md' : 'text-espresso bg-crema border border-sage/30 hover:bg-sage/20'}`}
                            >
                              {selectedEmployee?.id === emp.id ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Action & Stats (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {selectedEmployee ? (
            <div className="sticky top-24 space-y-6 animate-in slide-in-from-right-4 duration-500">
              
              {/* ID Card Style Profile */}
              <div className="relative bg-white rounded-2xl shadow-xl border border-sage/20 overflow-hidden transform transition hover:scale-[1.01]">
                {/* ID Header */}
                <div className="h-32 bg-espresso relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/leather.png')]"></div>
                    <div className="absolute top-4 right-4 text-crema/60 font-mono text-xs tracking-widest border border-crema/20 px-2 py-0.5 rounded">
                        ID: {selectedEmployee.externalId}
                    </div>
                    <div className="absolute bottom-4 left-6">
                        <h2 className="text-2xl font-serif font-bold text-crema">{selectedEmployee.name}</h2>
                        <span className="text-terracotta text-xs font-bold uppercase tracking-widest bg-crema/10 px-2 py-0.5 rounded backdrop-blur-sm">
                            {selectedEmployee.department}
                        </span>
                    </div>
                </div>
                
                <div className="px-6 py-6 relative bg-white">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                           <p className="text-xs text-sage font-bold uppercase">Membership Status</p>
                           <p className="text-sm font-medium text-espresso flex items-center gap-1">
                               <span className="w-2 h-2 rounded-full bg-sage"></span> Active
                           </p>
                        </div>
                        <button 
                            onClick={handleExportUserHistory}
                            className="text-sage hover:text-espresso transition p-2 rounded-full hover:bg-crema border border-sage/20" 
                            title="Download Statement"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Balance Bar */}
                    <div className="p-4 bg-crema rounded-xl border border-sage/10 shadow-inner">
                        <div className="flex justify-between items-end mb-2">
                             <div>
                                <div className="text-xs text-sage uppercase font-bold tracking-wider">Current Balance</div>
                                <div className={`text-3xl font-serif font-bold ${selectedEmployee.currentBalance > selectedEmployee.creditLimit ? 'text-terracotta' : 'text-espresso'}`}>
                                    ${selectedEmployee.currentBalance.toFixed(2)}
                                </div>
                             </div>
                             <div className="text-right">
                                <div className="text-xs text-sage uppercase">Credit Limit</div>
                                <div className="font-mono text-espresso font-bold">${selectedEmployee.creditLimit.toFixed(2)}</div>
                             </div>
                        </div>
                        <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-sage/20">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${selectedEmployee.currentBalance > selectedEmployee.creditLimit ? 'bg-terracotta' : 'bg-sage'}`}
                                style={{ width: `${Math.min((selectedEmployee.currentBalance / selectedEmployee.creditLimit) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
              </div>

              {/* Transaction Form */}
              <div className="bg-white rounded-xl shadow-lg border border-sage/20 overflow-hidden">
                <div className="bg-crema px-6 py-3 border-b border-sage/10 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-espresso" /> 
                    <h3 className="text-sm font-bold text-espresso uppercase tracking-wider">New Transaction</h3>
                </div>
                
                <div className="p-6">
                  <form onSubmit={handleTransactionSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTransactionType(TransactionType.DEBIT)}
                          className={`flex items-center justify-center py-3 text-sm font-bold rounded-lg border transition uppercase tracking-wider ${transactionType === TransactionType.DEBIT ? 'bg-terracotta text-white border-terracotta shadow-md' : 'bg-white text-sage border-sage/30 hover:bg-crema'}`}
                        >
                          Charge
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransactionType(TransactionType.CREDIT)}
                          className={`flex items-center justify-center py-3 text-sm font-bold rounded-lg border transition uppercase tracking-wider ${transactionType === TransactionType.CREDIT ? 'bg-sage text-white border-sage shadow-md' : 'bg-white text-sage border-sage/30 hover:bg-crema'}`}
                        >
                          Payment
                        </button>
                    </div>

                    <div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage font-bold">$</span>
                        <input 
                            type="number" 
                            step="0.01"
                            required
                            min="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-3 border border-sage/30 rounded-lg focus:ring-2 focus:ring-espresso focus:border-espresso text-lg font-serif font-bold placeholder-sage/40 text-espresso"
                            placeholder="0.00"
                            autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <input 
                        type="text" 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Note (e.g. Panini + Coffee)"
                        className="w-full px-4 py-2.5 border border-sage/30 rounded-lg focus:ring-2 focus:ring-espresso focus:border-espresso text-sm placeholder-sage/40"
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-terracotta text-xs bg-terracotta/10 p-3 rounded-lg border border-terracotta/20">
                        <AlertCircle className="w-4 h-4" /> {error}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => { setSelectedEmployee(null); setError(''); }}
                        className="flex-1 py-3 border border-sage/30 rounded-lg text-sage hover:bg-crema text-sm font-bold transition uppercase"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 py-3 bg-espresso text-white rounded-lg hover:bg-gray-800 font-bold shadow-lg shadow-espresso/30 text-sm transition uppercase tracking-widest"
                      >
                        Confirm
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* History List */}
              <div className="bg-white rounded-xl shadow-sm border border-sage/20 flex flex-col max-h-[300px]">
                  <div className="p-4 border-b border-sage/10 bg-crema flex items-center justify-between">
                     <div className="font-bold text-espresso flex items-center gap-2 text-sm uppercase tracking-wide">
                        <History className="w-4 h-4" /> Recent Activity
                     </div>
                     <span className="text-[10px] bg-sage/20 px-2 py-0.5 rounded-full text-sage font-bold">{employeeHistory.length}</span>
                  </div>
                  <div className="overflow-y-auto p-0 flex-1">
                      {employeeHistory.length === 0 ? (
                          <div className="p-8 text-center text-sage text-sm italic">No recent transactions.</div>
                      ) : (
                          <ul className="divide-y divide-sage/10">
                              {employeeHistory.map(tx => (
                                  <li key={tx.id} className="p-4 hover:bg-crema transition group">
                                      <div className="flex justify-between items-start mb-1">
                                          <p className="text-espresso text-sm font-medium">{tx.note || 'Transaction'}</p>
                                          <p className={`font-mono font-bold text-sm ${tx.type === TransactionType.DEBIT ? 'text-terracotta' : 'text-sage-dark'}`}>
                                              {tx.type === TransactionType.DEBIT ? '-' : '+'}${tx.amount.toFixed(2)}
                                          </p>
                                      </div>
                                      <div className="flex justify-between items-center text-[10px] text-sage">
                                           <span className="flex items-center gap-1">
                                               <Calendar className="w-3 h-3" />
                                               {new Date(tx.timestamp).toLocaleDateString()}
                                           </span>
                                           <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                                      </div>
                                  </li>
                              ))}
                          </ul>
                      )}
                  </div>
              </div>
            </div>
          ) : (
            <>
                {/* Empty State */}
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-sage/20 text-center sticky top-24">
                    <div className="w-20 h-20 bg-crema text-espresso rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-espresso/10">
                        <User className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-espresso mb-2">Select an Employee</h3>
                    <p className="text-sage text-sm mb-6 px-4 leading-relaxed">
                        Choose a record from the list to view their digital card and process transactions.
                    </p>
                    <div className="w-full h-px bg-sage/20 mb-6"></div>
                    
                    <h3 className="text-xs font-bold text-espresso uppercase tracking-widest mb-6">Global Debt Overview</h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#78866B'}} />
                                <Tooltip cursor={{fill: '#F5F5DC'}} contentStyle={{backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #78866B', color: '#3B2F2F'}} />
                                <Bar dataKey="debt" fill="#3B2F2F" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </>
          )}

        </div>
      </main>

      {/* Floating Chat Bot */}
      <ChatBot 
        employees={state.employees} 
        transactions={state.transactions} 
        currentUser={state.currentUser?.username || 'Admin'} 
      />
    </div>
  );
};