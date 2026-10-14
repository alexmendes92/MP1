
import React, { useState, useMemo } from 'react';
import { Database, User, Briefcase, Plus, Pencil, Trash2, X, Search, Check, Save, Filter, LayoutList, Shield, Table as TableIcon, FileText, Archive, FileCode, Zap, BrainCircuit, Wallet, ChevronDown, ChevronRight, Gavel, Users } from 'lucide-react';

// --- Types ---
type TableName = 
  | 'users' | 'promotorias' | 'promotor_schedules' | 'analysts'
  | 'archived_processes' | 'process_parties' 
  | 'oficios_history' | 'sisdigital_terms' | 'anpp_requests' | 'general_intimations'
  | 'user_gamification' | 'user_tasks' | 'activities' | 'hearing_scales'
  | 'ai_consultations' | 'extraction_logs' 
  | 'finance_events' | 'finance_participants' | 'finance_expenses';

interface DBRecord {
  id?: string;
  [key: string]: any;
}

// --- Mock Initial Data (Updated with JSON) ---
const MOCK_DATA: Record<TableName, DBRecord[]> = {
  // 1. Core
  users: [
    { id: '1', full_name: 'Alex Santana Mendes', email: 'alex@mpsp.mp.br', role: 'admin', created_at: '2023-01-01' },
    { id: '2', full_name: 'Maria Silva', email: 'maria@mpsp.mp.br', role: 'user', created_at: '2023-05-12' },
  ],
  promotorias: [
    { id: '61', label: '61º Promotor de Justiça', titular: 'Tatiana Barreto Serra', vara: '16ª', sala: '38-3' },
    { id: '62', label: '62º Promotor de Justiça', titular: 'Fabiana Dal Mas Rocha Paes', vara: '17ª', sala: '76-4' },
    { id: '63', label: '63º Promotor de Justiça', titular: 'Michaela Carli Gomes', vara: '20ª', sala: '75-4' },
    { id: '64', label: '64º Promotor de Justiça', titular: 'Tânia Serra Azul Guimaraes Biazolli', vara: '19ª', sala: '74-4' },
    { id: '65', label: '65º Promotor de Justiça', titular: 'Paulo Henrique Castex', vara: '20ª', sala: '78-4' },
    { id: '66', label: '66º Promotor de Justiça', titular: 'Martha de Camargo Duarte Dias', vara: '20ª', sala: '74-4' },
    { id: '67', label: '67º Promotor de Justiça', titular: 'VAGO', vara: '19ª', sala: '76-4' },
    { id: '68', label: '68º Promotor de Justiça', titular: 'Marianna Moura Gonçalves', vara: '19ª', sala: '77-4' },
    { id: '69', label: '69º Promotor de Justiça', titular: 'Adriana Ribeiro Soares de Morais', vara: '17ª', sala: '75-4' },
    { id: '70', label: '70º Promotor de Justiça', titular: 'Patricia Salles Seguro', vara: '20ª', sala: '94-5' },
    { id: '71', label: '71º Promotor de Justiça', titular: 'Leonardo D\'Angelo Vargas Pereira', vara: '19ª', sala: '77-4' },
    { id: '72', label: '72º Promotor de Justiça', titular: 'VAGO', vara: '16ª', sala: '76-4' },
    { id: '73', label: '73º Promotor de Justiça', titular: 'Daniel Fontana', vara: '18ª', sala: '94-5' },
    { id: '74', label: '74º Promotor de Justiça', titular: 'Aline Aparecida Holtz Ambar', vara: '17ª', sala: '027-2' },
    { id: '75', label: '75º Promotor de Justiça', titular: 'Luiz Fernando Gagliardi Ferreira', vara: '18ª', sala: 'Cartório' },
    { id: '76', label: '76º Promotor de Justiça', titular: 'Laurani Assis de Figueiredo', vara: '17ª', sala: '96-5' },
    { id: '77', label: '77º Promotor de Justiça', titular: 'Solange Aparecida Cruz', vara: '18ª', sala: '95-5' },
    { id: '78', label: '78º Promotor de Justiça', titular: 'Claudio Henrique Bastos Giannini', vara: '16ª', sala: '78-4' },
    { id: '79', label: '79º Promotor de Justiça', titular: 'Margareth Ferraz França', vara: '16ª', sala: '95-5' },
    { id: '80', label: '80º Promotor de Justiça', titular: 'VAGO', vara: '18ª', sala: '96-5' },
  ],
  promotor_schedules: [
    { id: 'S61', promotoria_id: '61', promotor_name: 'Nina Pereira Malheiros', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S62', promotoria_id: '62', promotor_name: 'Pedro Henrique da Silva Rosa', gender: 'M', start_day: 1, end_day: 28 },
    { id: 'S63', promotoria_id: '63', promotor_name: 'Michaela Carli Gomes', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S64', promotoria_id: '64', promotor_name: 'Tânia Serra Azul Guimaraes Biazolli', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S65', promotoria_id: '65', promotor_name: 'Paulo Henrique Castex', gender: 'M', start_day: 1, end_day: 28 },
    { id: 'S66', promotoria_id: '66', promotor_name: 'Martha de Camargo Duarte Dias', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S67', promotoria_id: '67', promotor_name: 'Vera Lorza Duarte', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S68', promotoria_id: '68', promotor_name: 'Beatriz Lotufo Oliveira', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S69A', promotoria_id: '69', promotor_name: 'Adriana Ribeiro Soares de Morais', gender: 'F', start_day: 1, end_day: 22 },
    { id: 'S69B', promotoria_id: '69', promotor_name: 'Simone de Divitiis Perez', gender: 'F', start_day: 23, end_day: 27 },
    { id: 'S70', promotoria_id: '70', promotor_name: 'Barbara da Cunha Defaveri', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S71', promotoria_id: '71', promotor_name: 'Leonardo D\'Angelo Vargas Pereira', gender: 'M', start_day: 1, end_day: 28 },
    { id: 'S72', promotoria_id: '72', promotor_name: 'Pedro Henrique da Silva Rosa', gender: 'M', start_day: 1, end_day: 28 },
    { id: 'S73', promotoria_id: '73', promotor_name: 'Daniel Fontana', gender: 'M', start_day: 1, end_day: 28 },
    { id: 'S74', promotoria_id: '74', promotor_name: 'Pedro de Andrade Khouri Santos', gender: 'M', start_day: 1, end_day: 28 },
    { id: 'S75', promotoria_id: '75', promotor_name: 'Fernanda Queiroz Karan Franco', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S76', promotoria_id: '76', promotor_name: 'Laurani Assis de Figueiredo', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S77A', promotoria_id: '77', promotor_name: 'Solange Aparecida Cruz', gender: 'F', start_day: 1, end_day: 17 },
    { id: 'S77B', promotoria_id: '77', promotor_name: 'Maria Carolina Pera Joao Moreira Viegas', gender: 'F', start_day: 18, end_day: 27 },
    { id: 'S78', promotoria_id: '78', promotor_name: 'Claudio Henrique Bastos Giannini', gender: 'M', start_day: 1, end_day: 28 },
    { id: 'S79', promotoria_id: '79', promotor_name: 'Margareth Ferraz França', gender: 'F', start_day: 1, end_day: 28 },
    { id: 'S80', promotoria_id: '80', promotor_name: 'Tais Servilha Ferrari', gender: 'F', start_day: 1, end_day: 28 },
  ],
  analysts: [
    { id: 'A61', cargo_id: '61', name: 'Fernanda Lucia Beraldi Rangel', email: 'fernandarangel@mpsp.mp.br', obs: 'Compensação: 13/02' },
    { id: 'A62', cargo_id: '62', name: 'Flavia Luisa Ablas', email: 'flaviaablas@mpsp.mp.br', obs: 'Férias: 30/01 a 13/02' },
    { id: 'A63', cargo_id: '63', name: 'Flavia Mariana Barbosa', email: 'flaviabarbosa@mpsp.mp.br' },
    { id: 'A64', cargo_id: '64', name: 'Glauco Felipe Della Torre Batista', email: 'glaucobatista@mpsp.mp.br' },
    { id: 'A65', cargo_id: '65', name: 'Heidi Rho Jin Chung Cho', email: 'HeidiCho@mpsp.mp.br' },
    { id: 'A66', cargo_id: '66', name: 'Lucas Catharino de Sales', email: 'lucassales@mpsp.mp.br' },
    { id: 'A67', cargo_id: '67', name: 'Natália Chacon Sampaio', email: 'nataliasampaio@mpsp.mp.br' },
    { id: 'A69', cargo_id: '69', name: 'Olenka Neuza Serrao Colares', email: 'olenkacolares@mpsp.mp.br' },
    { id: 'A70', cargo_id: '70', name: 'Pedro Henrique Klein Cavalcante de Barros', email: 'pedrobarros@mpsp.mp.br' },
    { id: 'A71', cargo_id: '71', name: 'Rafael Luiz Ferreira de Oliveira', email: 'RafaelLOliveira@mpsp.mp.br' },
    { id: 'A72', cargo_id: '72', name: 'Rebeca Oliva Mattos Soares', email: 'rebecasoares@mpsp.mp.br' },
    { id: 'A73', cargo_id: '73', name: 'Rogerio Antonio Bussolin Curtolo', email: 'RogerioCurtolo@mpsp.mp.br' },
    { id: 'A74', cargo_id: '74', name: 'Samanta Akemi Nemoto', email: 'samantanemoto@mpsp.mp.br' },
    { id: 'A75', cargo_id: '75', name: 'Thomaz Raposo Viana da Cunha', email: 'ThomazCunha@mpsp.mp.br' },
    { id: 'A76', cargo_id: '76', name: 'Victor Lympius Bueno Franco', email: 'victorfranco@mpsp.mp.br' },
    { id: 'A77', cargo_id: '77', name: 'Amanda Gomes de Oliveira', email: 'AmandaOliveira@mpsp.mp.br' },
    { id: 'A78', cargo_id: '78', name: 'Ana Rita Ablas', email: 'anaablas@mpsp.mp.br' },
    { id: 'A79', cargo_id: '79', name: 'Camila Pamplona de Figueiredo', email: 'camilafigueiredo@mpsp.mp.br' },
    { id: 'A80', cargo_id: '80', name: 'Camilla Figueiredo Pessoa de Barros', email: 'camillabarros@mpsp.mp.br' },
  ],
  hearing_scales: [
    { id: 'H1', vara: '16ª Vara', date: '2024-01-02', weekday: 'Seg', t1: 'Pedro Henrique (72)', t2: 'Margareth Ferraz (79)', obs: '78º subst 72º / 61º subst 79º' },
    { id: 'H2', vara: '16ª Vara', date: '2024-01-03', weekday: 'Ter', t1: 'Nina Malheiros (61)', t2: 'Claudio Giannini (78)', obs: '79º subst 78º / 72º subst 61º' },
    { id: 'H3', vara: '17ª Vara', date: '2024-01-02', weekday: 'Seg', t1: 'Adriana Morais (69)', t2: 'Laurani Figueiredo (76)', obs: '76º subst 69º / 74º subst 62º' },
    { id: 'H4', vara: '18ª Vara', date: '2024-01-02', weekday: 'Seg', t1: 'Fernanda Franco (75)', t2: 'Solange Cruz (77)', obs: '73º subst 75º / 80º subst 77º' },
    { id: 'H5', vara: '19ª Vara', date: '2024-01-02', weekday: 'Seg', t1: 'Leonardo Vargas (71)', t2: 'Tania Biazolli (64)', obs: '68º subst 71º / 67º subst 64º' },
    { id: 'H6', vara: '20ª Vara', date: '2024-01-02', weekday: 'Seg', t1: 'Barbara Defaveri (70)', t2: 'Paulo Castex (65)', obs: '66º subst 65º / 63º subst 70º' },
  ],

  // 2. Archiving
  archived_processes: [
    { id: '201', numero_processo: '1500000-00.2024.8.26.0050', promotoria_label: '79º PJ', status: 'PENDENTE', created_at: '2024-05-10' },
    { id: '202', numero_processo: '1509999-99.2024.8.26.0050', promotoria_label: '61º PJ', status: 'CONCLUIDO', created_at: '2024-04-15' },
  ],
  process_parties: [
    { id: '301', process_id: '201', name: 'João da Silva', type: 'Investigado', status_intimacao: 'Pendente' },
    { id: '302', process_id: '201', name: 'Maria Oliveira', type: 'Vítima', status_intimacao: 'Concluído' },
  ],

  // 3. Documents
  oficios_history: [
    { id: '401', user_id: '1', numero_oficio: '102/24', destinatario_orgao: 'IIRGD', created_at: '2024-05-20' },
  ],
  sisdigital_terms: [
    { id: '402', user_id: '1', tipo_termo: 'Conclusão', numero_procedimento: 'NF 1234/24', created_at: '2024-05-19' },
  ],
  anpp_requests: [
    { id: '403', user_id: '1', numero_autos: '1500123-45.2024', formato: 'Digital', created_at: '2024-05-18' },
  ],
  general_intimations: [
    { id: '404', user_id: '1', recipient_name: 'José Santos', channel: 'whatsapp', status: 'Enviado', created_at: '2024-05-21' },
  ],

  // 4. Productivity
  user_gamification: [
    { user_id: '1', current_xp: 1250, current_level: 3, streak_days: 5, last_active: '2024-05-21' },
  ],
  user_tasks: [
    { id: '501', user_id: '1', title: 'Verificar pauta de audiências', is_completed: false, is_boring_flag: true },
  ],
  activities: [
    { id: '502', user_id: '1', process_number: '1500000-00.2024', type: 'Multa Penal', status: 'PENDENTE', due_date: '2024-05-30' },
  ],

  // 5. AI & Logs
  ai_consultations: [
    { id: '601', user_id: '1', tool_context: 'MENTOR', prompt_text: 'Análise de furto...', tokens_used: 150, created_at: '2024-05-21' },
  ],
  extraction_logs: [
    { id: '602', user_id: '1', tool_type: 'multa_penal', file_name: 'certidao.pdf', created_at: '2024-05-20' },
  ],

  // 6. Finance
  finance_events: [
    { id: '701', month: 5, year: 2024, contribution_value: 50.00, status: 'OPEN' },
  ],
  finance_participants: [
    { id: '702', event_id: '701', name: 'Alex Mendes', has_paid: true, is_external: false },
  ],
  finance_expenses: [
    { id: '703', event_id: '701', description: 'Bolo e Salgados', amount: 120.00 },
  ]
};

// --- Column Definitions ---
const COLUMNS: Record<TableName, { key: string; label: string; type?: 'badge' | 'text' | 'date' | 'boolean' }[]> = {
  users: [
    { key: 'full_name', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
    { key: 'role', label: 'Função', type: 'badge' },
    { key: 'created_at', label: 'Cadastro', type: 'date' },
  ],
  promotorias: [
    { key: 'id', label: 'ID' },
    { key: 'label', label: 'Cargo' },
    { key: 'titular', label: 'Titular' },
    { key: 'vara', label: 'Vara' },
    { key: 'sala', label: 'Sala' },
  ],
  promotor_schedules: [
    { key: 'promotoria_id', label: 'ID Cargo' },
    { key: 'promotor_name', label: 'Promotor(a)' },
    { key: 'start_day', label: 'Dia Início' },
    { key: 'end_day', label: 'Dia Fim' },
  ],
  analysts: [
    { key: 'cargo_id', label: 'Cargo' },
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
    { key: 'obs', label: 'Obs' },
  ],
  hearing_scales: [
    { key: 'vara', label: 'Vara' },
    { key: 'date', label: 'Data', type: 'date' },
    { key: 'weekday', label: 'Dia' },
    { key: 't1', label: 'Titular 1' },
    { key: 't2', label: 'Titular 2' },
    { key: 'obs', label: 'Obs (Substituições)' },
  ],
  archived_processes: [
    { key: 'numero_processo', label: 'Processo' },
    { key: 'promotoria_label', label: 'Promotoria' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'created_at', label: 'Data', type: 'date' },
  ],
  process_parties: [
    { key: 'process_id', label: 'Ref. Proc ID' },
    { key: 'name', label: 'Nome' },
    { key: 'type', label: 'Tipo' },
    { key: 'status_intimacao', label: 'Status', type: 'badge' },
  ],
  oficios_history: [
    { key: 'numero_oficio', label: 'Nº Ofício' },
    { key: 'destinatario_orgao', label: 'Destino' },
    { key: 'created_at', label: 'Data', type: 'date' },
  ],
  sisdigital_terms: [
    { key: 'tipo_termo', label: 'Tipo' },
    { key: 'numero_procedimento', label: 'Procedimento' },
    { key: 'created_at', label: 'Data', type: 'date' },
  ],
  anpp_requests: [
    { key: 'numero_autos', label: 'Autos' },
    { key: 'formato', label: 'Formato', type: 'badge' },
    { key: 'created_at', label: 'Data', type: 'date' },
  ],
  general_intimations: [
    { key: 'recipient_name', label: 'Destinatário' },
    { key: 'channel', label: 'Canal', type: 'badge' },
    { key: 'status', label: 'Status', type: 'badge' },
  ],
  user_gamification: [
    { key: 'user_id', label: 'User ID' },
    { key: 'current_level', label: 'Nível' },
    { key: 'current_xp', label: 'XP' },
    { key: 'streak_days', label: 'Streak' },
  ],
  user_tasks: [
    { key: 'title', label: 'Tarefa' },
    { key: 'is_completed', label: 'Concluída', type: 'boolean' },
    { key: 'is_boring_flag', label: 'Chato?', type: 'boolean' },
  ],
  activities: [
    { key: 'process_number', label: 'Processo' },
    { key: 'type', label: 'Tipo' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'due_date', label: 'Prazo', type: 'date' },
  ],
  ai_consultations: [
    { key: 'tool_context', label: 'Ferramenta' },
    { key: 'prompt_text', label: 'Prompt (Resumo)' },
    { key: 'tokens_used', label: 'Tokens' },
  ],
  extraction_logs: [
    { key: 'tool_type', label: 'Tipo' },
    { key: 'file_name', label: 'Arquivo' },
    { key: 'created_at', label: 'Data', type: 'date' },
  ],
  finance_events: [
    { key: 'month', label: 'Mês' },
    { key: 'year', label: 'Ano' },
    { key: 'contribution_value', label: 'Valor' },
    { key: 'status', label: 'Status', type: 'badge' },
  ],
  finance_participants: [
    { key: 'name', label: 'Nome' },
    { key: 'has_paid', label: 'Pago', type: 'boolean' },
    { key: 'is_external', label: 'Externo', type: 'boolean' },
  ],
  finance_expenses: [
    { key: 'description', label: 'Descrição' },
    { key: 'amount', label: 'Valor' },
  ],
};

const DatabaseManagerTool: React.FC = () => {
  const [activeTable, setActiveTable] = useState<TableName>('users');
  const [data, setData] = useState(MOCK_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<DBRecord | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('CORE');

  // --- Handlers ---
  const handleEdit = (record: DBRecord) => {
    setCurrentRecord({ ...record });
    setIsEditing(true);
  };

  const handleCreate = () => {
    const newId = crypto.randomUUID().slice(0, 4); // Mock ID
    setCurrentRecord({ id: newId });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) return;
    
    setData(prev => ({
      ...prev,
      [activeTable]: prev[activeTable].filter(r => (r.id || r.user_id) !== id) // Handle PK variation
    }));
  };

  const handleSave = () => {
    if (!currentRecord) return;

    setData(prev => {
      const tableData = [...prev[activeTable]];
      // Handle user_gamification which uses user_id as PK in this mock context
      const pk = activeTable === 'user_gamification' ? 'user_id' : 'id';
      
      const index = tableData.findIndex(r => r[pk] === currentRecord[pk]);
      
      if (index >= 0) {
        // Update
        tableData[index] = currentRecord;
      } else {
        // Insert
        tableData.push(currentRecord);
      }

      return { ...prev, [activeTable]: tableData };
    });

    setIsEditing(false);
    setCurrentRecord(null);
  };

  const handleFieldChange = (key: string, value: string) => {
    if (!currentRecord) return;
    setCurrentRecord(prev => ({ ...prev!, [key]: value }));
  };

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return data[activeTable].filter(item => 
      Object.values(item).some(val => String(val).toLowerCase().includes(term))
    );
  }, [data, activeTable, searchTerm]);

  // --- Render Helpers ---
  const renderBadge = (value: string | boolean) => {
    let valStr = String(value);
    let color = 'bg-slate-700 text-slate-300';
    const v = valStr.toLowerCase();
    
    if (v === 'admin' || v === 'concluido' || v === 'true' || v === 'pago' || v === 'enviado') color = 'bg-emerald-900/30 text-emerald-400 border border-emerald-800';
    else if (v === 'user' || v === 'pendente' || v === 'false' || v === 'open') color = 'bg-amber-900/30 text-amber-400 border border-amber-800';
    else if (v === 'inactive' || v === 'erro') color = 'bg-red-900/30 text-red-400 border border-red-800';
    else if (v === 'whatsapp') color = 'bg-green-900/30 text-green-400 border border-green-800';
    else if (v === 'email') color = 'bg-blue-900/30 text-blue-400 border border-blue-800';

    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${color}`}>{valStr}</span>;
  };

  const CategorySection = ({ id, label, icon, tables }: { id: string, label: string, icon: React.ReactNode, tables: { id: TableName, label: string }[] }) => (
    <div className="mb-2">
        <button 
            onClick={() => setExpandedCategory(expandedCategory === id ? null : id)}
            className="w-full flex items-center justify-between px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                {icon} {label}
            </div>
            {expandedCategory === id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        </button>
        {expandedCategory === id && (
            <div className="mt-1 ml-4 border-l border-slate-800 space-y-1">
                {tables.map(t => (
                    <button
                        key={t.id}
                        onClick={() => { setActiveTable(t.id); setSearchTerm(''); setIsEditing(false); }}
                        className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-all rounded-r-lg ${activeTable === t.id ? 'bg-indigo-900/30 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
        )}
    </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* Sidebar Navigation */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white"><Database size={20} /></div>
            <div>
              <h2 className="font-bold text-slate-100 uppercase tracking-tight text-sm">Data Manager</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Console Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
            <CategorySection 
                id="CORE" 
                label="Núcleo" 
                icon={<Shield size={14}/>} 
                tables={[
                    { id: 'users', label: 'Usuários' },
                    { id: 'promotorias', label: 'Cargos (Promotorias)' },
                    { id: 'promotor_schedules', label: 'Escalas (Membros)' },
                    { id: 'analysts', label: 'Analistas Jurídicos' },
                ]}
            />
            <CategorySection 
                id="PROD" 
                label="Produtividade" 
                icon={<Zap size={14}/>} 
                tables={[
                    { id: 'hearing_scales', label: 'Audiências (Escala)' },
                    { id: 'activities', label: 'Atividades' },
                    { id: 'user_tasks', label: 'Tarefas' },
                    { id: 'user_gamification', label: 'Gamificação' }
                ]}
            />
            <CategorySection 
                id="ARCHIVE" 
                label="Arquivamento" 
                icon={<Archive size={14}/>} 
                tables={[
                    { id: 'archived_processes', label: 'Processos' },
                    { id: 'process_parties', label: 'Partes' }
                ]}
            />
            <CategorySection 
                id="DOCS" 
                label="Documentos" 
                icon={<FileText size={14}/>} 
                tables={[
                    { id: 'oficios_history', label: 'Ofícios' },
                    { id: 'sisdigital_terms', label: 'SISDigital' },
                    { id: 'anpp_requests', label: 'ANPP' },
                    { id: 'general_intimations', label: 'Intimações' }
                ]}
            />
            <CategorySection 
                id="AI" 
                label="Inteligência" 
                icon={<BrainCircuit size={14}/>} 
                tables={[
                    { id: 'ai_consultations', label: 'Consultas IA' },
                    { id: 'extraction_logs', label: 'Logs Extração' }
                ]}
            />
            <CategorySection 
                id="FIN" 
                label="Financeiro" 
                icon={<Wallet size={14}/>} 
                tables={[
                    { id: 'finance_events', label: 'Eventos' },
                    { id: 'finance_participants', label: 'Participantes' },
                    { id: 'finance_expenses', label: 'Despesas' }
                ]}
            />
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Status do Banco</p>
                 <p className="text-xs font-bold text-emerald-500">Conectado (Mock)</p>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Header Toolbar */}
        <div className="h-20 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between px-8">
           <div className="flex items-center gap-4">
              <TableIcon className="text-indigo-500" size={24} />
              <h1 className="text-2xl font-bold text-slate-100 capitalize">{activeTable.replace('_', ' ')}</h1>
              <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold">{filteredData.length} registros</span>
           </div>

           <div className="flex items-center gap-4">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 w-64 transition-all"
                 />
              </div>
              <button 
                onClick={handleCreate}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-900/20 transition-all"
              >
                 <Plus size={16} /> Novo Registro
              </button>
           </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto p-8 bg-slate-950 custom-scrollbar">
           <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                       {COLUMNS[activeTable].map(col => (
                          <th key={col.key} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                             {col.label}
                          </th>
                       ))}
                       <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                    {filteredData.map((row, idx) => (
                       <tr key={row.id || row.user_id || idx} className="group hover:bg-indigo-900/10 transition-colors">
                          {COLUMNS[activeTable].map(col => (
                             <td key={col.key} className="px-6 py-4 text-sm font-medium text-slate-300 whitespace-nowrap">
                                {col.type === 'badge' || col.type === 'boolean' ? renderBadge(row[col.key]) : row[col.key]}
                             </td>
                          ))}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(row)} className="p-2 hover:bg-slate-800 rounded-lg text-amber-500 transition-colors" title="Editar">
                                   <Pencil size={16} />
                                </button>
                                <button onClick={() => handleDelete(row.id || row.user_id)} className="p-2 hover:bg-slate-800 rounded-lg text-red-500 transition-colors" title="Excluir">
                                   <Trash2 size={16} />
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                    {filteredData.length === 0 && (
                       <tr>
                          <td colSpan={COLUMNS[activeTable].length + 1} className="px-6 py-12 text-center text-slate-500 text-sm">
                             Nenhum registro encontrado nesta tabela.
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Edit/Create Panel (Slide Over) */}
        {isEditing && currentRecord && (
           <div className="absolute inset-y-0 right-0 w-[400px] bg-slate-900 border-l border-slate-800 shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                 <h3 className="font-bold text-slate-100 uppercase tracking-tight flex items-center gap-2">
                    {currentRecord.id && data[activeTable].find(r => r.id === currentRecord.id) ? <Pencil size={18} className="text-amber-500"/> : <Plus size={18} className="text-emerald-500"/>}
                    {currentRecord.id && data[activeTable].find(r => r.id === currentRecord.id) ? 'Editar Registro' : 'Novo Registro'}
                 </h3>
                 <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-red-500 transition-colors">
                    <X size={20} />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                 {COLUMNS[activeTable].map(col => (
                    <div key={col.key}>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{col.label}</label>
                       <input 
                          type="text" 
                          value={currentRecord[col.key] || ''} 
                          onChange={(e) => handleFieldChange(col.key, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all placeholder-slate-600"
                          placeholder={`Digite ${col.label}...`}
                       />
                    </div>
                 ))}
                 
                 {/* Hidden ID Field for visual confirmation */}
                 <div className="pt-4 border-t border-slate-800">
                    <p className="text-[10px] font-mono text-slate-600">INTERNAL ID: {currentRecord.id || currentRecord.user_id || 'NEW'}</p>
                 </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-950">
                 <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 transition-all">
                    <Save size={18} /> Salvar Alterações
                 </button>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};

export default DatabaseManagerTool;
