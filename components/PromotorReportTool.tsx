
import React, { useState, useEffect } from 'react';
import { Printer, Download, Trash2, FileBarChart, Save, CheckCircle } from 'lucide-react';

const REPORT_STRUCTURE = [
  {
    category: "INQUÉRITOS (pasta do cargo na PJ eletrônica)",
    items: [
      "Denúncias",
      "Arquivamentos"
    ]
  },
  {
    category: "PROCESSOS (soma e-saj + SMA)",
    items: [
      "Acervo anterior",
      "Recebidos durante o período",
      "Alegações finais escritas",
      "Pareceres com cópia em arquivo",
      "Nº de feitos com suspensão condicional (art. 89 Lei 9099/95)",
      "Nº de feitos com suspensão do processo (art. 366 do CPP)",
      "Acervo de processos suspensos (art. 366 do CPP)",
      "Autos devolvidos sem manifestação de mérito",
      "Sobram na Promotoria no prazo",
      "Sobram na Promotoria com prazo legal excedido"
    ]
  },
  {
    category: "AUDIÊNCIAS",
    items: [
      "Audiências realizadas",
      "Alegações orais em audiência"
    ]
  },
  {
    category: "SENTENÇAS",
    items: [
      "Absolutórias / Extinção de Punibilidade",
      "Condenatórias",
      "Procedência parcial",
      "Número de réus absolvidos",
      "Número de réus condenados",
      "Que reconheceram a prescrição",
      "Número de réus beneficiados pela prescrição",
      "Que reconheceram decadência ou renúncia",
      "Número de réus beneficiados pela decadência ou renúncia"
    ]
  },
  {
    category: "RECURSOS (pasta eletrônica do cargo)",
    items: [
      "Apelações",
      "Outros (RESE)",
      "Contrarrazões"
    ]
  }
];

const STORAGE_KEY = 'cgmp_report_data_v2';

const PromotorReportTool: React.FC = () => {
  const [reportTitle, setReportTitle] = useState('RELATÓRIO DE ATIVIDADES - CGMP');
  const [headers, setHeaders] = useState([
    'C. 79 - Margareth Ferraz França',
    "C.71 - Leonardo D'Angelo Vargas Pereira",
    'C.71 - Nina Pereira Malheiros'
  ]);
  const [data, setData] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load Data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.title) setReportTitle(parsed.title);
        if (parsed.headers) setHeaders(parsed.headers);
        if (parsed.data) setData(parsed.data);
      } catch (e) {
        console.error("Failed to load report data");
      }
    }
  }, []);

  // Auto Save
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        title: reportTitle,
        headers,
        data
      }));
      setLastSaved(new Date());
    }, 1000);
    return () => clearTimeout(timer);
  }, [reportTitle, headers, data]);

  const handleInputChange = (rowKey: string, colIndex: number, value: string) => {
    setData(prev => ({
      ...prev,
      [`${rowKey}-col-${colIndex}`]: value
    }));
  };

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
  };

  const handleClear = () => {
    if (confirm("Tem certeza que deseja limpar todos os valores? Os cabeçalhos serão mantidos.")) {
      setData({});
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csv = [];
    // Header
    csv.push(`"ATIVIDADE","${headers[0]}","${headers[1]}","${headers[2]}"`);

    // Rows
    REPORT_STRUCTURE.forEach(section => {
      csv.push(`"${section.category}",,,`);
      section.items.forEach(item => {
        const rowKey = `${section.category}-${item}`; // Simplified key for logic
        const val1 = data[`${rowKey}-col-0`] || '';
        const val2 = data[`${rowKey}-col-1`] || '';
        const val3 = data[`${rowKey}-col-2`] || '';
        csv.push(`"${item}","${val1}","${val2}","${val3}"`);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_cgmp.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body, #root, main, .print-container {
            background-color: white !important;
            color: black !important;
            width: 100%;
            height: auto;
            overflow: visible;
          }
          .no-print { display: none !important; }
          input {
            border: none !important;
            background: transparent !important;
            color: black !important;
            padding: 0 !important;
            font-size: 12px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #999 !important; padding: 4px 8px !important; }
          th { background-color: #eee !important; font-weight: bold; }
          .category-row td { background-color: #ddd !important; font-weight: bold; text-transform: uppercase; font-size: 13px; }
          .print-title { font-size: 18px; text-align: center; margin-bottom: 20px; font-weight: bold; }
        }
      `}</style>

      {/* Sidebar Controls */}
      <div className="w-[300px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-2xl z-10 no-print">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg text-white"><FileBarChart size={20} /></div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-white">Relatório CGMP</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Produtividade Mensal</p>
          </div>
        </div>

        <div className="space-y-3">
          <button onClick={handlePrint} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 border border-slate-700 transition-all">
            <Printer size={16}/> Imprimir / PDF
          </button>
          <button onClick={handleExportCSV} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 border border-slate-700 transition-all">
            <Download size={16}/> Exportar CSV
          </button>
          <button onClick={handleClear} className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 border border-red-900/50 transition-all">
            <Trash2 size={16}/> Limpar Dados
          </button>
        </div>

        <div className="mt-auto p-4 bg-slate-950 rounded-xl border border-slate-800">
           <div className="flex items-center gap-2 text-emerald-500 mb-2">
              <CheckCircle size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Salvo Automaticamente</span>
           </div>
           {lastSaved && <p className="text-[10px] text-slate-500">Última sincronização: {lastSaved.toLocaleTimeString()}</p>}
        </div>
      </div>

      {/* Main Content (Table) */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-950 print-container">
        <div className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden print:shadow-none print:border-none">
           
           <div className="p-8 border-b border-slate-800 print:hidden">
              <input 
                value={reportTitle} 
                onChange={(e) => setReportTitle(e.target.value)} 
                className="text-2xl font-black text-center w-full bg-transparent outline-none text-blue-400 placeholder-slate-600 focus:underline"
              />
           </div>
           
           {/* Print Only Title */}
           <div className="hidden print:block print-title">{reportTitle}</div>

           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-950 text-slate-300 print:bg-gray-100 print:text-black">
                      <th className="p-4 border border-slate-800 min-w-[300px] font-bold text-xs uppercase tracking-widest">Atividades</th>
                      {headers.map((h, i) => (
                        <th key={i} className="p-2 border border-slate-800 min-w-[150px]">
                           <input 
                             value={h} 
                             onChange={(e) => handleHeaderChange(i, e.target.value)}
                             className="w-full bg-transparent text-center font-bold text-xs uppercase tracking-tight outline-none text-slate-200 print:text-black"
                           />
                        </th>
                      ))}
                   </tr>
                </thead>
                <tbody className="text-sm">
                   {REPORT_STRUCTURE.map((section, sIdx) => (
                      <React.Fragment key={sIdx}>
                         {/* Category Header */}
                         <tr className="bg-blue-900/20 category-row print:bg-gray-200">
                            <td colSpan={4} className="p-4 border border-slate-800 font-bold text-blue-300 uppercase text-xs tracking-widest print:text-black">
                               {section.category}
                            </td>
                         </tr>
                         {/* Items */}
                         {section.items.map((item, iIdx) => {
                            const rowKey = `${section.category}-${item}`;
                            return (
                               <tr key={iIdx} className="hover:bg-slate-800/50 transition-colors">
                                  <td className="p-3 border border-slate-800 text-slate-300 font-medium print:text-black">{item}</td>
                                  {[0, 1, 2].map(colIndex => (
                                     <td key={colIndex} className="p-0 border border-slate-800">
                                        <input 
                                          type="number"
                                          value={data[`${rowKey}-col-${colIndex}`] || ''}
                                          onChange={(e) => handleInputChange(rowKey, colIndex, e.target.value)}
                                          className="w-full h-full bg-transparent p-3 text-center text-slate-100 outline-none focus:bg-slate-800 print:text-black"
                                        />
                                     </td>
                                  ))}
                               </tr>
                            );
                         })}
                      </React.Fragment>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      </div>

    </div>
  );
};

export default PromotorReportTool;
