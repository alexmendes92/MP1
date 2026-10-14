
import React from 'react';
import { Database, Table, Key, FileCode, Server, ArrowLeft } from 'lucide-react';

interface DatabaseSchemaDocsProps {
  onBack?: () => void;
}

const DatabaseSchemaDocs: React.FC<DatabaseSchemaDocsProps> = ({ onBack }) => {
  
  const SchemaSection = ({ title, tables }: { title: string, tables: any[] }) => (
    <div className="space-y-6 mb-12">
        <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight border-l-4 border-indigo-500 pl-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tables.map((table, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                    <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-sm text-indigo-400 font-bold">
                            <Table size={16}/> {table.name}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{table.description}</span>
                    </div>
                    <div className="p-4 space-y-2">
                        {table.columns.map((col: any, cIdx: number) => (
                            <div key={cIdx} className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                <div className="flex items-center gap-2">
                                    {col.pk && <Key size={12} className="text-amber-500"/>}
                                    {col.fk && <Key size={12} className="text-slate-500 rotate-90"/>}
                                    <span className={`font-mono ${col.pk ? 'text-amber-200' : 'text-slate-300'}`}>{col.name}</span>
                                </div>
                                <span className="text-slate-500 font-mono">{col.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const coreTables = [
    {
        name: 'users',
        description: 'Autenticação e Perfis',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'email', type: 'varchar(255)' },
            { name: 'full_name', type: 'varchar(255)' },
            { name: 'role', type: 'enum(admin, user)' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    },
    {
        name: 'promotorias',
        description: 'Cargos e Promotores (Estrutura)',
        columns: [
            { name: 'id', type: 'int4', pk: true },
            { name: 'label', type: 'varchar(100)' },
            { name: 'titular', type: 'varchar(255)' },
            { name: 'vara', type: 'varchar(50)' },
            { name: 'sala', type: 'varchar(50)' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    },
    {
        name: 'promotor_schedules',
        description: 'Escala de Substituição (Diária)',
        columns: [
            { name: 'id', type: 'bigint', pk: true },
            { name: 'promotoria_id', type: 'int4', fk: true },
            { name: 'promotor_name', type: 'varchar(255)' },
            { name: 'gender', type: 'char(1)' },
            { name: 'start_day', type: 'int2' },
            { name: 'end_day', type: 'int2' }
        ]
    },
    {
        name: 'analysts',
        description: 'Analistas Jurídicos',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'cargo_id', type: 'int4', fk: true },
            { name: 'name', type: 'varchar(255)' },
            { name: 'email', type: 'varchar(255)' },
            { name: 'obs', type: 'text' }
        ]
    }
  ];

  const processTables = [
    {
        name: 'archived_processes',
        description: 'Processos de Arquivamento',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'numero_processo', type: 'varchar(50)' },
            { name: 'promotoria_label', type: 'varchar(100)' },
            { name: 'promotor_name', type: 'varchar(255)' },
            { name: 'status', type: 'varchar(20)' },
            { name: 'created_at', type: 'timestamptz' },
            { name: 'updated_at', type: 'timestamptz' }
        ]
    },
    {
        name: 'process_parties',
        description: 'Partes Envolvidas (Arquivamento)',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'process_id', type: 'uuid', fk: true },
            { name: 'name', type: 'varchar(255)' },
            { name: 'type', type: 'varchar(50)' },
            { name: 'status_intimacao', type: 'varchar(50)' },
            { name: 'contact_info', type: 'jsonb' },
            { name: 'address_info', type: 'jsonb' },
            { name: 'folha', type: 'varchar(20)' }
        ]
    }
  ];

  const documentTables = [
    {
        name: 'oficios_history',
        description: 'Histórico de Ofícios Gerados',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'user_id', type: 'uuid', fk: true },
            { name: 'numero_oficio', type: 'varchar(20)' },
            { name: 'numero_processo', type: 'varchar(50)' },
            { name: 'destinatario_orgao', type: 'varchar(100)' },
            { name: 'conteudo_gerado', type: 'text' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    },
    {
        name: 'sisdigital_terms',
        description: 'Termos de Conclusão/Juntada',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'user_id', type: 'uuid', fk: true },
            { name: 'tipo_termo', type: 'varchar(20)' },
            { name: 'numero_procedimento', type: 'varchar(50)' },
            { name: 'documento_juntado', type: 'varchar(200)' },
            { name: 'folhas', type: 'varchar(20)' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    },
    {
        name: 'anpp_requests',
        description: 'Solicitações de ANPP',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'user_id', type: 'uuid', fk: true },
            { name: 'numero_autos', type: 'varchar(50)' },
            { name: 'formato', type: 'varchar(20)' },
            { name: 'imputados_json', type: 'jsonb' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    },
    {
        name: 'general_intimations',
        description: 'Central de Intimações (Geral)',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'user_id', type: 'uuid', fk: true },
            { name: 'process_number', type: 'varchar(50)' },
            { name: 'recipient_name', type: 'varchar(255)' },
            { name: 'channel', type: 'enum(whatsapp, email, post)' },
            { name: 'message_body', type: 'text' },
            { name: 'status', type: 'varchar(20)' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    }
  ];

  const productivityTables = [
    {
        name: 'hearing_scales',
        description: 'Escala de Audiências (Varas)',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'vara', type: 'varchar(50)' },
            { name: 'date', type: 'date' },
            { name: 'weekday', type: 'varchar(20)' },
            { name: 't1', type: 'varchar(255)' },
            { name: 't2', type: 'varchar(255)' },
            { name: 'obs', type: 'text' }
        ]
    },
    {
        name: 'user_gamification',
        description: 'Progresso do Usuário (NeuroFocus)',
        columns: [
            { name: 'user_id', type: 'uuid', pk: true, fk: true },
            { name: 'current_xp', type: 'int4' },
            { name: 'current_level', type: 'int4' },
            { name: 'streak_days', type: 'int4' },
            { name: 'last_active', type: 'timestamptz' }
        ]
    },
    {
        name: 'user_tasks',
        description: 'Tarefas Diárias',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'user_id', type: 'uuid', fk: true },
            { name: 'title', type: 'varchar(255)' },
            { name: 'is_completed', type: 'boolean' },
            { name: 'is_boring_flag', type: 'boolean' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    },
    {
        name: 'activities',
        description: 'Controle de Atividades (Prazos)',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'user_id', type: 'uuid', fk: true },
            { name: 'process_number', type: 'varchar(50)' },
            { name: 'type', type: 'varchar(50)' },
            { name: 'status', type: 'varchar(50)' },
            { name: 'due_date', type: 'date' },
            { name: 'cargo_label', type: 'varchar(100)' },
            { name: 'notes', type: 'text' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    }
  ];

  const aiTables = [
    {
        name: 'ai_consultations',
        description: 'Histórico de consultas e análises de IA',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'user_id', type: 'uuid', fk: true },
            { name: 'tool_context', type: 'varchar(50)' },
            { name: 'prompt_text', type: 'text' },
            { name: 'ai_response', type: 'text' },
            { name: 'tokens_used', type: 'int4' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    },
    {
        name: 'extraction_logs',
        description: 'Histórico de Extração de Dados',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'user_id', type: 'uuid', fk: true },
            { name: 'tool_type', type: 'enum(multa_penal, general)' },
            { name: 'file_name', type: 'varchar(255)' },
            { name: 'extracted_json', type: 'jsonb' },
            { name: 'created_at', type: 'timestamptz' }
        ]
    }
  ];

  const financeTables = [
    {
        name: 'finance_events',
        description: 'Eventos Financeiros',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'month', type: 'int2' },
            { name: 'year', type: 'int4' },
            { name: 'contribution_value', type: 'decimal(10,2)' },
            { name: 'status', type: 'varchar(20)' }
        ]
    },
    {
        name: 'finance_participants',
        description: 'Participantes do Rateio',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'event_id', type: 'uuid', fk: true },
            { name: 'name', type: 'varchar(255)' },
            { name: 'is_external', type: 'boolean' },
            { name: 'has_paid', type: 'boolean' },
            { name: 'birthday', type: 'varchar(5)' }
        ]
    },
    {
        name: 'finance_expenses',
        description: 'Despesas do Evento',
        columns: [
            { name: 'id', type: 'uuid', pk: true },
            { name: 'event_id', type: 'uuid', fk: true },
            { name: 'description', type: 'varchar(255)' },
            { name: 'amount', type: 'decimal(10,2)' }
        ]
    }
  ];

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col items-center">
        <div className="w-full max-w-6xl">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 hover:text-white text-slate-400 transition-all">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-3">
                            <Database className="text-indigo-500" /> Estrutura de Banco de Dados
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 font-mono">Schema V1.4 • PostgreSQL / Supabase Migration Spec</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-950/20 border border-indigo-900/50 rounded-lg text-indigo-400 text-xs font-bold uppercase tracking-widest">
                    <Server size={16} /> Technical Doc
                </div>
            </div>

            {/* Intro */}
            <div className="bg-indigo-900/10 border border-indigo-500/20 p-6 rounded-2xl mb-12">
                <h3 className="text-indigo-400 font-bold uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
                    <FileCode size={16}/> Objetivo da Migração
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Esta documentação detalha a estrutura de tabelas relacionais necessária para migrar o armazenamento de dados do estado local (React State) para um banco de dados persistente (SQL). Recomenda-se o uso de <b>UUIDs</b> para chaves primárias e campos <b>JSONB</b> para flexibilidade em dados de endereço e contato.
                </p>
            </div>

            {/* Sections */}
            <SchemaSection title="1. Núcleo e Autenticação" tables={coreTables} />
            <SchemaSection title="2. Módulo de Arquivamento" tables={processTables} />
            <SchemaSection title="3. Geração de Documentos (Histórico)" tables={documentTables} />
            <SchemaSection title="4. Gamificação & Atividades" tables={productivityTables} />
            <SchemaSection title="5. Inteligência Artificial & Logs" tables={aiTables} />
            <SchemaSection title="6. Módulo Financeiro" tables={financeTables} />

            {/* Footer */}
            <div className="text-center py-8 border-t border-slate-800 text-slate-600 text-xs font-mono uppercase tracking-widest">
                Generated by MPSP System Architecture Team
            </div>

        </div>
      </div>
    </div>
  );
};

export default DatabaseSchemaDocs;
