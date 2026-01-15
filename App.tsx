
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
          <div className="login-card">
            <div className="inline-block p-4 mb-6" style={{ background: 'rgba(147, 51, 234, 0.2)', borderRadius: '1.5rem' }}>
              <ShieldCheck className="w-12 h-12 text-purple-400" />
            </div>
            <h1 className="text-4xl orbitron mb-2 tracking-tighter text-gradient">HOLOTASK</h1>
            <p className="text-zinc-500 mb-8 uppercase text-xs tracking-widest font-bold">Secure Command Uplink</p>
            
            <div className="space-y-4 text-left">
              <div className="input-group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Commander ID..."
                  className="uppercase font-mono"
                />
              </div>
              <button onClick={() => handleLogin(loginInput)} className="w-full btn-primary orbitron tracking-widest text-sm">
                INITIALIZE_SESSION
              </button>
            </div>
            <p className="mt-8 text-zinc-600 orbitron" style={{ fontSize: '9px' }}>PERSISTENT_STORAGE: LOCAL_DB_V2_ACTIVE</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white">
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
              <div className="p-3" style={{ background: '#9333ea', borderRadius: '1rem', boxShadow: '0 0 20px rgba(147, 51, 234, 0.5)' }}>
                <ListTodo className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl orbitron tracking-tighter text-gradient">HOLOTASK</h1>
            </div>
            <div className="flex items-center gap-2 ml-14 text-zinc-400 text-xs font-bold orbitron tracking-tighter opacity-80 uppercase">
              <UserIcon className="w-3 h-3 text-cyan-400" />
              COMMANDER: {user.username}
            </div>
          </div>

          <div className="input-group mb-8">
             <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="New objective node..."
                className="text-lg font-light"
                style={{ paddingLeft: '1.5rem' }}
              />
              <button 
                onClick={addTask}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
          </div>

          <div className="mt-auto space-y-4">
            <div className="backdrop-blur-md p-5 rounded-3xl border shadow-xl" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="flex justify-between orbitron mb-3 tracking-widest text-zinc-400" style={{ fontSize: '10px' }}>
                <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-400" />FLEET_EFFICIENCY</span>
                <span style={{ color: 'white' }}>{Math.round(completionRate * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${completionRate * 100}%` }} />
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full p-4 hover:bg-red-500/10 border rounded-2xl font-bold text-zinc-500 hover:text-red-400 transition-all uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)', fontSize: '10px' }}
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
            <div className="px-3 py-1 rounded-full font-mono border text-zinc-400" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', fontSize: '10px' }}>
              UPLINK_STABLE // STORAGE_MODE: PERSISTENT
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-6 pb-20">
            {tasks.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed rounded-[40px] backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <BrainCircuit className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-light italic tracking-widest uppercase" style={{ fontSize: '10px' }}>No active directives detected for {user.username}</p>
              </div>
            ) : (
              tasks.map((task) => {
                const subCount = task.subtasks.length;
                const completedSubs = task.subtasks.filter(s => s.completed).length;
                const taskPercent = subCount > 0 ? Math.round((completedSubs / subCount) * 100) : (task.completed ? 100 : 0);
                const isExpanded = expandedTasks.has(task.id);

                return (
                  <div key={task.id} className="relative transition-all">
                    <div className="holo-card p-6 shadow-2xl overflow-hidden">
                      <div className="flex items-start gap-4">
                        <button onClick={() => toggleTask(task.id)}>
                          {task.completed ? (
                            <CheckCircle className="w-7 h-7 text-cyan-400" />
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
                            <div className="progress-bar" style={{ height: '4px' }}>
                              <div className="progress-fill" style={{ width: `${taskPercent}%` }} />
                            </div>
                            <span className="font-mono text-zinc-500" style={{ fontSize: '10px' }}>{taskPercent}%</span>
                          </div>
                          <button onClick={() => toggleExpand(task.id)} className="mt-4 flex items-center gap-2 orbitron tracking-widest text-zinc-600 hover:text-zinc-300" style={{ fontSize: '10px' }}>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            SUB_DIRECTIVES: {subCount}
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-2" style={{ borderTopColor: 'rgba(255,255,255,0.05)' }}>
                          {task.subtasks.map((sub) => (
                            <div key={sub.id} className="subtask-item">
                              <button onClick={() => toggleSubtask(task.id, sub.id)}>
                                {sub.completed ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-zinc-700" />}
                              </button>
                              <span className={`text-xs flex-1 ${sub.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>{sub.text}</span>
                              <button onClick={() => deleteSubtask(task.id, sub.id)} className="text-zinc-700 hover:text-red-400 transition-opacity">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          
                          <div className="mt-3 flex items-center gap-2 px-3">
                            <div className="flex-1 relative">
                              <input 
                                type="text"
                                ref={el => { subtaskInputsRef.current[task.id] = el; }}
                                placeholder="New sub-directive..."
                                className="w-full bg-black/40 border rounded-xl px-4 py-2 text-xs outline-none transition-all placeholder:text-zinc-700"
                                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
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
                              className="p-2 rounded-lg transition-all border active:scale-95 text-cyan-400"
                              style={{ background: 'rgba(8, 145, 178, 0.1)', borderColor: 'rgba(8, 145, 178, 0.2)' }}
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
    </div>
  );
};

export default App;
