import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CaseData, PromotoriaDef } from '../types';
import { Search, Gavel, Calendar, UserRound, AlertCircle, X, RotateCcw, FilePlus2, CheckCircle } from 'lucide-react';
import { calculateUrgencyFromAudiencia } from '../utils/niRulesHelper';

interface CaseInfoBarProps {
  caseData: CaseData;
  setCaseData: React.Dispatch<React.SetStateAction<CaseData>>;
  promotorias: PromotoriaDef[];
  onReset?: () => void;
}

const CaseInfoBar: React.FC<CaseInfoBarProps> = ({ caseData, setCaseData, promotorias, onReset }) => {
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);
  const [hasReset, setHasReset] = useState(false);

  const handleResetClick = () => {
    if (onReset) {
      onReset();
      if (hiddenDateInputRef.current) {
        hiddenDateInputRef.current.value = '';
      }
      setHasReset(true);
      setTimeout(() => setHasReset(false), 2200);
    }
  };

  const getDayFromDateString = (dateStr: string): number => {
    if (!dateStr) return 0;
    const clean = dateStr.trim();
    if (clean.includes('/')) {
      const parts = clean.split('/');
      return Number(parts[0]) || 0;
    }
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts[0].length === 4) {
        return Number(parts[2]) || 0; // YYYY-MM-DD
      }
      return Number(parts[0]) || 0; // DD-MM-YYYY
    }
    if (clean.includes('.')) {
      const parts = clean.split('.');
      return Number(parts[0]) || 0;
    }
    const digits = clean.replace(/\D/g, '');
    if (digits.length >= 2) {
      return Number(digits.slice(0, 2)) || 0;
    }
    return 0;
  };

  const getPromotorForDate = useCallback((cargoLabel: string, dateString: string) => {
    if (cargoLabel?.includes('79')) {
      return 'Margareth Ferraz França';
    }
    if (cargoLabel?.includes('71')) {
      return "Leonardo D'Angelo Vargas Pereira";
    }

    const promotoria = promotorias.find(p => p.label === cargoLabel);
    if (!promotoria) return "";
    if (!dateString) return Array.from(new Set(promotoria.schedule.map(s => s.name))).join(" / ");
    
    const day = getDayFromDateString(dateString);
    if (day > 0 && day <= 31) {
      const entry = promotoria.schedule.find(s => day >= s.start && day <= s.end);
      return entry ? entry.name : "";
    }
    return Array.from(new Set(promotoria.schedule.map(s => s.name))).join(" / ");
  }, [promotorias]);

  // Auto-sync de Promotores de Cargos específicos (Margareth Ferraz França no Cargo 79; Leonardo Vargas no Cargo 71)
  useEffect(() => {
    if (caseData.cargo?.includes('79')) {
      if (caseData.promotor !== 'Margareth Ferraz França') {
        setCaseData(prev => ({
          ...prev,
          promotor: 'Margareth Ferraz França'
        }));
      }
    } else if (caseData.cargo?.includes('71')) {
      if (!caseData.promotor || caseData.promotor.includes('Margareth')) {
        setCaseData(prev => ({
          ...prev,
          promotor: "Leonardo D'Angelo Vargas Pereira"
        }));
      }
    }
  }, [caseData.cargo, caseData.promotor, setCaseData]);

  const parsePastedDate = (text: string): string => {
    if (!text) return '';
    const trimmed = text.trim();
    
    // Pattern: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const ddmmyyyyMatch = trimmed.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
    if (ddmmyyyyMatch) {
      const d = ddmmyyyyMatch[1].padStart(2, '0');
      const m = ddmmyyyyMatch[2].padStart(2, '0');
      let y = ddmmyyyyMatch[3];
      if (y.length === 2) y = '20' + y;
      return `${d}/${m}/${y}`;
    }

    // Pattern: YYYY-MM-DD (e.g. from calendar or ISO)
    const yyyymmddMatch = trimmed.match(/(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
    if (yyyymmddMatch) {
      const y = yyyymmddMatch[1];
      const m = yyyymmddMatch[2].padStart(2, '0');
      const d = yyyymmddMatch[3].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }

    // Numbers only
    const digits = trimmed.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.replace(/(\d{2})(\d+)/, '$1/$2');
    return digits.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
  };

  const handleDatePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    e.preventDefault();
    const formattedDate = parsePastedDate(text);
    const urgency = calculateUrgencyFromAudiencia(formattedDate);
    
    setCaseData(prev => {
      const targetCargo = prev.cargo;
      const newPromotor = getPromotorForDate(targetCargo, formattedDate);
      return {
        ...prev,
        dataAudiencia: formattedDate,
        urgente: urgency.urgente,
        promotor: newPromotor || prev.promotor
      };
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const digits = rawValue.replace(/\D/g, '').slice(0, 8);
    let formatted = '';
    if (digits.length <= 2) formatted = digits;
    else if (digits.length <= 4) formatted = digits.replace(/(\d{2})(\d+)/, '$1/$2');
    else formatted = digits.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3');

    const urgency = calculateUrgencyFromAudiencia(formatted);

    setCaseData(prev => {
      const targetCargo = prev.cargo;
      const newPromotor = getPromotorForDate(targetCargo, formatted);
      return {
        ...prev,
        dataAudiencia: formatted,
        urgente: formatted.length === 10 ? urgency.urgente : prev.urgente,
        promotor: newPromotor || prev.promotor
      };
    });
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (!val) return;
    const [y, m, d] = val.split('-');
    const formatted = `${d}/${m}/${y}`;
    const urgency = calculateUrgencyFromAudiencia(formatted);
    setCaseData(prev => {
      const newPromotor = getPromotorForDate(prev.cargo, formatted);
      return {
        ...prev,
        dataAudiencia: formatted,
        urgente: urgency.urgente,
        promotor: newPromotor || prev.promotor
      };
    });
  };

  const handleClearDate = () => {
    setCaseData(prev => ({
      ...prev,
      dataAudiencia: '',
      urgente: false,
      promotor: getPromotorForDate(prev.cargo, '')
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setCaseData(prev => {
      const newData = { ...prev, [name]: val };
      
      if (name === 'cargo') {
        newData.promotor = getPromotorForDate(value, prev.dataAudiencia);
      }
      return newData;
    });
  };

  const handleSearch = () => {
    if (!caseData.numeroProcesso) return;
    const url = `https://esaj.tjsp.jus.br/cpopg/search.do?cbPesquisa=NUMPROC&dadosConsulta.valorConsulta=${encodeURIComponent(caseData.numeroProcesso)}`;
    window.open(url, '_blank');
  };

  const inputContainer = "relative group flex-1 min-w-[200px]";
  const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-red-500 transition-colors pointer-events-none";
  const inputClass = "h-12 w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all shadow-lg text-slate-100 placeholder-slate-500";

  return (
    <div className="bg-slate-900 p-6 border-b border-slate-800 shadow-xl z-10">
      <div className="max-w-[1400px] mx-auto flex flex-wrap gap-4 items-center">
        {/* Processo */}
        <div className={inputContainer}>
          <Gavel size={18} className={iconClass} />
          <input 
            type="text" 
            name="numeroProcesso" 
            placeholder="Nº Processo (SAJ)" 
            value={caseData.numeroProcesso} 
            onChange={handleChange} 
            className={inputClass} 
          />
          <button 
            onClick={handleSearch} 
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-slate-700 transition-all" 
            title="Consultar no ESAJ"
          >
            <Search size={16} />
          </button>
        </div>

        {/* Cargo */}
        <div className={inputContainer}>
          <Calendar size={18} className={iconClass} />
          <select 
            name="cargo" 
            value={caseData.cargo} 
            onChange={handleChange} 
            className={`${inputClass} appearance-none cursor-pointer pr-10`}
          >
            <option value="" disabled>Selecione o Cargo...</option>
            {promotorias.map(p => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
        </div>

        {/* Data Audiência - Suporta colar diretamente qualquer formato e digitação direta */}
        <div className={inputContainer}>
          <Calendar size={18} className={iconClass} />
          <input 
            type="text" 
            name="dataAudiencia" 
            value={caseData.dataAudiencia} 
            onChange={handleDateChange}
            onPaste={handleDatePaste}
            placeholder="Data Audiência (DD/MM/AAAA)" 
            className={`${inputClass} pr-16 font-mono text-sm`}
            maxLength={10}
            title="Digite ou cole a data diretamente (ex: 19/10/2026)"
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {caseData.dataAudiencia && (
              <button
                type="button"
                onClick={handleClearDate}
                className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                title="Limpar data"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => hiddenDateInputRef.current?.showPicker ? hiddenDateInputRef.current.showPicker() : hiddenDateInputRef.current?.focus()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              title="Abrir calendário"
            >
              <Calendar size={15} />
            </button>
            <input 
              ref={hiddenDateInputRef}
              type="date" 
              className="sr-only"
              onChange={handlePickerChange}
              tabIndex={-1}
            />
          </div>
        </div>
        
        {/* Toggle Urgente / Prioridade */}
        {(() => {
          const urgencyInfo = caseData.dataAudiencia ? calculateUrgencyFromAudiencia(caseData.dataAudiencia) : null;
          return (
            <div className={`flex items-center gap-2 px-4 h-12 rounded-xl transition-all border ${
              caseData.urgente 
                ? 'bg-red-950/40 border-red-800 text-red-400' 
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}>
              <input 
                type="checkbox" 
                id="urgente" 
                name="urgente" 
                checked={caseData.urgente || false} 
                onChange={handleChange}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-600 focus:ring-offset-slate-900 cursor-pointer"
              />
              <label 
                htmlFor="urgente" 
                className="text-xs font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                title={urgencyInfo?.label || (caseData.urgente ? 'Urgente (≤ 30 dias para audiência ou réu preso)' : 'Prioridade Normal (> 30 dias para audiência)')}
              >
                {caseData.urgente 
                  ? (urgencyInfo && urgencyInfo.diffDays !== null && urgencyInfo.diffDays <= 30
                      ? (urgencyInfo.diffDays === 0 ? '🚨 Urgente (Hoje)' : `🚨 Urgente (${urgencyInfo.diffDays}d)`)
                      : '🚨 Urgente')
                  : (urgencyInfo && urgencyInfo.diffDays !== null && urgencyInfo.diffDays > 30
                      ? `Prioridade Normal (${urgencyInfo.diffDays}d)`
                      : 'Prioridade Normal')}
              </label>
            </div>
          );
        })()}

        {/* Promotor */}
        <div className={`${inputContainer} flex-[1.5]`}>
            <UserRound size={18} className={iconClass} />
            <input 
              type="text" 
              name="promotor" 
              placeholder="Promotor(a) de Justiça" 
              value={caseData.promotor} 
              onChange={handleChange} 
              className={inputClass} 
            />
        </div>

        {/* Botão Novo Processo */}
        {onReset && (
          <button
            type="button"
            onClick={handleResetClick}
            className={`h-12 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0 border ${
              hasReset
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-800 hover:bg-red-700 text-slate-300 hover:text-white border-slate-700 hover:border-red-600'
            }`}
            title="Limpar todos os campos e iniciar um novo processo"
          >
            {hasReset ? (
              <>
                <CheckCircle size={16} className="text-emerald-400" />
                <span>Campos Limpos!</span>
              </>
            ) : (
              <>
                <FilePlus2 size={16} className="text-red-400" />
                <span>Novo Processo</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CaseInfoBar;