import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, BrainCircuit, Play, Pause, Save, RotateCcw, 
  Dices, ListTodo, Trophy, Mic, ShieldCheck, 
  Hourglass, Lock, CheckCircle2, Circle, AlertOctagon,
  ArrowRight, X, Sparkles, Loader2, UserPlus, Coffee, Utensils, Volume2, VolumeX, MessageCircle, Clock
} from 'lucide-react';
import { aiClient } from "../utils/geminiClient";

// --- Types ---
type View = 'HOME' | 'MICRO_STEPS' | 'TIMER' | 'ROULETTE' | 'SAVE_CONTEXT' | 'BODY_DOUBLE' | 'DOPAMINE_MENU';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  isBoring: boolean;
}

// --- Audio Utilities ---
const playNotificationSound = (type: 'SUCCESS' | 'PING' = 'SUCCESS') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'SUCCESS') {
        // Level up sound (ascending arpeggio)
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc.start(now);
        osc.stop(now + 0.6);
    } else {
        // Ping sound (Double beep for check-in)
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.frequency.setValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.1, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.4);
    }
  } catch (e) {
    console.warn("Audio play failed", e);
  }
};

const useNoiseGenerator = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);

    const stop = () => {
        if (sourceRef.current) {
            try {
                sourceRef.current.stop();
                sourceRef.current.disconnect();
            } catch (e) {}
            sourceRef.current = null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
            audioCtxRef.current.suspend();
        }
    };

    const play = (type: 'BROWN' | 'RAIN') => {
        stop(); // Ensure previous is stopped
        
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContext();
            }
            
            const ctx = audioCtxRef.current;
            ctx.resume();
            
            const bufferSize = ctx.sampleRate * 2; // 2 seconds buffer
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            if (type === 'RAIN') { // Pink Noise approximation
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                    data[i] *= 0.11; 
                    b6 = white * 0.115926;
                }
            } else { // BROWN Noise
                let lastOut = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    lastOut = (lastOut + (0.02 * white)) / 1.02;
                    data[i] = lastOut * 3.5; 
                }
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            
            const gain = ctx.createGain();
            gain.gain.value = 0.05; // Low volume for background
            
            noise.connect(gain);
            gain.connect(ctx.destination);
            
            noise.start();
            sourceRef.current = noise;
        } catch (e) {
            console.error("Failed to play noise", e);
        }
    };

    useEffect(() => {
        return () => stop();
    }, []);

    return { play, stop };
};

const inputClass = "w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all placeholder-slate-600";
const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

// --- Component: AdhdTool ---
const AdhdTool: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('HOME');
  const [xp, setXp] = useState(1250);
  const [level, setLevel] = useState(3);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quickInput, setQuickInput] = useState('');

  // XP System
  const addXp = (amount: number) => {
    const newXp = xp + amount;
    setXp(newXp);
    // Simple level up logic: level * 1000
    if (newXp >= level * 1000) {
      setLevel(prev => prev + 1);
      playNotificationSound('SUCCESS');
    }
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (!t.completed) addXp(t.isBoring ? 50 : 20); // More XP for boring tasks
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  };

  const addTask = () => {
    if (!quickInput.trim()) return;
    setTasks(prev => [{
      id: crypto.randomUUID(),
      title: quickInput,
      completed: false,
      isBoring: false
    }, ...prev]);
    setQuickInput('');
  };

  const handleFreshStart = () => {
    if(confirm("Isso moverá todas as tarefas não concluídas para o backlog sem culpa. Pronto para recomeçar?")) {
      setTasks([]);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'MICRO_STEPS': return <MicroStepsView onBack={() => setCurrentView('HOME')} onAddXp={addXp} />;
      case 'TIMER': return <FocusTimerView onBack={() => setCurrentView('HOME')} onAddXp={addXp} />;
      case 'ROULETTE': return <RouletteView tasks={tasks.filter(t => !t.completed)} onBack={() => setCurrentView('HOME')} />;
      case 'SAVE_CONTEXT': return <ContextSaverView onBack={() => setCurrentView('HOME')} onAddXp={addXp} />;
      case 'BODY_DOUBLE': return <BodyDoubleView onBack={() => setCurrentView('HOME')} onAddXp={addXp} />;
      case 'DOPAMINE_MENU': return <DopamineMenuView onBack={() => setCurrentView('HOME')} onAddXp={addXp} />;
      default: return (
        <HomeView 
          tasks={tasks} 
          onToggle={toggleTask} 
          quickInput={quickInput} 
          setQuickInput={setQuickInput} 
          onAdd={addTask} 
          onFreshStart={handleFreshStart}
          onChangeView={setCurrentView}
        />
      );
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-950 animate-in fade-in duration-500">
      {/* Gamification Sidebar */}
      <div className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20">
        <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
          <Zap className="text-slate-900" size={24} fill="currentColor" />
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Nível</span>
          <span className="text-2xl font-black text-yellow-400">{level}</span>
        </div>

        <div className="w-2 h-32 bg-slate-800 rounded-full overflow-hidden relative">
          <div 
            className="absolute bottom-0 w-full bg-yellow-500 transition-all duration-1000"
            style={{ height: `${(xp % 1000) / 10}%` }}
          ></div>
        </div>
        
        <div className="text-[9px] font-mono text-slate-500">{xp} XP</div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {renderView()}
      </div>
    </div>
  );
};

// --- Sub-View: Home ---
const HomeView = ({ tasks, onToggle, quickInput, setQuickInput, onAdd, onFreshStart, onChangeView }: any) => {
  return (
    <div className="flex flex-col h-full p-8 max-w-5xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-100 mb-2">NeuroFocus</h1>
        <p className="text-slate-500">Sua prótese executiva para iniciar o chato e parar o legal.</p>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
        <button onClick={() => onChangeView('MICRO_STEPS')} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all text-left group">
          <BrainCircuit className="text-yellow-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
          <p className="font-bold text-slate-200 text-sm">Quebrar Tarefa</p>
          <p className="text-[10px] text-slate-500">IA para micro-passos</p>
        </button>
        <button onClick={() => onChangeView('TIMER')} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-left group">
          <Hourglass className="text-cyan-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
          <p className="font-bold text-slate-200 text-sm">Timer Visual + Som</p>
          <p className="text-[10px] text-slate-500">Só 5 min / Hiperfoco</p>
        </button>
        <button onClick={() => onChangeView('BODY_DOUBLE')} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-pink-500/50 hover:bg-pink-500/5 transition-all text-left group">
          <UserPlus className="text-pink-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
          <p className="font-bold text-slate-200 text-sm">Body Double</p>
          <p className="text-[10px] text-slate-500">Companhia Virtual</p>
        </button>
        <button onClick={() => onChangeView('ROULETTE')} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group">
          <Dices className="text-purple-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
          <p className="font-bold text-slate-200 text-sm">Roleta</p>
          <p className="text-[10px] text-slate-500">Decisão sem fadiga</p>
        </button>
        <button onClick={() => onChangeView('DOPAMINE_MENU')} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left group">
          <Utensils className="text-orange-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
          <p className="font-bold text-slate-200 text-sm">Menu Dopamina</p>
          <p className="text-[10px] text-slate-500">Recarga Rápida</p>
        </button>
        <button onClick={() => onChangeView('SAVE_CONTEXT')} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left group">
          <Save className="text-green-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
          <p className="font-bold text-slate-200 text-sm">Salvar Jogo</p>
          <p className="text-[10px] text-slate-500">Parar sem medo</p>
        </button>
      </div>

      {/* Quick Capture */}
      <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex items-center mb-6 shadow-lg">
        <button className="p-3 text-slate-500 hover:text-slate-300">
          <Mic size={20} />
        </button>
        <input 
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          placeholder="Capturar tarefa rápida (Enter para salvar)..."
          className="bg-transparent flex-1 p-2 text-slate-100 outline-none placeholder-slate-600 focus:ring-0"
        />
        <button onClick={onAdd} className="bg-red-600 hover:bg-red-500 text-white p-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors">
          Adicionar
        </button>
      </div>

      {/* Task List - Focus Today */}
      <div className="flex-1 bg-slate-900/50 rounded-3xl border border-slate-800/50 p-6 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs flex items-center gap-2">
            <ListTodo size={14} /> Foco de Hoje
          </h3>
          <button onClick={onFreshStart} className="text-[10px] font-bold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors">
            <RotateCcw size={12} /> FRESH START (SEM CULPA)
          </button>
        </div>

        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <Trophy size={40} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Tudo limpo! Escolha uma ferramenta acima para começar.</p>
            </div>
          ) : (
            tasks.map((task: Task) => (
              <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${task.completed ? 'bg-slate-900/30 border-slate-800 opacity-50' : 'bg-slate-800 border-slate-700 hover:border-red-600/30'}`}>
                <button 
                  onClick={() => onToggle(task.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500' : 'border-slate-500 hover:border-red-600'}`}
                >
                  {task.completed && <CheckCircle2 size={14} className="text-slate-950" />}
                </button>
                <span className={`flex-1 text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {task.title}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-View: Micro Steps (AI) ---
const MicroStepsView = ({ onBack, onAddXp }: any) => {
  const [input, setInput] = useState('');
  const [steps, setSteps] = useState<{id: string, text: string, done: boolean}[]>([]);
  const [loading, setLoading] = useState(false);

  const generateSteps = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
        const ai = aiClient;
        const prompt = `
        Atue como um especialista em TDAH. O usuário tem uma tarefa que parece uma "montanha".
        Tarefa: "${input}"
        
        Sua missão: Quebre essa tarefa em 3 a 6 micro-passos RIDICULAMENTE pequenos e fáceis. 
        O primeiro passo deve ser algo como "Levantar da cadeira" ou "Abrir o arquivo".
        Retorne APENAS a lista de passos em formato JSON array de strings. Exemplo: ["Passo 1", "Passo 2"].
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ parts: [{ text: prompt }] }]
        });
        
        const text = response.text || "[]";
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
            const items = JSON.parse(jsonMatch[0]);
            setSteps(items.map((text: string) => ({ id: crypto.randomUUID(), text, done: false })));
        }
    } catch (e) {
        alert("Erro ao gerar passos. Tente novamente.");
    } finally {
        setLoading(false);
    }
  };

  const toggleStep = (id: string) => {
    setSteps(prev => prev.map(s => {
        if (s.id === id) {
            if (!s.done) onAddXp(50); // High reward for boring tasks
            return { ...s, done: !s.done };
        }
        return s;
    }));
  };

  return (
    <div className="flex flex-col h-full p-8 max-2xl mx-auto w-full">
        <button onClick={onBack} className="text-slate-500 hover:text-white mb-6 flex items-center gap-2 font-bold uppercase text-xs tracking-widest"><ArrowRight size={16} className="rotate-180"/> Voltar</button>
        
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                <Sparkles className="text-yellow-500" size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-100">Quebrador de Montanhas</h2>
            <p className="text-slate-500 text-sm mt-2">Tarefas grandes paralisam. Micro-passos geram movimento.</p>
        </div>

        <div className="flex gap-2 mb-8">
            <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Qual tarefa você está evitando? (Ex: Limpar a cozinha)"
                className={inputClass}
            />
            <button onClick={generateSteps} disabled={loading} className="bg-red-600 hover:bg-red-500 text-white px-6 rounded-xl font-bold transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            </button>
        </div>

        <div className="space-y-3">
            {steps.map((step, idx) => (
                <div 
                    key={step.id}
                    onClick={() => toggleStep(step.id)}
                    className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${step.done ? 'bg-green-900/20 border-green-900/50 opacity-50 scale-[0.98]' : 'bg-slate-900 border-slate-800 hover:border-red-600/50'}`}
                >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${step.done ? 'bg-green-500 border-green-500' : 'border-slate-600'}`}>
                        {step.done && <CheckCircle2 size={14} className="text-slate-950" />}
                    </div>
                    <span className={`font-medium ${step.done ? 'text-green-400 line-through' : 'text-slate-200'}`}>{step.text}</span>
                </div>
            ))}
        </div>
    </div>
  );
};

// --- Sub-View: Focus Timer (Visual) with Audio ---
const FocusTimerView = ({ onBack, onAddXp }: any) => {
  const [mode, setMode] = useState<'SOFT' | 'HYPER'>('SOFT');
  const [timeLeft, setTimeLeft] = useState(mode === 'SOFT' ? 5 * 60 : 25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPatternInterrupt, setIsPatternInterrupt] = useState(false);
  const [mathAnswer, setMathAnswer] = useState('');
  const [sound, setSound] = useState<'NONE' | 'BROWN' | 'RAIN' | 'CAFE'>('NONE');
  
  const intervalRef = useRef<number | null>(null);
  const { play, stop } = useNoiseGenerator();
  
  useEffect(() => {
    // Audio Control
    if (isActive) {
        if (sound === 'BROWN') play('BROWN');
        else if (sound === 'RAIN') play('RAIN');
    } else {
        stop();
    }
    return () => {
        stop();
    }
  }, [isActive, sound]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      onAddXp(mode === 'SOFT' ? 50 : 100);
      if (mode === 'HYPER') setIsPatternInterrupt(true);
      else alert("5 Minutos completos! Deseja continuar?");
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'SOFT' ? 5 * 60 : 25 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage for visual circle
  const totalTime = mode === 'SOFT' ? 5 * 60 : 25 * 60;
  const percentage = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className="flex flex-col h-full p-8 max-w-xl mx-auto w-full items-center justify-center relative">
        {isPatternInterrupt && (
            <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                <AlertOctagon size={64} className="text-red-500 mb-6 animate-bounce" />
                <h1 className="text-4xl font-black text-white mb-2">INTERRUPÇÃO DE PADRÃO</h1>
                <p className="text-slate-400 mb-8">O hiperfoco acabou. Mude o contexto agora.</p>
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <p className="text-lg font-bold text-white mb-4">Quanto é 7 x 8?</p>
                    <input 
                        className="bg-slate-800 text-center text-2xl text-white p-3 rounded-lg w-full mb-4 outline-none border border-slate-700 focus:border-red-600"
                        value={mathAnswer}
                        onChange={(e) => setMathAnswer(e.target.value)}
                        placeholder="?"
                    />
                    <button 
                        onClick={() => { if(mathAnswer === '56') setIsPatternInterrupt(false); }}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl"
                    >
                        Desbloquear Tela
                    </button>
                </div>
            </div>
        )}

        <button onClick={onBack} className="absolute top-8 left-8 text-slate-500 hover:text-white flex items-center gap-2 font-bold uppercase text-xs tracking-widest"><ArrowRight size={16} className="rotate-180"/> Voltar</button>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mb-8">
            <button onClick={() => { setMode('SOFT'); setTimeLeft(300); setIsActive(false); }} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'SOFT' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>Só 5 Minutos</button>
            <button onClick={() => { setMode('HYPER'); setTimeLeft(1500); setIsActive(false); }} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'HYPER' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Hiperfoco</button>
        </div>

        {/* Visual Timer */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full border-8 border-slate-800"></div>
            <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                    cx="128" cy="128" r="120"
                    fill="none" stroke={mode === 'SOFT' ? '#0891b2' : '#9333ea'} strokeWidth="8"
                    strokeDasharray="754"
                    strokeDashoffset={754 - (754 * percentage) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                />
            </svg>
            
            <div className="text-center z-10">
                <div className="text-6xl font-black text-slate-100 font-mono tracking-tighter">
                    {formatTime(timeLeft)}
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">
                    {isActive ? 'Focando...' : 'Pausado'}
                </p>
            </div>
        </div>

        {/* Audio Controls */}
        <div className="flex gap-2 mb-10">
            <button onClick={() => setSound('NONE')} className={`p-2 rounded-lg border ${sound === 'NONE' ? 'bg-slate-800 border-slate-600 text-white' : 'border-transparent text-slate-500'}`} title="Silêncio"><VolumeX size={16}/></button>
            <button onClick={() => setSound('BROWN')} className={`p-2 rounded-lg border text-xs font-bold uppercase ${sound === 'BROWN' ? 'bg-slate-800 border-slate-600 text-white' : 'border-transparent text-slate-500'}`}>Brown Noise</button>
            <button onClick={() => setSound('RAIN')} className={`p-2 rounded-lg border text-xs font-bold uppercase ${sound === 'RAIN' ? 'bg-slate-800 border-slate-600 text-white' : 'border-transparent text-slate-500'}`}>Chuva</button>
        </div>

        <div className="flex gap-4">
            <button onClick={toggleTimer} className="w-16 h-16 bg-slate-100 hover:bg-white text-slate-950 rounded-full flex items-center justify-center shadow-xl shadow-white/10 transition-transform active:scale-95">
                {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={resetTimer} className="w-16 h-16 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full flex items-center justify-center border border-slate-700 transition-colors">
                <RotateCcw size={20} />
            </button>
        </div>
    </div>
  );
};

// --- Sub-View: Body Double (Chat Simulado com Timer de 15 min) ---
const BodyDoubleView = ({ onBack, onAddXp }: any) => {
    const CHECK_IN_TIME = 15 * 60; // 15 minutos em segundos
    const [task, setTask] = useState('');
    const [active, setActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(CHECK_IN_TIME);
    const [messages, setMessages] = useState<{sender: 'bot'|'user', text: string}[]>([
        { sender: 'bot', text: "Olá! Sou seu Body Double. Qual é a tarefa única que vamos atacar pelos próximos 15 minutos?" }
    ]);
    const [input, setInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Timer Logic (15 min cycle)
    useEffect(() => {
        let interval: number;
        if (active && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (active && timeLeft === 0) {
            // Check-in trigger
            playNotificationSound('PING');
            setMessages(prev => [...prev, { sender: 'bot', text: `⏰ Ding ding! Passaram-se 15 minutos. Como estamos com "${task}"?` }]);
            setActive(false); // Pause timer until user responds
        }
        return () => clearInterval(interval);
    }, [active, timeLeft, task]);

    const handleSend = (text: string = input) => {
        if (!text.trim()) return;
        
        setMessages(prev => [...prev, { sender: 'user', text: text }]);
        
        if (!task) {
            // First task setting
            setTask(text);
            setActive(true);
            setTimeLeft(CHECK_IN_TIME);
            setTimeout(() => {
                setMessages(prev => [...prev, { sender: 'bot', text: `Entendido: "${text}". Timer de 15 minutos iniciado. Mantenha o foco, estarei aqui observando. 🤫` }]);
            }, 800);
        } else {
            // Reply to check-in or update
            if (!active && timeLeft === 0) {
                // Restarting cycle after check-in
                onAddXp(20);
                setTimeout(() => {
                    setMessages(prev => [...prev, { sender: 'bot', text: "Ótimo. Reiniciando o relógio. Mais 15 minutos de foco total. Vai!" }]);
                    setTimeLeft(CHECK_IN_TIME);
                    setActive(true);
                }, 800);
            } else {
                // General chatter during focus (discouraged but handled)
                setTimeout(() => {
                    setMessages(prev => [...prev, { sender: 'bot', text: "Estou aqui. Volte ao foco." }]);
                }, 1000);
            }
        }
        setInput('');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full p-8 max-w-2xl mx-auto w-full relative">
            {/* Header / Timer Status */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="text-slate-500 hover:text-white flex items-center gap-2 font-bold uppercase text-xs tracking-widest"><ArrowRight size={16} className="rotate-180"/> Voltar</button>
                {task && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${active ? 'bg-pink-900/20 border-pink-500/50 text-pink-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <Clock size={16} className={active ? "animate-pulse" : ""} />
                        <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider ml-1">{active ? 'Focando' : 'Aguardando'}</span>
                    </div>
                )}
            </div>
            
            {!task && (
                <div className="text-center mb-6 animate-in fade-in slide-in-from-top-4">
                    <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-pink-500/20 animate-pulse">
                        <UserPlus className="text-pink-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-100">Body Double Digital</h2>
                    <p className="text-slate-500 text-sm mt-2">Ciclos de 15 minutos com verificação de progresso.</p>
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-y-auto mb-4 custom-scrollbar space-y-4 shadow-inner">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.sender === 'user' ? 'bg-pink-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Quick Actions (During Check-in) */}
            {!active && timeLeft === 0 && task && (
                <div className="flex gap-2 mb-4 animate-in slide-in-from-bottom-4">
                    <button onClick={() => handleSend("Ainda focado, continuando!")} className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50 py-2 rounded-xl text-xs font-bold uppercase">Continuar Focado</button>
                    <button onClick={() => handleSend("Me distraí, mas vou voltar.")} className="flex-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/50 py-2 rounded-xl text-xs font-bold uppercase">Me Distraí</button>
                    <button onClick={() => { setTask(''); setMessages(prev => [...prev, {sender: 'user', text: 'Terminei!'}, {sender: 'bot', text: 'Parabéns! Descanse ou comece outra tarefa.'}]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl text-xs font-bold uppercase">Terminei</button>
                </div>
            )}

            {/* Input Area */}
            <div className="flex gap-2">
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={!task ? "Defina sua tarefa aqui..." : "Responda ao bot..."}
                    className={inputClass}
                    disabled={!active && timeLeft === 0 && task !== ''} // Force use of quick buttons during check-in or manual typing
                />
                <button onClick={() => handleSend()} className="bg-pink-600 hover:bg-pink-500 text-white p-3 rounded-xl transition-colors shadow-lg shadow-pink-900/20">
                    <MessageCircle size={20} />
                </button>
            </div>
        </div>
    );
};

// --- Sub-View: Dopamine Menu ---
const DopamineMenuView = ({ onBack, onAddXp }: any) => {
    const appetizers = [
        { label: "Beber um copo d'água", xp: 10, icon: <Coffee size={14}/> },
        { label: "Alongar por 1 minuto", xp: 15, icon: <UserPlus size={14}/> },
        { label: "Ouvir 1 música favorita", xp: 20, icon: <Volume2 size={14}/> },
        { label: "Arrumar a mesa (2 min)", xp: 20, icon: <Utensils size={14}/> },
    ];

    const mainCourses = [
        { label: "Caminhada de 15 min", xp: 50, icon: <UserPlus size={14}/> },
        { label: "Banho Gelado", xp: 60, icon: <Zap size={14}/> },
        { label: "Meditação Guiada", xp: 50, icon: <BrainCircuit size={14}/> },
    ];

    const handleConsume = (xp: number) => {
        onAddXp(xp);
        alert(`+${xp} XP! Dopamina liberada.`);
    };

    return (
        <div className="flex flex-col h-full p-8 max-w-3xl mx-auto w-full">
            <button onClick={onBack} className="text-slate-500 hover:text-white mb-6 flex items-center gap-2 font-bold uppercase text-xs tracking-widest"><ArrowRight size={16} className="rotate-180"/> Voltar</button>
            
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
                    <Utensils className="text-orange-500" size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-100">Menu de Dopamina</h2>
                    <p className="text-slate-500 text-sm">Escolha uma atividade para recarregar sua bateria mental.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-orange-400 font-bold uppercase tracking-widest text-xs mb-4 border-b border-orange-500/30 pb-2">Entradas (Rápido)</h3>
                    <div className="space-y-3">
                        {appetizers.map((item, i) => (
                            <button key={i} onClick={() => handleConsume(item.xp)} className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:bg-orange-500/10 hover:border-orange-500/50 transition-all group">
                                <span className="flex items-center gap-3 text-slate-300 font-medium group-hover:text-white">
                                    {item.icon} {item.label}
                                </span>
                                <span className="text-xs font-bold text-orange-500 bg-orange-950/30 px-2 py-1 rounded">+{item.xp} XP</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-orange-400 font-bold uppercase tracking-widest text-xs mb-4 border-b border-orange-500/30 pb-2">Prato Principal (Médio)</h3>
                    <div className="space-y-3">
                        {mainCourses.map((item, i) => (
                            <button key={i} onClick={() => handleConsume(item.xp)} className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:bg-orange-500/10 hover:border-orange-500/50 transition-all group">
                                <span className="flex items-center gap-3 text-slate-300 font-medium group-hover:text-white">
                                    {item.icon} {item.label}
                                </span>
                                <span className="text-xs font-bold text-orange-500 bg-orange-950/30 px-2 py-1 rounded">+{item.xp} XP</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-View: Roulette ---
const RouletteView = ({ tasks, onBack }: any) => {
  const [spinning, setSpinning] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const handleSpin = () => {
    if (tasks.length < 2) {
        alert("Adicione pelo menos 2 tarefas na lista principal para usar a roleta.");
        return;
    }
    setSpinning(true);
    setSelectedTask(null);
    
    let counter = 0;
    const interval = window.setInterval(() => {
        const randomIdx = Math.floor(Math.random() * tasks.length);
        setSelectedTask(tasks[randomIdx].title);
        counter++;
        if (counter > 20) {
            clearInterval(interval);
            setSpinning(false);
        }
    }, 100);
  };

  return (
    <div className="flex flex-col h-full p-8 max-w-xl mx-auto w-full items-center justify-center">
        <button onClick={onBack} className="absolute top-8 left-8 text-slate-500 hover:text-white flex items-center gap-2 font-bold uppercase text-xs tracking-widest"><ArrowRight size={16} className="rotate-180"/> Voltar</button>
        
        <div className="text-center mb-12">
            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto mb-6 transition-all ${spinning ? 'border-purple-500 animate-spin' : 'border-slate-800'}`}>
                <Dices className={spinning ? 'text-purple-400' : 'text-slate-600'} size={40} />
            </div>
            <h2 className="text-2xl font-black text-white">Roleta Anti-Paralisia</h2>
            <p className="text-slate-500 text-sm mt-2">Não consegue escolher? Deixe o destino decidir.</p>
        </div>

        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 text-center min-h-[120px] flex flex-col justify-center items-center shadow-inner">
            {selectedTask ? (
                <div className="animate-in zoom-in duration-300">
                    <p className="text-[10px] font-bold text-purple-500 uppercase tracking-[0.3em] mb-2">Tarefa Escolhida:</p>
                    <p className="text-2xl font-black text-slate-100 uppercase">{selectedTask}</p>
                </div>
            ) : (
                <p className="text-slate-600 italic">Clique em girar para sortear</p>
            )}
        </div>

        <button 
            onClick={handleSpin} 
            disabled={spinning || tasks.length < 2} 
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white px-12 py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-purple-900/40 transition-all transform active:scale-95 flex items-center gap-3"
        >
            {spinning ? <Loader2 size={20} className="animate-spin" /> : <Dices size={20} />}
            {spinning ? 'Girando...' : 'Girar Roleta'}
        </button>
        
        {tasks.length < 2 && (
            <p className="text-[10px] text-red-500 font-bold uppercase mt-4">Necessário 2+ tarefas ativas</p>
        )}
    </div>
  );
};

// --- Sub-View: Save Context ---
const ContextSaverView = ({ onBack, onAddXp }: any) => {
  const [context, setContext] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!context.trim()) return;
    setSaved(true);
    onAddXp(30);
    // Simulating save
    setTimeout(() => {
        setSaved(false);
        alert("Contexto salvo! Agora você pode sair sem culpa.");
        onBack();
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full p-8 max-w-2xl mx-auto w-full">
        <button onClick={onBack} className="text-slate-500 hover:text-white mb-6 flex items-center gap-2 font-bold uppercase text-xs tracking-widest"><ArrowRight size={16} className="rotate-180"/> Voltar</button>
        
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <Save className="text-green-500" size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-100">Salvar Contexto ("Save Game")</h2>
            <p className="text-slate-500 text-sm mt-2">Vai parar agora? Anote exatamente o que estava fazendo para não se perder na volta.</p>
        </div>

        <div className="space-y-4">
            <label className={labelClass}>O que você estava fazendo exatamente agora?</label>
            <textarea 
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex: Estava no meio do cálculo da folha 25, parei porque o telefone tocou. Falta somar as multas do réu X..."
                className={`${inputClass} h-48 resize-none`}
            />
            
            <button 
                onClick={handleSave} 
                disabled={saved || !context.trim()} 
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-800 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl shadow-green-900/40 transition-all flex items-center justify-center gap-2"
            >
                {saved ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {saved ? 'Salvando Contexto...' : 'Salvar e Sair'}
            </button>
        </div>
    </div>
  );
};

export default AdhdTool;