
import React, { useState } from 'react';
import { ArrowLeft, BookOpen, BellRing, Archive, Send, Sparkles, FileText, LayoutDashboard, Database, HelpCircle, Code2, Cpu, Eye, FileCode, Smartphone, Truck, TableProperties, Wand2, Stamp, MousePointerClick, Server, Shield, Key, Terminal } from 'lucide-react';

interface UserGuideProps {
  onBack: () => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState('INTRO');

  const MenuButton = ({ id, label, icon }: { id: string, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-widest transition-all ${activeSection === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* Sidebar Navigation */}
      <div className="w-[300px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-xl z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-white">Manual do Sistema</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Guia de Uso</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <MenuButton id="INTRO" label="Visão Geral" icon={<LayoutDashboard size={16}/>} />
          <div className="my-4 border-t border-slate-800/50"></div>
          <p className="px-4 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Módulos</p>
          <MenuButton id="ARQUIVAMENTO" label="Arquivamento (Art. 28)" icon={<BellRing size={16}/>} />
          <MenuButton id="PROMOCAO" label="Limpeza de Peças" icon={<Archive size={16}/>} />
          <MenuButton id="DATA" label="Banco de Dados" icon={<Database size={16}/>} />
          <div className="my-4 border-t border-slate-800/50"></div>
          <p className="px-4 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Técnico</p>
          <MenuButton id="DEPLOY" label="Implantação" icon={<Server size={16}/>} />
        </nav>

        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-white font-bold uppercase text-xs tracking-widest transition-colors px-4">
           <ArrowLeft size={16} /> Voltar ao App
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-slate-950 flex flex-col items-center">
        <div className="max-w-4xl w-full space-y-12">
          
          {/* INTRO SECTION */}
          {activeSection === 'INTRO' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
               <div className="text-center space-y-4">
                  <h1 className="text-4xl font-black text-slate-100 uppercase tracking-tight">Bem-vindo ao Sistema</h1>
                  <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                    Este aplicativo foi desenvolvido para otimizar o fluxo de trabalho dos Oficiais de Promotoria, automatizando tarefas repetitivas e integrando inteligência artificial.
                  </p>
               </div>

               <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                     <Sparkles className="text-amber-500 mb-4" size={24} />
                     <h3 className="font-bold text-slate-200 mb-2">IA Integrada</h3>
                     <p className="text-sm text-slate-500">Utilizamos o Google Gemini para extrair dados de documentos, gerar textos e sugerir estratégias.</p>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                     <FileText className="text-blue-500 mb-4" size={24} />
                     <h3 className="font-bold text-slate-200 mb-2">Documentos Padrão</h3>
                     <p className="text-sm text-slate-500">Geração automática de certidões, ofícios e notificações seguindo o padrão visual do MPSP.</p>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                     <Database className="text-indigo-500 mb-4" size={24} />
                     <h3 className="font-bold text-slate-200 mb-2">Dados Centralizados</h3>
                     <p className="text-sm text-slate-500">Gestão de escalas de promotores, cargos e cadastro de partes em um único lugar.</p>
                  </div>
               </div>
            </div>
          )}

          {/* ARQUIVAMENTO SECTION - DETALHADO */}
          {activeSection === 'ARQUIVAMENTO' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
               <div className="border-b border-slate-800 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-rose-600 rounded-lg text-white"><BellRing size={24} /></div>
                     <h2 className="text-3xl font-bold text-slate-100">Controle de Intimações (Art. 28)</h2>
                  </div>
                  <p className="text-slate-400 max-w-2xl">
                    Este módulo centraliza a gestão das comunicações obrigatórias às vítimas e investigados em casos de promoção de arquivamento, automatizando a extração de dados, a geração de documentos postais e a certificação nos autos.
                  </p>
               </div>

               {/* Fluxo Principal */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wand2 size={48} /></div>
                      <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">1. Cadastro Inteligente</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Não digite dados manualmente. Use a IA para colar o trecho da qualificação (do B.O. ou Denúncia) e o sistema extrai Nome, Endereço e CEP automaticamente.
                      </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><MousePointerClick size={48} /></div>
                      <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">2. Escolha do Canal</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Selecione entre WhatsApp (texto pronto), E-mail (modelo formal) ou Correios (geração de AR e Etiquetas) com um clique.
                      </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Stamp size={48} /></div>
                      <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">3. Certificação</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        O sistema gera automaticamente a Certidão de Oficial de Promotoria em formato PDF/HTML, preenchida com os dados da ação realizada.
                      </p>
                  </div>
               </div>

               {/* Detalhamento Técnico */}
               <div className="space-y-6 mt-8">
                  <h3 className="text-xl font-bold text-slate-200 border-l-4 border-rose-500 pl-4">Detalhamento das Funcionalidades</h3>
                  
                  {/* Card: SMT e Correios */}
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 flex gap-6">
                     <div className="hidden md:flex flex-col items-center gap-2 text-slate-600">
                        <Truck size={32} />
                        <div className="h-full w-px bg-slate-800"></div>
                     </div>
                     <div className="space-y-4">
                        <h4 className="text-lg font-bold text-slate-100">Integração SMT (Correios)</h4>
                        <p className="text-sm text-slate-400 leading-relaxed text-justify">
                           Para notificações em massa ou via correio, o sistema possui um gerador de CSV compatível com o <b>Sistema de Postagem Eletrônica (SMT)</b>.
                        </p>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                           <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold text-xs uppercase tracking-widest">
                              <TableProperties size={14}/> Lógica de Processamento
                           </div>
                           <p className="text-xs text-slate-500 font-mono">
                              O algoritmo divide o endereço completo em colunas específicas exigidas pelo SMT: <br/>
                              <code>Logradouro (Rua/Av)</code> | <code>Nome do Logradouro</code> | <code>Número</code> | <code>Complemento</code> | <code>CEP</code>.
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Card: WhatsApp e Certidão */}
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 flex gap-6">
                     <div className="hidden md:flex flex-col items-center gap-2 text-slate-600">
                        <Smartphone size={32} />
                        <div className="h-full w-px bg-slate-800"></div>
                     </div>
                     <div className="space-y-4">
                        <h4 className="text-lg font-bold text-slate-100">Certidão Dinâmica (WhatsApp/E-mail)</h4>
                        <p className="text-sm text-slate-400 leading-relaxed text-justify">
                           A certidão gerada na aba "Finalização" muda dinamicamente seu texto baseada no canal utilizado.
                        </p>
                        <ul className="text-xs text-slate-400 space-y-2 mt-2">
                           <li className="flex gap-2">
                              <span className="text-green-500 font-bold">WhatsApp:</span> 
                              <span>"Certifico que comuniquei via aplicativo de mensagens no telefone (XX)..."</span>
                           </li>
                           <li className="flex gap-2">
                              <span className="text-blue-500 font-bold">E-mail:</span> 
                              <span>"Certifico que encaminhei notificação ao endereço eletrônico..."</span>
                           </li>
                           <li className="flex gap-2">
                              <span className="text-yellow-500 font-bold">Correios:</span> 
                              <span>"Certifico que expedi Carta de Notificação com AR ao endereço..."</span>
                           </li>
                        </ul>
                     </div>
                  </div>

               </div>
            </div>
          )}

          {/* PROMOCAO SECTION */}
          {activeSection === 'PROMOCAO' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
               <div className="border-b border-slate-800 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-slate-700 rounded-lg text-white"><Archive size={24} /></div>
                     <h2 className="text-3xl font-bold text-slate-100">Promoção de Arquivamento</h2>
                  </div>
                  <p className="text-slate-400">Ferramenta de limpeza e extração de texto de peças jurídicas.</p>
               </div>

               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h3 className="text-lg font-bold text-slate-200">O Problema</h3>
                     <p className="text-sm text-slate-400 leading-relaxed">
                        Copiar texto de PDFs de arquivamento (especialmente digitalizados ou com assinatura lateral) resulta em texto quebrado, com números de página e formatação suja.
                     </p>
                  </div>
                  <div className="space-y-4">
                     <h3 className="text-lg font-bold text-slate-200">A Solução</h3>
                     <p className="text-sm text-slate-400 leading-relaxed">
                        Esta ferramenta usa IA para ler o PDF, ignorar as margens de assinatura digital ("Assinado por..."), remover cabeçalhos repetitivos e unir parágrafos quebrados.
                     </p>
                     <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-2">Resultado</p>
                        <p className="font-serif text-slate-300 text-sm">Texto limpo, contínuo e pronto para colar no Word.</p>
                     </div>
                  </div>
               </div>

               {/* TECHNICAL DETAILS */}
               <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mt-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                  
                  <h3 className="text-xl font-bold text-slate-100 mb-8 flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-indigo-900/30 rounded-lg border border-indigo-500/30 text-indigo-400"><Code2 size={20}/></div>
                    Funcionamento Técnico (Engine)
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-8 relative z-10">
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <Eye size={18}/>
                            <h4 className="text-xs font-black uppercase tracking-widest">1. Análise Multimodal</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed text-justify">
                           Utilizamos o modelo <b>Gemini 1.5 Pro</b> com capacidade de visão. Diferente de um OCR comum que apenas converte pixels em letras, o modelo "enxerga" o layout da página. Ele identifica visualmente que o texto na margem direita (Assinatura Digital) é um elemento periférico e não parte do corpo do texto.
                        </p>
                     </div>
                     
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <FileCode size={18}/>
                            <h4 className="text-xs font-black uppercase tracking-widest">2. Prompt Engineering</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed text-justify">
                           O prompt sistêmico contém instruções negativas rigorosas: <i>"Ignore textos verticais laterais"</i>, <i>"Remova cabeçalhos repetitivos"</i> e <i>"Concatene linhas que não terminam em pontuação final"</i>. Isso força o modelo a reconstruir a lógica sintática dos parágrafos.
                        </p>
                     </div>

                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <Cpu size={18}/>
                            <h4 className="text-xs font-black uppercase tracking-widest">3. Processamento</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed text-justify">
                           Os arquivos (PDF ou Imagem) são convertidos para Base64 no cliente e enviados diretamente para a API. O modelo processa múltiplas páginas simultaneamente, mantendo a coerência do texto que é quebrado entre o fim de uma página e o início da outra.
                        </p>
                     </div>
                  </div>
               </div>

            </div>
          )}

          {/* DEPLOY SECTION */}
          {activeSection === 'DEPLOY' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
               <div className="border-b border-slate-800 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-emerald-600 rounded-lg text-white"><Server size={24} /></div>
                     <h2 className="text-3xl font-bold text-slate-100">Guia de Implantação (Antigravity)</h2>
                  </div>
                  <p className="text-slate-400">Procedimentos técnicos para build e deploy da aplicação.</p>
               </div>

               <div className="space-y-6">
                  {/* Requisitos */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                     <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold uppercase text-xs tracking-widest">
                        <Shield size={16} /> Requisitos do Ambiente
                     </div>
                     <ul className="text-slate-300 text-sm space-y-2 list-disc list-inside">
                        <li>Node.js v18 ou superior.</li>
                        <li>Servidor Web (IIS, Nginx ou Apache) para arquivos estáticos.</li>
                        <li>Acesso à internet para chamadas à API do Google (Gemini).</li>
                     </ul>
                  </div>

                  {/* Configuração */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                     <div className="flex items-center gap-2 mb-4 text-amber-400 font-bold uppercase text-xs tracking-widest">
                        <Key size={16} /> Configuração de API Key
                     </div>
                     <p className="text-xs text-slate-400 mb-4">
                        A aplicação requer uma chave de API do Google AI Studio para funcionar (IA).
                     </p>
                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
                        <p className="text-slate-500 mb-2"># .env (na raiz do projeto)</p>
                        <p>API_KEY=sua_chave_aqui</p>
                     </div>
                  </div>

                  {/* Build Process */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                     <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold uppercase text-xs tracking-widest">
                        <Terminal size={16} /> Processo de Build
                     </div>
                     <p className="text-xs text-slate-400 mb-4">
                        Para gerar a versão de produção (arquivos otimizados):
                     </p>
                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                        <p><span className="text-blue-500">$</span> npm install</p>
                        <p><span className="text-blue-500">$</span> npm run build</p>
                     </div>
                     <p className="text-xs text-slate-400 mt-4">
                        Isso gerará uma pasta <code>dist/</code> ou <code>build/</code> contendo:
                        <br/> - <code>index.html</code> (Ponto de entrada)
                        <br/> - <code>assets/</code> (JS e CSS minificados)
                     </p>
                  </div>

                  {/* Deploy no Antigravity */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                     <div className="flex items-center gap-2 mb-4 text-indigo-400 font-bold uppercase text-xs tracking-widest">
                        <Server size={16} /> Deploy no Servidor (Antigravity)
                     </div>
                     <div className="space-y-4">
                        <p className="text-xs text-slate-400 text-justify">
                           O sistema é uma <b>Single Page Application (SPA)</b>. Isso significa que ele é composto apenas por arquivos estáticos. Não é necessário Node.js rodando no servidor de produção, apenas um servidor web capaz de servir HTML/CSS/JS.
                        </p>
                        <div className="p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl">
                           <h5 className="font-bold text-indigo-300 text-xs mb-2">Configuração de Roteamento</h5>
                           <p className="text-[10px] text-slate-400">
                              Certifique-se de configurar o servidor (ex: regras de reescrita do IIS ou <code>try_files</code> no Nginx) para redirecionar todas as requisições desconhecidas para o <code>index.html</code>. Isso permite que o React Router gerencie a navegação interna.
                           </p>
                        </div>
                     </div>
                  </div>

               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default UserGuide;
