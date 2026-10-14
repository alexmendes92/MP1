
import React, { useState, useMemo } from 'react';
import { PartyPopper, DollarSign, Users, Plus, Trash2, Wallet, CheckCircle, Circle, Receipt, TrendingDown, TrendingUp, Copy, Share2, Calendar, Cake } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  isExternal: boolean;
  paid: boolean;
  birthday: string; // Formato DD/MM
}

interface Expense {
  id: string;
  description: string;
  amount: number;
}

const INITIAL_PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Alex Santana Mendes', isExternal: false, paid: false, birthday: '10/03' },
  { id: '2', name: 'Amanda Fortunato Mendes', isExternal: false, paid: false, birthday: '09/09' },
  { id: '3', name: 'Augusto José Abmussi', isExternal: false, paid: false, birthday: '20/08' },
  { id: '4', name: 'Brendon Alves Luiz', isExternal: false, paid: false, birthday: '04/02' },
  { id: '5', name: 'Carolina Viana de Barros', isExternal: false, paid: false, birthday: '13/10' },
  { id: '6', name: 'Caroline de Almeida Freimann', isExternal: false, paid: false, birthday: '17/01' },
  { id: '7', name: 'Cristiane Fujita Francisco', isExternal: false, paid: false, birthday: '05/09' },
  { id: '8', name: 'Fabiane Sayuri Yoshinaga', isExternal: true, paid: false, birthday: '16/08' },
  { id: '9', name: 'Gustavo Castro Allegretti', isExternal: false, paid: false, birthday: '10/09' },
  { id: '10', name: 'Ingrid de Azevedo Cristino Nespoli', isExternal: true, paid: false, birthday: '28/01' },
  { id: '11', name: 'Lailla Cristina Oliveira de Carvalho', isExternal: false, paid: false, birthday: '30/03' },
  { id: '12', name: 'Nivaldo Maniscalco Junior', isExternal: false, paid: false, birthday: '17/07' },
  { id: '13', name: 'Yramaia Kikuchi', isExternal: false, paid: false, birthday: '24/12' },
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const PartyFinanceTool: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contributionAmount, setContributionAmount] = useState<number>(50);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  
  // Expense Form
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCost, setExpenseCost] = useState('');

  // Calculations
  const totalExpected = participants.length * contributionAmount;
  const totalCollected = participants.filter(p => p.paid).length * contributionAmount;
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalCollected - totalSpent;

  // Birthday Logic
  const birthdayPeople = useMemo(() => {
    return participants.filter(p => {
      const [day, month] = p.birthday.split('/').map(Number);
      return month === selectedMonth + 1;
    });
  }, [participants, selectedMonth]);

  // Actions
  const togglePayment = (id: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, paid: !p.paid } : p));
  };

  const addExpense = () => {
    if (!expenseDesc || !expenseCost) return;
    const cost = parseFloat(expenseCost.replace(',', '.'));
    if (isNaN(cost)) return;

    setExpenses(prev => [...prev, {
      id: crypto.randomUUID(),
      description: expenseDesc,
      amount: cost
    }]);
    setExpenseDesc('');
    setExpenseCost('');
  };

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const copyReport = () => {
    const monthName = MONTHS[selectedMonth];
    const paidList = participants.filter(p => p.paid).map(p => p.name).join('\n✅ ');
    const pendingList = participants.filter(p => !p.paid).map(p => p.name).join('\n❌ ');
    const expensesList = expenses.map(e => `• ${e.description}: R$ ${e.amount.toFixed(2)}`).join('\n');
    const bdayNames = birthdayPeople.map(p => `${p.name} (${p.birthday})`).join(', ');

    const report = `*🎉 Evento 4ª PJ - ${monthName} 🎉*
${bdayNames ? `\n🎂 *Aniversariantes:* ${bdayNames}\n` : ''}
*💰 Financeiro:*
Valor: R$ ${contributionAmount.toFixed(2)}
Arrecadado: R$ ${totalCollected.toFixed(2)}
Pendente: R$ ${(totalExpected - totalCollected).toFixed(2)}

*🛒 Despesas:*
${expensesList || 'Nenhuma.'}
-------------------
*Saldo:* R$ ${balance.toFixed(2)}

*📋 Pagamentos:*
✅ ${paidList || '-'}

❌ ${pendingList || 'Todos pagaram!'}
    `;

    navigator.clipboard.writeText(report);
    alert("Relatório copiado! Cole no WhatsApp.");
  };

  const inputClass = "bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all placeholder-slate-600 text-sm";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* Sidebar - Config & Expenses */}
      <div className="w-[380px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-2xl z-10 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-pink-600 rounded-lg text-white"><PartyPopper size={20} /></div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-white">Gestor de Eventos</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">4ª Promotoria de Justiça</p>
          </div>
        </div>

        {/* Config Mês */}
        <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
           <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-pink-500"/>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Mês de Referência</h3>
           </div>
           <select 
             value={selectedMonth} 
             onChange={(e) => setSelectedMonth(Number(e.target.value))}
             className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-pink-500 cursor-pointer"
           >
             {MONTHS.map((m, i) => (
               <option key={i} value={i}>{m}</option>
             ))}
           </select>
           
           {birthdayPeople.length > 0 ? (
             <div className="mt-2 p-3 bg-pink-900/10 border border-pink-500/20 rounded-xl">
               <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                 <Cake size={12}/> Aniversariantes
               </p>
               <div className="space-y-1">
                 {birthdayPeople.map(p => (
                   <p key={p.id} className="text-xs text-pink-200 font-bold">
                     {p.birthday.split('/')[0]} - {p.name}
                   </p>
                 ))}
               </div>
             </div>
           ) : (
             <div className="text-xs text-slate-600 italic text-center py-2">Sem aniversariantes neste mês.</div>
           )}
        </div>

        {/* Config Arrecadação */}
        <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
           <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-green-500"/>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Valor por Pessoa</h3>
           </div>
           <div>
              <input 
                type="number" 
                value={contributionAmount} 
                onChange={(e) => setContributionAmount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-2xl font-bold text-green-400 outline-none focus:border-green-500/50"
              />
           </div>
        </div>

        {/* Expenses List */}
        <div className="flex-1 flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Receipt size={16} className="text-red-500"/>
                 <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Despesas</h3>
              </div>
              <span className="text-xs font-mono text-red-400 font-bold">- R$ {totalSpent.toFixed(2)}</span>
           </div>

           <div className="space-y-2 flex-1 overflow-y-auto min-h-[150px]">
              {expenses.length === 0 ? (
                 <div className="text-center py-8 text-slate-600 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-xs">Nenhuma despesa lançada.</p>
                 </div>
              ) : (
                 expenses.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl group hover:border-red-900/30 transition-all">
                       <div>
                          <p className="text-sm font-bold text-slate-300">{exp.description}</p>
                       </div>
                       <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-red-400">R$ {exp.amount.toFixed(2)}</span>
                          <button onClick={() => removeExpense(exp.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                       </div>
                    </div>
                 ))
              )}
           </div>

           {/* Add Expense Form */}
           <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Adicionar Compra</p>
              <input 
                type="text" 
                placeholder="Descrição (Ex: Bolo)" 
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className={inputClass + " w-full"}
              />
              <div className="flex gap-2">
                 <input 
                    type="number" 
                    placeholder="Valor" 
                    value={expenseCost}
                    onChange={(e) => setExpenseCost(e.target.value)}
                    className={inputClass + " flex-1"}
                 />
                 <button onClick={addExpense} className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-red-900/20">
                    <Plus size={20} />
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content - Participants & Balance */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-950 flex flex-col">
         
         {/* Balance Cards */}
         <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
               <div className="flex items-center gap-2 mb-2 text-green-500">
                  <TrendingUp size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Arrecadado</span>
               </div>
               <p className="text-3xl font-black text-slate-100">R$ {totalCollected.toFixed(2)}</p>
               <p className="text-[10px] text-slate-500 mt-1">De R$ {totalExpected.toFixed(2)} previstos</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
               <div className="flex items-center gap-2 mb-2 text-red-500">
                  <TrendingDown size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Gasto</span>
               </div>
               <p className="text-3xl font-black text-slate-100">R$ {totalSpent.toFixed(2)}</p>
               <p className="text-[10px] text-slate-500 mt-1">{expenses.length} lançamentos</p>
            </div>

            <div className={`border p-6 rounded-2xl shadow-lg relative overflow-hidden transition-all ${balance >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-red-950/20 border-red-900/50'}`}>
               <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <DollarSign size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Saldo Final</span>
               </div>
               <p className={`text-3xl font-black ${balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {balance.toFixed(2)}</p>
               <p className="text-[10px] text-slate-500 mt-1">{balance >= 0 ? 'Em caixa' : 'Faltando'}</p>
            </div>
         </div>

         {/* Header Lista */}
         <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2 text-slate-400">
               <Users size={18} />
               <h3 className="font-bold uppercase tracking-widest text-xs">Participantes ({participants.length})</h3>
            </div>
            <button onClick={copyReport} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-green-900/20">
               <Share2 size={16} /> Relatório WhatsApp
            </button>
         </div>

         {/* Grid de Participantes */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map(p => {
               const [day, month] = p.birthday.split('/').map(Number);
               const isBirthdayMonth = month === selectedMonth + 1;

               return (
                  <div 
                     key={p.id} 
                     onClick={() => togglePayment(p.id)}
                     className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all group relative overflow-hidden ${p.paid ? 'bg-green-900/10 border-green-900/30 hover:bg-green-900/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700'} ${isBirthdayMonth ? 'ring-1 ring-pink-500/50' : ''}`}
                  >
                     {isBirthdayMonth && <div className="absolute top-0 right-0 bg-pink-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg z-10 shadow-sm">ANIVERSARIANTE</div>}
                     
                     <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                           <span className={`font-bold text-sm ${p.paid ? 'text-green-100' : 'text-slate-300'}`}>{p.name}</span>
                           {isBirthdayMonth && <Cake size={14} className="text-pink-400 animate-pulse"/>}
                        </div>
                        <div className="flex gap-2 mt-1">
                           {p.isExternal && (
                              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/30 w-fit px-2 py-0.5 rounded border border-indigo-900/30">Externo</span>
                           )}
                           <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{p.birthday}</span>
                        </div>
                     </div>
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${p.paid ? 'bg-green-500 text-slate-900 shadow-lg shadow-green-500/20' : 'bg-slate-800 text-slate-600 group-hover:bg-slate-700'}`}>
                        {p.paid ? <CheckCircle size={18} fill="currentColor" /> : <Circle size={18} />}
                     </div>
                  </div>
               );
            })}
         </div>

      </div>
    </div>
  );
};

export default PartyFinanceTool;
