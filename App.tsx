
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  BrainCircuit, 
  Sparkles, 
  Loader2, 
  ListTodo,
  ChevronDown,
  ChevronUp,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Zap,
  PlusSquare
} from 'lucide-react';
import { Task, Subtask, Priority, User } from './types.ts';
import { Background3D } from './components/Background3D.tsx';
import { refineTask } from './services/gemini.ts';
import { HoloStore } from './services/db.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Ref to handle subtask input clearing
  const subtaskInputsRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    const lastUser = localStorage.getItem("HOLOTASK_CURRENT_USER");
    if (lastUser) {
      const loggedUser = HoloStore.login(lastUser);
      setUser(loggedUser);
      setTasks(loggedUser.tasks);
    }
  }, []);

  useEffect(() => {
    if (user) {
      HoloStore.updateTasks(user.username, tasks);
    }
  }, [tasks, user]);

  // Removed apiKey parameter to comply with guidelines
  const handleLogin = (username: string) => {
    if (!username.trim()) return;
    const loggedUser = HoloStore.login(username.toLowerCase());
    setUser(loggedUser);
    setTasks(loggedUser.tasks);
    localStorage.setItem("HOLOTASK_CURRENT_USER", username.toLowerCase());
  };

  const handleLogout = () => {
    setUser(null);
    setTasks([]);
    localStorage.removeItem("HOLOTASK_CURRENT_USER");
  };

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const totalProgress = tasks.reduce((acc, task) => {
      if (task.subtasks.length === 0) return acc + (task.completed ? 1 : 0);
      const subProgress = task.subtasks.filter(s => s.completed).length / task.subtasks.length;
      return acc + subProgress;
    }, 0);
    return totalProgress / tasks.length;
  }, [tasks]);

  const addTask = () => {
    if (!inputValue.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: inputValue,
      completed: false,
      priority: Priority.MEDIUM,
      createdAt: Date.now(),
      subtasks: []
    };
    setTasks(prev => [newTask, ...prev]);
    setInputValue('');
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const addSubtask = (taskId: string, text: string) => {
    if (!text.trim()) return;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: [...t.subtasks, { id: crypto.randomUUID(), text, completed: false }]
        };
      }
      return t;
    }));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        };
      }
      return t;
    }));
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.filter(s => s.id !== subtaskId)
        };
      }
      return t;
    }));
  };

  // Simplified handleAutoDecompose as apiKey is now handled globally
  const handleAutoDecompose = async (task: Task) => {
    setIsRefining(task.id);
    try {
      const data = await refineTask(task.text);
      const newSubtasks: Subtask[] = data.subtasks.map(s => ({
        id: crypto.randomUUID(),
        text: s,
        completed: false
      }));
      
      setTasks(prev => prev.map(t => t.id === task.id ? { 
        ...t, 
        subtasks: [...t.subtasks, ...newSubtasks] 
      } : t));
      
      setExpandedTasks(prev => {
        const next = new Set(prev);
        next.add(task.id);
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefining(null);
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  if (!user) {
    return (
      <div className="relative w-full h-screen overflow-hidden bg-black text-white">
        <div className="absolute inset-0 z-0">
          <Canvas>
            <Background3D completionRate={0} />
          </Canvas>
        </div>
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-3xl border border-white/10 p-10 rounded-[40px] shadow-2xl text-center">
            <div className="inline-block p-4 bg-purple-600/20 rounded-3xl mb-6">
              <ShieldCheck className="w-12 h-12 text-purple-400" />
            </div>
            <h1 className="text-4xl font-bold orbitron mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">HOLOTASK</h1>
            <p className="text-zinc-500 mb-8 uppercase text-[10px] tracking-[0.2em] font-bold">Secure Command Uplink</p>
            
            <div className="space-y-4 text-left">
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-purple-400" />
                <input 
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Commander ID..."
                  className="w-full bg-black/50 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700 text-lg uppercase font-mono"
                />
              </div>
              {/* Removed API Key input block to comply with guidelines: do not ask user for API key */}
              <button 
                onClick={() => handleLogin(loginInput)}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 p-4 rounded-2xl font-bold orbitron tracking-widest text-sm transition-all shadow-[0_0_30px_rgba(147,51,234,0.3)] active:scale-95"
              >
                INITIALIZE_SESSION
              </button>
            </div>
            <p className="mt-8 text-[9px] text-zinc-600 orbitron">PERSISTENT_STORAGE: LOCAL_DB_V2_ACTIVE</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white selection:bg-purple-500/30">
      <div className="absolute inset-0 z-0">
        <Canvas>
          <Background3D completionRate={completionRate} />
        </Canvas>
      </div>

      <div className="absolute inset-0 z-10 flex flex-col md:flex-row p-6 md:p-12 gap-8 pointer-events-none">
        {/* Sidebar */}
        <div className="w-full md:w-1/3 flex flex-col pointer-events-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-600 rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.5)]">
                <ListTodo className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold orbitron tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                HOLOTASK
              </h1>
            </div>
            <div className="flex items-center gap-2 ml-14 text-zinc-400 text-xs font-bold orbitron tracking-tighter opacity-80 uppercase">
              <UserIcon className="w-3 h-3 text-cyan-400" />
              COMMANDER: {user.username}
            </div>
          </div>

          <div className="relative group mb-8">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl">
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="New objective node..."
                className="w-full bg-transparent border-none outline-none px-4 py-3 text-lg font-light placeholder:text-zinc-600"
              />
              <button 
                onClick={addTask}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/5 shadow-xl">
              <div className="flex justify-between text-[10px] orbitron mb-3 tracking-widest text-zinc-400">
                <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-400" />FLEET_EFFICIENCY</span>
                <span className="text-white">{Math.round(completionRate * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${completionRate * 100}%` }}
                />
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full p-4 bg-white/5 hover:bg-red-500/10 border border-white/5 rounded-2xl text-[10px] orbitron tracking-[0.2em] font-bold text-zinc-500 hover:text-red-400 transition-all"
            >
              <LogOut className="w-4 h-4" />
              TERMINATE_UPLINK
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="w-full md:w-2/3 flex flex-col pointer-events-auto h-full overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl orbitron font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              ACTIVE_NODES
            </h2>
            <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-mono border border-white/10 text-zinc-400">
              UPLINK_STABLE // STORAGE_MODE: PERSISTENT
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-6 pb-20">
            {tasks.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-white/5 rounded-[40px] backdrop-blur-sm">
                <BrainCircuit className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-light italic tracking-widest uppercase text-[10px]">No active directives detected for {user.username}</p>
              </div>
            ) : (
              tasks.map((task) => {
                const subCount = task.subtasks.length;
                const completedSubs = task.subtasks.filter(s => s.completed).length;
                const taskPercent = subCount > 0 ? Math.round((completedSubs / subCount) * 100) : (task.completed ? 100 : 0);
                const isExpanded = expandedTasks.has(task.id);

                return (
                  <div key={task.id} className="group relative transition-all duration-500">
                    <div className="relative bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 shadow-2xl overflow-hidden">
                      <div className="flex items-start gap-4">
                        <button onClick={() => toggleTask(task.id)}>
                          {task.completed ? (
                            <CheckCircle className="w-7 h-7 text-cyan-400 fill-cyan-400/10" />
                          ) : (
                            <Circle className="w-7 h-7 text-zinc-700 hover:text-purple-400" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`text-lg font-light ${task.completed ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                              {task.text}
                            </h3>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleAutoDecompose(task)} 
                                className={`p-2 transition-all ${isRefining === task.id ? 'text-purple-400 animate-spin' : 'text-zinc-600 hover:text-cyan-400'}`}
                                title="Auto-decompose task"
                              >
                                {isRefining === task.id ? <Loader2 className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => deleteTask(task.id)} 
                                className="p-2 text-zinc-600 hover:text-red-400 transition-all"
                                title="Delete task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500" style={{ width: `${taskPercent}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500">{taskPercent}%</span>
                          </div>
                          <button onClick={() => toggleExpand(task.id)} className="mt-4 flex items-center gap-2 text-[10px] orbitron tracking-widest text-zinc-600 hover:text-zinc-300">
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            SUB_DIRECTIVES: {subCount}
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2 animate-in slide-in-from-top-2 duration-300">
                          {task.subtasks.map((sub) => (
                            <div key={sub.id} className="group/sub flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-colors">
                              <button onClick={() => toggleSubtask(task.id, sub.id)}>
                                {sub.completed ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-zinc-700" />}
                              </button>
                              <span className={`text-xs flex-1 ${sub.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>{sub.text}</span>
                              <button onClick={() => deleteSubtask(task.id, sub.id)} className="text-zinc-700 hover:text-red-400 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          
                          {/* Manual Subtask Input with Visible Add Button */}
                          <div className="mt-3 flex items-center gap-2 px-3">
                            <div className="flex-1 relative group/subinput">
                              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-xl blur opacity-0 group-focus-within/subinput:opacity-100 transition duration-300"></div>
                              <input 
                                type="text"
                                // Fixed: Wrapped in curly braces to ensure the ref callback returns void instead of the element instance
                                ref={el => { subtaskInputsRef.current[task.id] = el; }}
                                placeholder="New sub-directive..."
                                className="relative w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-700"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    addSubtask(task.id, val);
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                              />
                            </div>
                            <button 
                              onClick={() => {
                                const input = subtaskInputsRef.current[task.id];
                                if (input && input.value) {
                                  addSubtask(task.id, input.value);
                                  input.value = '';
                                }
                              }}
                              className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-all border border-cyan-500/20 active:scale-95"
                              title="Add subtask"
                            >
                              <PlusSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(147, 51, 234, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
