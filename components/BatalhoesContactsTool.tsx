import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Search, 
  Copy, 
  Mail, 
  CheckCircle, 
  Check, 
  Filter, 
  Plus, 
  Trash2, 
  FileText, 
  Printer, 
  Download, 
  Sparkles, 
  Building2, 
  MapPin, 
  Info,
  X,
  ExternalLink
} from 'lucide-react';

export interface BattalionContact {
  id: string;
  opm: string;
  email: string;
  category: 'BPM/M' | 'BPM/I' | 'BAEP' | 'Especializado' | 'Comando/Ensino';
  region?: string;
  notes?: string;
}

const INITIAL_BATALHOES: BattalionContact[] = [
  // Page 1
  { id: '10-baep', opm: '10º BAEP', email: '10baepsjd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Piracicaba / Região' },
  { id: '10-bpm-m', opm: '10º BPM/M', email: '10bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Santo André' },
  { id: '11-baep', opm: '11º BAEP', email: '11baeppjmd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Ribeirão Preto' },
  { id: '11-bpm-m', opm: '11º BPM/M', email: '11bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Centro' },
  { id: '11-bpm-i', opm: '11º BPM/I', email: '11bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Jundiaí' },
  { id: '12-baep', opm: '12º BAEP', email: '12baeppjmd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Bauru' },
  { id: '12-bpm-m', opm: '12º BPM/M', email: '12bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Sudeste' },
  { id: '13-baep', opm: '13º BAEP', email: '13baeppjmd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Bauru / Jaú' },
  { id: '13-bpm-m', opm: '13º BPM/M', email: '13bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Centro' },
  { id: '14-baep', opm: '14º BAEP', email: '14baeppjmd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Sorocaba' },
  { id: '14-bpm-m', opm: '14º BPM/M', email: '14bpmmsdj@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Osasco' },
  { id: '15-baep', opm: '15º BAEP', email: '15baeppjmd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Guarulhos' },
  { id: '15-bpm-m', opm: '15º BPM/M', email: '15bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Guarulhos' },
  { id: '16-bpm-m', opm: '16º BPM/M', email: '16bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Oeste' },
  { id: '17-bpm-m', opm: '17º BPM/M', email: '17bpmmsdj@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Mogi das Cruzes' },
  { id: '18-bpm-m', opm: '18º BPM/M', email: '18bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Norte' },
  { id: '19-bpm-i', opm: '19º BPM/I', email: '19bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Americana' },
  { id: '19-bpm-m', opm: '19º BPM/M', email: '19bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Leste' },
  { id: '1-baep', opm: '1º BAEP', email: '1baepsjd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Campinas' },
  { id: '1-bpamb', opm: '1º BPAmb', email: '1bpambsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Ambiental (Capital/Litoral)' },
  { id: '1-bpchq', opm: '1º BPChq', email: '1bpchqsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Batalhão ROTA (Choque)' },
  { id: '1-bpm-m', opm: '1º BPM/M', email: '1bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Sul' },
  { id: '1-bpmi', opm: '1º BPMI', email: '1bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'São José dos Campos' },
  { id: '1-bprv', opm: '1º BPRv', email: '1bprvsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Rodoviária (São Bernardo)' },
  { id: '1-bptran', opm: '1º BPTran', email: '1bptranpjmd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia de Trânsito' },
  { id: '20-bpm-i', opm: '20º BPM/I', email: '20bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Caraguatatuba (Litoral Norte)' },
  { id: '20-bpm-m', opm: '20º BPM/M', email: '20bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Barueri / Jandira' },
  { id: '21-bpm-i', opm: '21º BPM/I', email: '21bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Guarujá / Cubatão' },
  { id: '21-bpm-m', opm: '21º BPM/M', email: '21bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Leste (Mooca/Ipiranga)' },
  { id: '22-bpm-m', opm: '22º BPM/M', email: '22bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Sul' },
  { id: '23-bpm-m', opm: '23º BPM/M', email: '23bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Oeste (Pinheiros/Perdizes)' },
  { id: '24-bpm-m', opm: '24º BPM/M', email: '24bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Diadema' },
  { id: '25-bpm-m', opm: '25º BPM/M', email: '25bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Itapecerica da Serra' },
  { id: '26-bpm-m', opm: '26º BPM/M', email: '26bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Franco da Rocha / Caieiras' },
  { id: '27-bpm-m', opm: '27º BPM/M', email: '27bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Sul (Grajaú)' },
  { id: '28-bpm-m', opm: '28º BPM/M', email: '28bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Leste (Guaianases)' },
  { id: '29-bpm-m', opm: '29º BPM/M', email: '29bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Leste (Itaim Paulista)' },
  { id: '2-baep', opm: '2º BAEP', email: '2baepsjd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Santos / Baixada Santista' },
  { id: '2-bpamb', opm: '2º BPAmb', email: '2bpambsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Ambiental (Birigui)' },
  { id: '2-bpchq', opm: '2º BPChq', email: '2bpchqpjmd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Batalhão Anchieta (Choque)' },
  { id: 2 + '-bpm-m', opm: '2º BPM/M', email: '2bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Leste (Penha/Tatuapé)' },
  { id: '2-bprv', opm: '2º BPRv', email: '2bprvsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Rodoviária (Bauru)' },
  { id: '2-bptran', opm: '2º BPTran', email: '2bptransjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia de Trânsito' },
  { id: '30-bpm-m', opm: '30º BPM/M', email: '30bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Mauá / Ribeirão Pires' },
  { id: '31-bpm-m', opm: '31º BPM/M', email: '31bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Guarulhos Norte' },
  { id: '32-bpm-m', opm: '32º BPM/M', email: '32bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Suzano / Poá' },

  // Page 2
  { id: '33-bpm-m', opm: '33º BPM/M', email: '33bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Carapicuíba' },
  { id: '35-bpm-i', opm: '35º BPM/I', email: '35bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Campinas' },
  { id: '35-bpm-m', opm: '35º BPM/M', email: '35bpmmpjmd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Itaquaquecetuba' },
  { id: '36-bpm-m', opm: '36º BPM/M', email: '36bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'Embu das Artes / Taboão' },
  { id: '37-bpm-m', opm: '37º BPM/M', email: '37bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Sul (Capão Redondo)' },
  { id: '38-bpm-m', opm: '38º BPM/M', email: '38bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Leste (São Mateus)' },
  { id: '39-bpm-i', opm: '39º BPM/I', email: '39bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'São José dos Campos' },
  { id: '39-bpm-m', opm: '39º BPM/M', email: '39bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Leste (Cangaíba)' },
  { id: '3-baep', opm: '3º BAEP', email: '3baepsjd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'São José dos Campos' },
  { id: '3-bpamb', opm: '3º BPAmb', email: '3bpambsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Ambiental (Guaratinguetá)' },
  { id: '3-bpchq', opm: '3º BPChq', email: '3bpchqsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Batalhão Humaitá (Choque)' },
  { id: '3-bpm-m', opm: '3º BPM/M', email: '3bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Sul (Jabaquara)' },
  { id: '3-bpm-i', opm: '3º BPM/I', email: '3bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Ribeirão Preto' },
  { id: '3-bprv', opm: '3º BPRv', email: '3bprvsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Rodoviária (Araraquara)' },
  { id: '41-bpm-i', opm: '41º BPM/I', email: '41bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Jacareí' },
  { id: '43-bpm-m', opm: '43º BPM/M', email: '43bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Norte (Jaçanã)' },
  { id: '46-bpm-i', opm: '46º BPM/I', email: '46bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'São José dos Campos' },
  { id: '46-bpm-m', opm: '46º BPM/M', email: '46bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Sul (Ipiranga)' },
  { id: '47-bpm-i', opm: '47º BPM/I', email: '47bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Campinas' },
  { id: '48-bpm-i', opm: '48º BPM/I', email: '48bpmisdj@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Sumaré' },
  { id: '48-bpm-m', opm: '48º BPM/M', email: '48bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Leste (Cidade Tiradentes)' },
  { id: '49-bpm-i', opm: '49º BPM/I', email: '49bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Jundiaí' },
  { id: '49-bpm-m', opm: '49º BPM/M', email: '49bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Oeste (Pirituba)' },
  { id: '4-baep', opm: '4º BAEP', email: '4baepsjd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'São Paulo - Zona Leste' },
  { id: '4-bpamb', opm: '4º BPAmb', email: '4bpambsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Ambiental (São José do Rio Preto)' },
  { id: '4-bpchq', opm: '4º BPChq', email: '4bpchqsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Batalhão Operações Especiais (COE/GATE)' },
  { id: '4-bpm-m', opm: '4º BPM/M', email: '4bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Oeste (Lapa)' },
  { id: '4-bprv', opm: '4º BPRv', email: '4bprvsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Rodoviária (Campinas)' },
  { id: '50-bpmi', opm: '50º BPM/I', email: '50bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Itu' },
  { id: '51-bpm-i', opm: '51º BPM/I', email: '51bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Ribeirão Preto' },
  { id: '52-bpm-i', opm: '52º BPM/I', email: '52bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Mirassol' },
  { id: '53-bpm-i', opm: '53º BPM/I', email: '53bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Avaré' },
  { id: '54-bpm-i', opm: '54º BPM/I', email: '54bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Itapeva' },
  { id: '5-baep', opm: '5º BAEP', email: '5baepsjd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Barueri / Osasco' },
  { id: '5-bpamb', opm: '5º BPAmb', email: '5bpambsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Ambiental (Presidente Prudente)' },
  { id: '5-bpchq', opm: '5º BPChq', email: '5bpchqspjmd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Batalhão de Ações Especiais de Choque' },
  { id: '5-bpm-i', opm: '5º BPM/I', email: '5bpmipsjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Taubaté' },
  { id: '5-bpm-m', opm: '5º BPM/M', email: '5bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Norte (Vila Gustavo)' },
  { id: '5-bprv', opm: '5º BPRv', email: '5bprvsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Rodoviária (Sorocaba)' },
  { id: '6-baep', opm: '6º BAEP', email: '6baeppjmd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'ABC Paulista' },
  { id: '6-bpm-i', opm: '6º BPM/I', email: '6bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Santos' },
  { id: '6-bpm-m', opm: '6º BPM/M', email: '6bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Bernardo do Campo' },
  { id: '6-bprv', opm: '6º BPRv', email: '6bprvsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Polícia Rodoviária' },
  { id: '7-baep', opm: '7º BAEP', email: '7baepjmd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'São Paulo - Centro' },
  { id: '7-bpm-m', opm: '7º BPM/M', email: '7bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Centro (República)' },
  { id: '8-baep', opm: '8º BAEP', email: '8baepspjmd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'Presidente Prudente' },
  { id: '8-bpm-i', opm: '8º BPM/I', email: '8bpmisjd@policiamilitar.sp.gov.br', category: 'BPM/I', region: 'Campinas' },

  // Page 3
  { id: '8-bpm-m', opm: '8º BPM/M', email: '8bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Leste (Tatuapé)' },
  { id: '9-baep', opm: '9º BAEP', email: '9baepsjd@policiamilitar.sp.gov.br', category: 'BAEP', region: 'São José do Rio Preto' },
  { id: '9-bpm-m', opm: '9º BPM/M', email: '9bpmmsjd@policiamilitar.sp.gov.br', category: 'BPM/M', region: 'São Paulo - Zona Norte (Casa Verde)' },
  { id: 'apmbb', opm: 'APMBB', email: 'apmbbpjmd@policiamilitar.sp.gov.br', category: 'Comando/Ensino', region: 'Academia do Barro Branco' },
  { id: 'cpa-m10', opm: 'CPA/M-10', email: 'cpam10sjd@policiamilitar.sp.gov.br', category: 'Comando/Ensino', region: 'Comando do Policiamento de Área - Zona Sul' },
  { id: 'cpa-m12', opm: 'CPA/M-12', email: 'cpam12sjd@policiamilitar.sp.gov.br', category: 'Comando/Ensino', region: 'Comando do Policiamento de Área - Mogi' },
  { id: 'cpa-m5', opm: 'CPA/M-5', email: 'cpam5sjd@policiamilitar.sp.gov.br', category: 'Comando/Ensino', region: 'Comando do Policiamento de Área - Zona Oeste' },
  { id: 'cpa-m9', opm: 'CPA/M-9', email: 'cpam9sjd@policiamilitar.sp.gov.br', category: 'Comando/Ensino', region: 'Comando do Policiamento de Área - Leste' },
  { id: 'cptran', opm: 'CPTran', email: 'cptransjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Comando de Policiamento de Trânsito' },
  { id: 'eef', opm: 'EEF', email: 'eefsjd@policiamilitar.sp.gov.br', category: 'Comando/Ensino', region: 'Escola de Educação Física da PM' },
  { id: 'essd', opm: 'ESSd', email: 'essdsjd@policiamilitar.sp.gov.br', category: 'Comando/Ensino', region: 'Escola de Soldados' },
  { id: 'essgt', opm: 'ESSgt', email: 'essgtsjd@policiamilitar.sp.gov.br', category: 'Comando/Ensino', region: 'Escola de Sargentos' },
  { id: 'rpmon', opm: 'RPMON', email: 'rpmonsjd@policiamilitar.sp.gov.br', category: 'Especializado', region: 'Regimento de Polícia Montada (Cavalaria)' },
  { id: 'correg', opm: 'Corregedoria', email: 'correg@policiamilitar.sp.gov.br', category: 'Comando/Ensino', region: 'Corregedoria da Polícia Militar' },
];

const BatalhoesContactsTool: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Custom Local Contacts
  const [customContacts, setCustomContacts] = useState<BattalionContact[]>(() => {
    try {
      const saved = localStorage.getItem('mpsp_batalhoes_custom');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal State for adding custom contact
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOpm, setNewOpm] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCategory, setNewCategory] = useState<BattalionContact['category']>('BPM/M');
  const [newRegion, setNewRegion] = useState('');

  // Modal State for generating email draft / ofício memo
  const [selectedForDraft, setSelectedForDraft] = useState<BattalionContact | null>(null);
  const [draftProcesso, setDraftProcesso] = useState('');
  const [draftPM, setDraftPM] = useState('');
  const [draftSubject, setDraftSubject] = useState('Solicitação de Apresentação de Policial Militar / Escala de Serviço');
  const [draftCopied, setDraftCopied] = useState(false);

  // Combine static and custom contacts
  const allContacts = useMemo(() => {
    return [...customContacts, ...INITIAL_BATALHOES];
  }, [customContacts]);

  // Save custom contacts
  const handleAddCustomContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpm.trim() || !newEmail.trim()) return;

    const newContact: BattalionContact = {
      id: `custom-${Date.now()}`,
      opm: newOpm.trim(),
      email: newEmail.trim().toLowerCase(),
      category: newCategory,
      region: newRegion.trim() || 'Personalizado'
    };

    const updated = [newContact, ...customContacts];
    setCustomContacts(updated);
    try {
      localStorage.setItem('mpsp_batalhoes_custom', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setNewOpm('');
    setNewEmail('');
    setNewRegion('');
    setShowAddModal(false);
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customContacts.filter(c => c.id !== id);
    setCustomContacts(updated);
    try {
      localStorage.setItem('mpsp_batalhoes_custom', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return allContacts.filter(item => {
      const matchesSearch = 
        item.opm.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.region && item.region.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = 
        selectedCategory === 'TODOS' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allContacts, searchTerm, selectedCategory]);

  // Multi-select handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.length === filteredContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const copySingleEmail = (contact: BattalionContact) => {
    navigator.clipboard.writeText(contact.email).then(() => {
      setCopiedId(contact.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const copySelectedEmails = () => {
    const emailsToCopy = allContacts
      .filter(c => selectedIds.includes(c.id))
      .map(c => c.email);

    if (emailsToCopy.length === 0) return;

    const formatted = emailsToCopy.join(', ');
    navigator.clipboard.writeText(formatted).then(() => {
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2500);
    });
  };

  const categories = [
    { label: 'Todos', value: 'TODOS', count: allContacts.length },
    { label: 'BPM/M (Capital/Metro)', value: 'BPM/M', count: allContacts.filter(c => c.category === 'BPM/M').length },
    { label: 'BPM/I (Interior)', value: 'BPM/I', count: allContacts.filter(c => c.category === 'BPM/I').length },
    { label: 'BAEP (Ações Especiais)', value: 'BAEP', count: allContacts.filter(c => c.category === 'BAEP').length },
    { label: 'Especializados', value: 'Especializado', count: allContacts.filter(c => c.category === 'Especializado').length },
    { label: 'Comandos / Ensino', value: 'Comando/Ensino', count: allContacts.filter(c => c.category === 'Comando/Ensino').length },
  ];

  // Generated Email Text
  const generatedDraftText = useMemo(() => {
    if (!selectedForDraft) return '';
    return `AO COMANDANTE / SEÇÃO DE JUSTIÇA E DISCIPLINA DO ${selectedForDraft.opm.toUpperCase()}
E-mail: ${selectedForDraft.email}

Assunto: ${draftSubject}
Processo nº: ${draftProcesso || '[Número do Processo]'}

Cumprimentando-o cordialmente, sirvo-me do presente para solicitar a Vossa Senhoria as providências necessárias com relação ao Policial Militar:

Policial / Objeto: ${draftPM || '[Nome do Policial Militar / Requisito]'}

Solicitamos a gentileza de encaminhar a esta Promotoria de Justiça, no prazo de 05 (cinco) dias, a resposta para instrução do procedimento de referência.

Atenciosamente,

OFICIAL DE PROMOTORIA DE JUSTIÇA
4ª Promotoria de Justiça Criminal do Capital - MPSP`.trim();
  }, [selectedForDraft, draftSubject, draftProcesso, draftPM]);

  const copyDraft = () => {
    navigator.clipboard.writeText(generatedDraftText).then(() => {
      setDraftCopied(true);
      setTimeout(() => setDraftCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-950 animate-in fade-in duration-300">
      
      {/* HEADER BAR */}
      <div className="bg-slate-900 border-b border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-2xl text-red-500 shadow-lg shadow-red-950/40">
            <Shield size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100 uppercase tracking-tight">E-mails dos Batalhões e OPMs (PMESP)</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-800/60 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                {allContacts.length} Unidades Cadastradas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Diretório oficial de contatos eletrônicos dos Batalhões e Seções de Justiça e Disciplina (SJD) da Polícia Militar de SP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={copySelectedEmails}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-950/50 animate-in zoom-in-95"
            >
              {copiedBatch ? <CheckCircle size={16} /> : <Copy size={16} />}
              {copiedBatch ? "E-mails Copiados!" : `Copiar (${selectedIds.length}) E-mails`}
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            <Plus size={16} />
            Novo Contato
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 p-4 px-6 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por OPM (Ex: 10º BPM/M, BAEP, Corregedoria, ROTA...)"
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-all placeholder-slate-600"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                selectedCategory === cat.value
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                selectedCategory === cat.value ? 'bg-red-800 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT GRID / TABLE */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-4">

          {/* Table Header Controls */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={filteredContacts.length > 0 && selectedIds.length === filteredContacts.length}
                  onChange={handleSelectAllFiltered}
                  className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0"
                />
                Selecionar Todos Exibidos ({filteredContacts.length})
              </label>
            </div>
            <span className="text-[10px] uppercase tracking-wider">
              Mostrando {filteredContacts.length} de {allContacts.length} batalhões
            </span>
          </div>

          {/* Contacts Grid Cards */}
          {filteredContacts.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
              <Building2 size={40} className="mx-auto text-slate-700" />
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Nenhum Batalhão Encontrado</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Tente alterar o termo de busca ou o filtro de categoria selecionado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredContacts.map((contact) => {
                const isSelected = selectedIds.includes(contact.id);
                const isCustom = contact.id.startsWith('custom-');

                return (
                  <div
                    key={contact.id}
                    className={`group bg-slate-900 border rounded-2xl p-4 transition-all relative flex flex-col justify-between ${
                      isSelected 
                        ? 'border-red-500/80 bg-red-950/10 shadow-lg shadow-red-950/20 ring-1 ring-red-500/20' 
                        : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-850/60'
                    }`}
                  >
                    <div>
                      {/* Top Row: OPM Name & Category Badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(contact.id)}
                            className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer"
                          />
                          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-tight group-hover:text-red-400 transition-colors">
                            {contact.opm}
                          </h3>
                        </div>

                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          contact.category === 'BAEP' ? 'bg-amber-950/40 border-amber-800/50 text-amber-400' :
                          contact.category === 'BPM/M' ? 'bg-blue-950/40 border-blue-800/50 text-blue-400' :
                          contact.category === 'BPM/I' ? 'bg-purple-950/40 border-purple-800/50 text-purple-400' :
                          contact.category === 'Especializado' ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400' :
                          'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                          {contact.category}
                        </span>
                      </div>

                      {/* Region / Description */}
                      {contact.region && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mb-3 pl-6">
                          <MapPin size={12} className="text-slate-600 shrink-0" />
                          <span className="truncate">{contact.region}</span>
                        </div>
                      )}

                      {/* Email Display Box */}
                      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2 font-mono text-xs text-slate-300 hover:border-slate-700 transition-colors">
                        <span className="truncate selection:bg-red-600 selection:text-white" title={contact.email}>
                          {contact.email}
                        </span>
                        <button
                          onClick={() => copySingleEmail(contact)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors border border-slate-800 shrink-0"
                          title="Copiar e-mail"
                        >
                          {copiedId === contact.id ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 mt-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-red-400 uppercase tracking-wider transition-colors"
                          title="Enviar e-mail via cliente nativo"
                        >
                          <Mail size={12} />
                          Enviar E-mail
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedForDraft(contact)}
                          className="flex items-center gap-1 text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider transition-colors"
                        >
                          <FileText size={12} />
                          Gerar Minuta
                        </button>

                        {isCustom && (
                          <button
                            onClick={() => handleDeleteCustom(contact.id)}
                            className="text-slate-600 hover:text-rose-400 p-1 transition-colors"
                            title="Excluir contato personalizado"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* MODAL: NOVO CONTATO PERSONALIZADO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Shield size={20} className="text-red-500" />
                <h3 className="font-bold text-slate-100 uppercase text-sm tracking-tight">Adicionar Batalhão / OPM</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomContact} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nome da OPM / Batalhão *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 55º BPM/M ou Companhia X"
                  value={newOpm}
                  onChange={(e) => setNewOpm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  E-mail Institucional (@policiamilitar.sp.gov.br) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@policiamilitar.sp.gov.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-red-500"
                  >
                    <option value="BPM/M">BPM/M (Capital/Metro)</option>
                    <option value="BPM/I">BPM/I (Interior)</option>
                    <option value="BAEP">BAEP</option>
                    <option value="Especializado">Especializado</option>
                    <option value="Comando/Ensino">Comando / Ensino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Região / Observação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Zona Norte, Campinas..."
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-red-500 shadow-lg shadow-red-950/40"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OVER / MODAL: GERADOR DE MINUTA DE E-MAIL / OFÍCIO PARA O BATALHÃO */}
      {selectedForDraft && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-purple-400" />
                <div>
                  <h3 className="font-bold text-slate-100 uppercase text-sm tracking-tight">Gerador de Minuta para {selectedForDraft.opm}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedForDraft.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedForDraft(null)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Número do Processo
                </label>
                <input
                  type="text"
                  placeholder="0000000-00.2023.8.26.0050"
                  value={draftProcesso}
                  onChange={(e) => setDraftProcesso(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Objeto / Nome do Policial Militar
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cmt 1º Sgt PM Fulano de Tal"
                  value={draftPM}
                  onChange={(e) => setDraftPM(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Assunto do E-mail
              </label>
              <input
                type="text"
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex-1 flex flex-col space-y-1 min-h-[180px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Texto Formatado para Envio
              </label>
              <textarea
                readOnly
                value={generatedDraftText}
                className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 outline-none custom-scrollbar resize-none selection:bg-purple-600 selection:text-white"
              />
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-800">
              <a
                href={`mailto:${selectedForDraft.email}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(generatedDraftText)}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                <ExternalLink size={14} />
                Abrir Cliente de E-mail
              </a>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedForDraft(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-slate-700"
                >
                  Fechar
                </button>
                <button
                  onClick={copyDraft}
                  className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-purple-500 shadow-lg shadow-purple-950/40"
                >
                  {draftCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {draftCopied ? "Copiado!" : "Copiar Texto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BatalhoesContactsTool;
