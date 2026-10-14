
import React from 'react';
import { Palette, Type, Layout, MousePointerClick, Box, Sidebar, ArrowRight, Printer, Code2, Database, BrainCircuit, Cpu } from 'lucide-react';

const LayoutDocs: React.FC = () => {
  
  const ColorSwatch = ({ name, classColor, hex }: { name: string, classColor: string, hex?: string }) => (
    <div className="flex flex-col gap-2 break-inside-avoid page-break-inside-avoid">
      <div className={`h-16 w-full rounded-xl shadow-lg border border-white/10 ${classColor} print:border-2 print:border-gray-300 print:shadow-none print:!bg-none`}>
         {/* Fallback visual for print */}
         <div className="hidden print:block w-full h-full flex items-center justify-center text-[10px] font-mono text-gray-400">
            {name}
         </div>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-200 print:text-black">{name}</p>
        <p className="text-[10px] text-slate-500 font-mono print:text-gray-600">{classColor.replace('bg-', '')}</p>
        {hex && <p className="text-[10px] text-slate-600 font-mono print:text-gray-500">{hex}</p>}
      </div>
    </div>
  );

  const LibraryCard = ({ name, version, type, description, icon }: { name: string, version: string, type: string, description: string, icon: React.ReactNode }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4 break-inside-avoid page-break-inside-avoid print:border-gray-300 print:bg-white">
        <div className="p-2 bg-slate-800 rounded-lg text-indigo-400 print:bg-gray-100 print:text-black print:border print:border-gray-200">
            {icon}
        </div>
        <div>
            <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-slate-100 print:text-black">{name}</h4>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono border border-slate-700 print:border-gray-400 print:bg-white print:text-black">{version}</span>
            </div>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 print:text-gray-600">{type}</p>
            <p className="text-xs text-slate-400 leading-relaxed print:text-black">{description}</p>
        </div>
    </div>
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* Estilos de Impressão Robustos - Correção para PDF */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          
          /* RESET TOTAL DO LAYOUT PARA IMPRESSÃO */
          html, body {
            background-color: white !important;
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Resetar containers do React e App.tsx */
          #root, #root > div {
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            background-color: white !important;
          }

          /* Ocultar elementos de UI da App Shell */
          header, nav, aside, .no-print {
            display: none !important;
          }

          /* Garantir visibilidade do conteúdo da doc */
          #printable-docs {
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background-color: white !important;
            color: black !important;
            display: block !important;
          }

          /* Reset de Cores de Texto */
          h1, h2, h3, h4, h5, p, span, div, label, li {
            color: black !important;
            text-shadow: none !important;
          }
          
          .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-400, .text-slate-500, .text-indigo-400 {
            color: #222 !important;
          }

          /* Reset de Backgrounds Escuros */
          .bg-slate-900, .bg-slate-950, .bg-slate-800, .bg-indigo-600 {
            background-color: transparent !important;
            border-color: #ccc !important;
            box-shadow: none !important;
            color: black !important;
          }

          /* Forçar bordas para estrutura */
          .border-slate-800, .border-slate-700 {
            border-color: #ddd !important;
            border-width: 1px !important;
            border-style: solid !important;
          }

          /* Layout */
          .grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important; /* Forçar 2 colunas no print para economizar espaço */
            gap: 20px !important;
          }
          
          /* Page Breaks */
          section {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
          }
        }
      `}</style>

      {/* Sidebar de Navegação da Doc - Oculta na impressão */}
      <div className="w-[300px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar no-print">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-800 rounded-lg text-white border border-slate-700">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-white">Design System</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Guia de Estilo V1.0</p>
          </div>
        </div>

        <nav className="space-y-1">
          {[
            { label: 'Cores e Temas', icon: <Palette size={16}/> },
            { label: 'Tipografia', icon: <Type size={16}/> },
            { label: 'Estrutura e Grid', icon: <Layout size={16}/> },
            { label: 'Componentes UI', icon: <Box size={16}/> },
            { label: 'Tecnologias', icon: <Code2 size={16}/> },
          ].map((item, idx) => (
            <button key={idx} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all">
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-slate-950 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400 leading-relaxed">
            Este aplicativo utiliza <b>Tailwind CSS</b> com uma paleta customizada baseada no <i>Slate</i> para o tema escuro.
          </p>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div id="printable-docs" className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-slate-950 print:bg-white">
        <div className="max-w-5xl mx-auto space-y-16">
          
          {/* Header & Export Button */}
          <div className="flex items-end justify-between border-b border-slate-800 pb-8 mb-8 no-print">
             <div>
                <h1 className="text-4xl font-black text-slate-100 mb-2 tracking-tight">Identidade Visual do MPSP App</h1>
                <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                  Documentação técnica de layout, cores e componentes para desenvolvimento e manutenção.
                </p>
             </div>
             <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-indigo-900/20 transition-all transform active:scale-95"
             >
                <Printer size={18} /> Exportar Guia (PDF)
             </button>
          </div>

          {/* Versão de Impressão do Header (Só aparece no PDF) */}
          <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
             <h1 className="text-3xl font-black uppercase text-black mb-1">MPSP Application Design System</h1>
             <p className="text-sm text-gray-600 font-mono">Versão 1.0.0 • Documentação Técnica & Stack Tecnológico</p>
          </div>

          {/* Cores */}
          <section className="space-y-6 break-inside-avoid page-break-inside-avoid">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-800 print:border-gray-200">
              <Palette className="text-slate-500 print:text-black" />
              <h2 className="text-2xl font-bold text-slate-200 print:text-black">Paleta de Cores</h2>
            </div>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 print:text-gray-600">Base (Slate - Dark Theme)</h3>
                <div className="grid grid-cols-6 gap-4">
                  <ColorSwatch name="Background" classColor="bg-slate-950" hex="#020617" />
                  <ColorSwatch name="Surface" classColor="bg-slate-900" hex="#0f172a" />
                  <ColorSwatch name="Surface Highlight" classColor="bg-slate-800" hex="#1e293b" />
                  <ColorSwatch name="Border" classColor="bg-slate-700" hex="#334155" />
                  <ColorSwatch name="Text Secondary" classColor="bg-slate-500" hex="#64748b" />
                  <ColorSwatch name="Text Primary" classColor="bg-slate-100" hex="#f1f5f9" />
                </div>
              </div>

              <div className="break-inside-avoid page-break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 print:text-gray-600">Semântica & Identidade</h3>
                <div className="grid grid-cols-6 gap-4">
                  <ColorSwatch name="Brand Primary" classColor="bg-red-600" />
                  <ColorSwatch name="Action / Success" classColor="bg-green-600" />
                  <ColorSwatch name="Warning / Edit" classColor="bg-amber-500" />
                  <ColorSwatch name="Info / Tech" classColor="bg-blue-500" />
                  <ColorSwatch name="Legal / Deep" classColor="bg-violet-600" />
                  <ColorSwatch name="System / Teal" classColor="bg-teal-500" />
                </div>
              </div>
            </div>
          </section>

          {/* Tipografia */}
          <section className="space-y-6 break-inside-avoid page-break-inside-avoid">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-800 print:border-gray-200">
              <Type className="text-slate-500 print:text-black" />
              <h2 className="text-2xl font-bold text-slate-200 print:text-black">Tipografia</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-slate-500 font-mono mb-2 print:text-gray-500">font-sans (Inter)</p>
                  <h1 className="text-4xl font-black text-slate-100 print:text-black">Heading 1 Display</h1>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-mono mb-2 print:text-gray-500">text-2xl font-bold</p>
                  <h2 className="text-2xl font-bold text-slate-100 print:text-black">Heading 2 Title</h2>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-mono mb-2 print:text-gray-500">text-lg font-medium</p>
                  <h3 className="text-lg font-medium text-slate-100 print:text-black">Subtitle Standard</h3>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-mono mb-2 print:text-gray-500">text-sm text-slate-400</p>
                  <p className="text-sm text-slate-400 leading-relaxed print:text-black">
                    Este é o corpo de texto padrão para descrições e parágrafos longos. A cor slate-400 garante conforto visual sobre o fundo escuro.
                  </p>
                </div>
              </div>

              <div className="space-y-6 p-6 bg-slate-900 rounded-2xl border border-slate-800 break-inside-avoid page-break-inside-avoid print:bg-white print:border-gray-300">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 print:text-gray-600">Estilos Especiais</h3>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest print:text-gray-500">Label (Formulários)</p>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 print:bg-white print:border-gray-300">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest print:text-black">Nome Completo</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest print:text-gray-500">Tag / Badge</p>
                  <div className="flex gap-2">
                    <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-700 print:border-gray-400 print:text-black">Padrão</span>
                    <span className="bg-red-900/30 text-red-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-red-900/50 print:border-red-500 print:text-red-700">Urgente</span>
                    <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-green-900/50 print:border-green-500 print:text-green-700">Concluído</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Componentes */}
          <section className="space-y-6 break-inside-avoid page-break-inside-avoid">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-800 print:border-gray-200">
              <Box className="text-slate-500 print:text-black" />
              <h2 className="text-2xl font-bold text-slate-200 print:text-black">Componentes UI</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Botões */}
              <div className="space-y-4 break-inside-avoid page-break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest print:text-gray-600">Botões</h3>
                <div className="flex flex-col gap-3">
                  <button className="bg-slate-100 hover:bg-white text-slate-900 py-3 px-6 rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 print:border print:border-black">
                    Botão Primário (Light) <ArrowRight size={16} />
                  </button>
                  <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-6 rounded-xl font-bold uppercase text-xs tracking-widest transition-all border border-slate-700 flex items-center justify-center gap-2 print:text-black print:border-black">
                    Botão Secundário (Dark)
                  </button>
                  <button className="bg-red-600 hover:bg-red-500 text-white py-3 px-6 rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 print:text-black print:border-red-600">
                    Ação de Marca (Red)
                  </button>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-4 break-inside-avoid page-break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest print:text-gray-600">Campos de Entrada</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1 print:text-gray-600">Input Padrão</label>
                    <input type="text" placeholder="Digite algo..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-slate-500 outline-none transition-all placeholder-slate-500 text-slate-200 print:bg-white print:border-gray-400 print:text-black" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1 print:text-gray-600">Input com Ícone e Foco</label>
                    <div className="relative group">
                      <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-500 transition-colors print:text-black" size={16} />
                      <input type="text" placeholder="Foco ativo..." className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all placeholder-slate-600 text-slate-100 print:bg-white print:border-gray-400 print:text-black" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-4 break-inside-avoid page-break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest print:text-gray-600">Card Padrão</h3>
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-start gap-4 print:bg-white print:border-gray-300 print:shadow-none">
                   <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 text-slate-300 print:bg-gray-100 print:border-gray-300 print:text-black">
                      <Layout size={24} />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-200 mb-1 print:text-black">Estrutura de Card</h3>
                      <p className="text-sm text-slate-500 leading-relaxed print:text-black">
                        Os cards usam `bg-slate-900`, borda `border-slate-800` e arredondamento `rounded-3xl` para criar uma aparência moderna e suave. Sombras `shadow-xl` dão profundidade.
                      </p>
                   </div>
                </div>
            </div>
          </section>

          {/* Estrutura */}
          <section className="space-y-6 break-inside-avoid page-break-inside-avoid">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-800 print:border-gray-200">
              <Layout className="text-slate-500 print:text-black" />
              <h2 className="text-2xl font-bold text-slate-200 print:text-black">Estrutura do Layout</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 print:bg-white print:border-gray-300">
                  <div className="flex items-center gap-2 text-slate-300 font-bold uppercase text-xs tracking-widest print:text-black">
                     <Sidebar size={16} /> Sidebar (Menu/Form)
                  </div>
                  <p className="text-xs text-slate-500 print:text-black">
                     Fixo à esquerda ou recolhível. Largura fixa (ex: `w-[340px]`). Responsável pela entrada de dados primária ou navegação contextual.
                  </p>
                  <div className="h-20 bg-slate-800 rounded-lg border border-slate-700 border-dashed flex items-center justify-center text-[10px] text-slate-500 print:bg-gray-50 print:text-black print:border-gray-400">Sidebar Area</div>
               </div>

               <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 lg:col-span-2 print:bg-white print:border-gray-300">
                  <div className="flex items-center gap-2 text-slate-300 font-bold uppercase text-xs tracking-widest print:text-black">
                     <Layout size={16} /> Main Content (Canvas)
                  </div>
                  <p className="text-xs text-slate-500 print:text-black">
                     Área fluida (`flex-1`) com overflow controlado (`overflow-y-auto`). Background geralmente mais claro (`bg-slate-100` em ferramentas de visualização) ou escuro (`bg-slate-950` em dashboards) para contraste.
                  </p>
                  <div className="h-20 bg-slate-950 rounded-lg border border-slate-800 border-dashed flex items-center justify-center text-[10px] text-slate-500 print:bg-gray-50 print:text-black print:border-gray-400">Main Canvas Area</div>
               </div>
            </div>
          </section>

          {/* Tecnologias e Bibliotecas */}
          <section className="space-y-6 break-inside-avoid page-break-inside-avoid">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-800 print:border-gray-200">
              <Code2 className="text-slate-500 print:text-black" />
              <h2 className="text-2xl font-bold text-slate-200 print:text-black">Tecnologias & Bibliotecas</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LibraryCard 
                    name="React" 
                    version="^19.2.3" 
                    type="Frontend Core" 
                    description="Biblioteca principal para construção da interface de usuário baseada em componentes funcionais e Hooks."
                    icon={<Cpu size={24}/>}
                />
                <LibraryCard 
                    name="Tailwind CSS" 
                    version="CDN" 
                    type="Estilização" 
                    description="Framework CSS utilitário utilizado para design responsivo, temas escuros e customização rápida."
                    icon={<Palette size={24}/>}
                />
                <LibraryCard 
                    name="Lucide React" 
                    version="^0.561.0" 
                    type="Ícones" 
                    description="Coleção de ícones SVG leves e consistentes utilizados em todos os botões e menus."
                    icon={<MousePointerClick size={24}/>}
                />
                <LibraryCard 
                    name="Google GenAI SDK" 
                    version="^1.34.0" 
                    type="Inteligência Artificial" 
                    description="SDK oficial para integração com modelos Gemini (Flash/Pro) para processamento de texto e extração de dados."
                    icon={<BrainCircuit size={24}/>}
                />
                <LibraryCard 
                    name="Supabase JS" 
                    version="2.39.8" 
                    type="Backend / Auth" 
                    description="Cliente para conexão com banco de dados PostgreSQL e autenticação (Atualmente mockado no cliente)."
                    icon={<Database size={24}/>}
                />
            </div>
          </section>

          <div className="py-12 text-center border-t border-slate-800 break-inside-avoid page-break-inside-avoid print:border-gray-200">
             <p className="text-slate-600 text-xs font-mono uppercase print:text-black">MPSP Design System • v1.0.0 • Internal Use Only</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LayoutDocs;
