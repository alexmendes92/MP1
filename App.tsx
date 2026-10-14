
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SidebarForm from './components/SidebarForm';
import CaseInfoBar from './components/CaseInfoBar';
import DocumentPreview from './components/DocumentPreview';
import WelcomeScreen from './components/WelcomeScreen';
import Dashboard from './components/Dashboard';
import SisDigitalTool from './components/SisDigitalTool';
import OficioTool from './components/OficioTool';
import AnppTool from './components/AnppTool';
import MultaPenalTool from './components/MultaPenalTool';
import ArchivingPromotionTool from './components/ArchivingPromotionTool';
import ActivityLogTool from './components/ActivityLogTool';
import DatabaseManagerTool from './components/DatabaseManagerTool';
import ActivityAnalysisTool from './components/ActivityAnalysisTool';
import LayoutDocs from './components/LayoutDocs';
import ProvidenciasTool from './components/ProvidenciasTool';
import NoticiaFatoProcedureTool from './components/NoticiaFatoProcedureTool';
import ArchivingNotificationTool from './components/ArchivingNotificationTool';
import ArchivingHelp from './components/ArchivingHelp';
import UserGuide from './components/UserGuide';
import PartyFinanceTool from './components/PartyFinanceTool';
import DatabaseSchemaDocs from './components/DatabaseSchemaDocs';
import PromotorReportTool from './components/PromotorReportTool';
import DespachoAgendamentoTool from './components/DespachoAgendamentoTool';
import BatalhoesContactsTool from './components/BatalhoesContactsTool';
import { RequerimentoJuntadaTool } from './components/RequerimentoJuntadaTool';
import BatchArchivingNotificationTool from './components/BatchArchivingNotificationTool';
import { BatchNiResearchTool } from './components/BatchNiResearchTool';
import { Person, CaseData, AppScreen, Activity, PromotoriaDef, Gender } from './types';

// ESCALA DETALHADA 4ª PJ Crim - Baseada no JSON fornecido
const MOCK_PROMOTORIAS: PromotoriaDef[] = [
    { id: 61, label: '61º Promotor de Justiça', schedule: [{ name: 'Nina Pereira Malheiros', gender: 'F', start: 1, end: 31 }] },
    { id: 62, label: '62º Promotor de Justiça', schedule: [{ name: 'Pedro Henrique da Silva Rosa', gender: 'M', start: 1, end: 31 }] },
    { id: 63, label: '63º Promotor de Justiça', schedule: [{ name: 'Michaela Carli Gomes', gender: 'F', start: 1, end: 31 }] },
    { id: 64, label: '64º Promotor de Justiça', schedule: [{ name: 'Tânia Serra Azul Guimaraes Biazolli', gender: 'F', start: 1, end: 31 }] },
    { id: 65, label: '65º Promotor de Justiça', schedule: [{ name: 'Paulo Henrique Castex', gender: 'M', start: 1, end: 31 }] },
    { id: 66, label: '66º Promotor de Justiça', schedule: [{ name: 'Martha de Camargo Duarte Dias', gender: 'F', start: 1, end: 31 }] },
    { id: 67, label: '67º Promotor de Justiça', schedule: [{ name: 'Vera Lorza Duarte', gender: 'F', start: 1, end: 31 }] },
    { id: 68, label: '68º Promotor de Justiça', schedule: [{ name: 'Beatriz Lotufo Oliveira', gender: 'F', start: 1, end: 31 }] },
    { id: 69, label: '69º Promotor de Justiça', schedule: [
        { name: 'Adriana Ribeiro Soares de Morais', gender: 'F', start: 1, end: 22 },
        { name: 'Simone de Divitiis Perez', gender: 'F', start: 23, end: 31 }
    ]},
    { id: 70, label: '70º Promotor de Justiça', schedule: [{ name: 'Barbara da Cunha Defaveri', gender: 'F', start: 1, end: 31 }] },
    { id: 71, label: '71º Promotor de Justiça', schedule: [{ name: 'Leonardo D\'Angelo Vargas Pereira', gender: 'M', start: 1, end: 31 }] },
    { id: 72, label: '72º Promotor de Justiça', schedule: [{ name: 'Pedro Henrique da Silva Rosa', gender: 'M', start: 1, end: 31 }] },
    { id: 73, label: '73º Promotor de Justiça', schedule: [{ name: 'Daniel Fontana', gender: 'M', start: 1, end: 31 }] },
    { id: 74, label: '74º Promotor de Justiça', schedule: [{ name: 'Pedro de Andrade Khouri Santos', gender: 'M', start: 1, end: 31 }] },
    { id: 75, label: '75º Promotor de Justiça', schedule: [{ name: 'Fernanda Queiroz Karan Franco', gender: 'F', start: 1, end: 31 }] },
    { id: 76, label: '76º Promotor de Justiça', schedule: [{ name: 'Laurani Assis de Figueiredo', gender: 'F', start: 1, end: 31 }] },
    { id: 77, label: '77º Promotor de Justiça', schedule: [
        { name: 'Solange Aparecida Cruz', gender: 'F', start: 1, end: 17 },
        { name: 'Maria Carolina Pera Joao Moreira Viegas', gender: 'F', start: 18, end: 31 }
    ]},
    { id: 78, label: '78º Promotor de Justiça', schedule: [{ name: 'Claudio Henrique Bastos Giannini', gender: 'M', start: 1, end: 31 }] },
    { id: 79, label: '79º Promotor de Justiça', schedule: [{ name: 'Margareth Ferraz França', gender: 'F', start: 1, end: 31 }] },
    { id: 80, label: '80º Promotor de Justiça', schedule: [{ name: 'Tais Servilha Ferrari', gender: 'F', start: 1, end: 31 }] }
];

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    try {
      const saved = localStorage.getItem('mpsp_currentScreen');
      if (saved) return saved as AppScreen;
    } catch (e) {}
    return 'DASHBOARD';
  });

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const [people, setPeople] = useState<Person[]>(() => {
    try {
      const saved = localStorage.getItem('mpsp_people');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [caseData, setCaseData] = useState<CaseData>(() => {
    try {
      const saved = localStorage.getItem('mpsp_caseData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cargo?.includes('79') || parsed.promotor?.includes('Davi')) {
          parsed.promotor = 'Margareth Ferraz França';
        }
        return parsed;
      }
    } catch (e) {}
    return {
      numeroProcesso: '',
      cargo: '',
      promotor: '',
      dataAudiencia: '',
      urgente: false
    };
  });

  const [promotorias, setPromotorias] = useState<PromotoriaDef[]>(MOCK_PROMOTORIAS);

  // Sync currentScreen to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mpsp_currentScreen', currentScreen);
    } catch (e) {}
  }, [currentScreen]);

  // Sync people to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mpsp_people', JSON.stringify(people));
    } catch (e) {}
  }, [people]);

  // Sync caseData to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mpsp_caseData', JSON.stringify(caseData));
    } catch (e) {}
  }, [caseData]);

  useEffect(() => {
    setTimeout(() => {
        setLoadingSession(false);
    }, 500);
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('DASHBOARD');
  };

  const handleLogin = () => {
      setIsLoggedIn(true);
  };

  const [resetKey, setResetKey] = useState(0);

  const handleAddPerson = (person: Person) => {
    setPeople(prev => [...prev, person]);
  };

  const handleUpdatePerson = (updatedPerson: Person) => {
    setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
  };

  const handleUpdateCaseData = (updates: Partial<CaseData>) => {
    setCaseData(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleRemovePerson = (id: string) => {
    setPeople(prev => prev.filter(p => p.id !== id));
  };

  const handleResetAll = () => {
    setPeople([]);
    const emptyCaseData = {
      numeroProcesso: '',
      cargo: '',
      promotor: '',
      dataAudiencia: '',
      urgente: false
    };
    setCaseData(emptyCaseData);
    setResetKey(prev => prev + 1);
    try {
      localStorage.removeItem('mpsp_people');
      localStorage.setItem('mpsp_caseData', JSON.stringify(emptyCaseData));
    } catch (e) {}
  };

  const handleOpenActivity = (activity: Activity) => {
    const updatedCaseData = {
      numeroProcesso: activity.numeroProcesso,
      cargo: activity.cargo,
      promotor: activity.promotor,
      dataAudiencia: '',
      urgente: false
    };
    
    setCaseData(prev => ({
      ...prev,
      ...updatedCaseData
    }));

    try {
      localStorage.setItem('mpsp_caseData', JSON.stringify(updatedCaseData));
    } catch (e) {}

    const tipoLower = (activity.tipo || '').toLowerCase();
    let targetScreen: AppScreen = 'DASHBOARD';

    if (tipoLower.includes('juntada') || tipoLower.includes('requerimento de juntada')) {
      targetScreen = 'REQUERIMENTO_JUNTADA';
    } else if (tipoLower.includes('pesquisa') || tipoLower.includes('ni')) {
      targetScreen = 'PESQUISA_NI';
    } else if (tipoLower.includes('multa')) {
      targetScreen = 'MULTA_PENAL';
    } else if (tipoLower.includes('ofício') || tipoLower.includes('oficio')) {
      targetScreen = 'OFICIO';
    } else if (tipoLower.includes('sisdigital') || tipoLower.includes('notícia de fato') || tipoLower.includes('noticia')) {
      targetScreen = 'SISDIGITAL';
    } else if (tipoLower.includes('anpp')) {
      targetScreen = 'ANPP';
    } else if (tipoLower.includes('agendamento') || tipoLower.includes('despacho') || tipoLower.includes('oitiva')) {
      targetScreen = 'DESPACHO_AGENDAMENTO';
    } else if (tipoLower.includes('intimação') || tipoLower.includes('intimacao')) {
      targetScreen = 'INTIMACAO_ARQUIVAMENTO';
    } else if (tipoLower.includes('providência') || tipoLower.includes('providencia') || tipoLower.includes('certidão') || tipoLower.includes('certidao')) {
      targetScreen = 'PROVIDENCIAS';
    } else if (tipoLower.includes('promoção') || tipoLower.includes('promocao') || tipoLower.includes('arquivamento')) {
      targetScreen = 'PROMOCAO_ARQUIVAMENTO';
    } else {
      targetScreen = 'DASHBOARD';
    }

    setCurrentScreen(targetScreen);
    try {
      localStorage.setItem('mpsp_currentScreen', targetScreen);
    } catch (e) {}
  };

  const handleAnalyzeActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setCurrentScreen('ACTIVITY_ANALYSIS');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'DASHBOARD': return <Dashboard onSelectScreen={setCurrentScreen} />;
      
      case 'PESQUISA_NI':
        return (
          <main className="flex flex-1 overflow-hidden animate-in fade-in duration-700">
            <SidebarForm 
                key={resetKey}
                onAddPerson={handleAddPerson} 
                people={people}
                onRemovePerson={handleRemovePerson}
                onUpdatePerson={handleUpdatePerson}
                onUpdateCaseData={handleUpdateCaseData}
                caseData={caseData}
                promotorias={promotorias}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
              <CaseInfoBar 
                caseData={caseData} 
                setCaseData={setCaseData} 
                promotorias={promotorias} 
                onReset={handleResetAll}
              />
              <div className="flex-1 p-6 lg:p-10 overflow-hidden bg-slate-950 relative">
                 <div className="h-full w-full max-w-[1400px] mx-auto">
                    <DocumentPreview 
                        caseData={caseData} 
                        people={people} 
                        onReset={handleResetAll}
                        onNavigateToJuntada={() => setCurrentScreen('REQUERIMENTO_JUNTADA')}
                    />
                 </div>
              </div>
            </div>
          </main>
        );

      case 'SISDIGITAL': return <SisDigitalTool promotorias={promotorias} caseData={caseData} onUpdateCaseData={handleUpdateCaseData} />;
      case 'OFICIO': return <OficioTool promotorias={promotorias} caseData={caseData} />;
      case 'ANPP': return <AnppTool promotorias={promotorias} caseData={caseData} people={people} />;
      case 'MULTA_PENAL': return <MultaPenalTool />;
      case 'PROMOCAO_ARQUIVAMENTO': return <ArchivingPromotionTool />;
      case 'ACTIVITIES': return <ActivityLogTool onOpenActivity={handleOpenActivity} onAnalyzeActivity={handleAnalyzeActivity} promotorias={promotorias} />;
      case 'DATABASE': return <DatabaseManagerTool />;
      case 'ACTIVITY_ANALYSIS': return <ActivityAnalysisTool activity={selectedActivity} onBack={() => setCurrentScreen('ACTIVITIES')} />;
      case 'LAYOUT_DOCS': return <LayoutDocs />;
      case 'PROVIDENCIAS': return <ProvidenciasTool caseData={caseData} />;
      case 'NOTICIA_FATO_PROCEDURE': return <NoticiaFatoProcedureTool />;
      case 'LOTE_NOTIFICACAO_ARQUIVAMENTO': return <BatchArchivingNotificationTool promotorias={promotorias} onNavigateToSingle={() => setCurrentScreen('INTIMACAO_ARQUIVAMENTO')} />;
      case 'LOTE_PESQUISA_NI': 
        return (
          <BatchNiResearchTool 
            onBack={() => setCurrentScreen('DASHBOARD')} 
            onLoadCaseToSingleScreen={(item) => {
              setCaseData(prev => ({
                ...prev,
                numeroProcesso: item.numeroProcesso,
                cargo: item.cargo || prev.cargo || '71º Promotor de Justiça Criminal',
                promotor: item.promotor || prev.promotor || 'Leonardo D’Angelo Vargas Pereira',
                dataAudiencia: item.dataAudiencia || '',
                urgente: Boolean(item.urgente),
              }));
              setPeople(item.partes.map(p => ({
                id: p.id || crypto.randomUUID(),
                nome: p.nome || '',
                folha: p.folha || '01',
                nacionalidade: p.nacionalidade || 'Brasileiro',
                cpf: p.cpf || '',
                rg: p.rg || '',
                dataNascimento: p.dataNascimento || '',
                pai: p.pai || '',
                mae: p.mae || '',
                endereco: p.endereco || '',
                telefone: p.telefone || '',
                email: p.email || '',
                tipoParte: p.tipoParte === 'Réu' ? 'Investigado' : (p.tipoParte as any) || 'Vítima'
              })));
              setCurrentScreen('PESQUISA_NI');
            }}
          />
        );
      case 'INTIMACAO_ARQUIVAMENTO': return <ArchivingNotificationTool promotorias={promotorias} onOpenHelp={() => setCurrentScreen('ARCHIVING_HELP')} />;
      case 'ARCHIVING_HELP': return <ArchivingHelp onBack={() => setCurrentScreen('INTIMACAO_ARQUIVAMENTO')} />;
      case 'USER_GUIDE': return <UserGuide onBack={() => setCurrentScreen('DASHBOARD')} />;
      case 'PARTY_FINANCE': return <PartyFinanceTool />;
      case 'DB_SCHEMA_DOCS': return <DatabaseSchemaDocs onBack={() => setCurrentScreen('DASHBOARD')} />;
      case 'RELATORIO_CGMP': return <PromotorReportTool />;
      
      // Rotas com Sincronização Completa
      case 'DESPACHO_AGENDAMENTO': return <DespachoAgendamentoTool promotorias={promotorias} caseData={caseData} people={people} />;
      case 'BATALHOES_CONTACTS': return <BatalhoesContactsTool />;
      case 'REQUERIMENTO_JUNTADA': return <RequerimentoJuntadaTool promotorias={promotorias} caseData={caseData} people={people} onNavigateScreen={setCurrentScreen} />;

      default:
        return (
          <div className="flex-1 flex items-center justify-center bg-slate-950">
             <div className="text-center p-12 bg-slate-900 rounded-3xl shadow-xl border border-slate-800">
                <h2 className="text-2xl font-bold text-slate-100 mb-4">Ferramenta em Desenvolvimento</h2>
                <p className="text-slate-500 mb-8">A ferramenta {currentScreen} está sendo integrada.</p>
                <button 
                  onClick={() => setCurrentScreen('DASHBOARD')}
                  className="bg-slate-100 text-slate-900 px-8 py-3 rounded-xl font-bold"
                >
                  Voltar ao Dashboard
                </button>
             </div>
          </div>
        );
    }
  };

  if (loadingSession) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <WelcomeScreen onLogin={handleLogin} />;
  }

  const displayName = 'Alex Santana Mendes'; 

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100 selection:bg-red-900 selection:text-white">
      <Header 
        userName={displayName} 
        showBackButton={currentScreen !== 'DASHBOARD'} 
        currentScreen={currentScreen}
        onNavigateScreen={setCurrentScreen}
        onBack={() => {
            if (currentScreen === 'ACTIVITY_ANALYSIS') setCurrentScreen('ACTIVITIES');
            else if (currentScreen === 'ARCHIVING_HELP') setCurrentScreen('INTIMACAO_ARQUIVAMENTO');
            else setCurrentScreen('DASHBOARD');
        }}
        onLogout={handleLogout}
      />
      {renderScreen()}
    </div>
  );
};

export default App;
