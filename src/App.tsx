import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Send, Code, Eye, Cpu, Sparkles, MessageSquare, PanelLeftClose, Copy, Check } from 'lucide-react';
import "./App.css";

const OLLAMA_API_URL = "http://localhost:11434/api/chat";
const OLLAMA_TAGS_URL = "http://localhost:11434/api/tags"; // 🚀 新增：获取本地模型列表的接口

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([{ 
    role: "assistant", 
    content: "星云锻造炉已就绪。\n\n已开启本地模型自动探测探测。请确保 Ollama 已启动，并在下拉菜单中选择你的模型。" 
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [generatedCode, setGeneratedCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("html");
  
  // 🚀 动态模型状态
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [isOllamaRunning, setIsOllamaRunning] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamBuffer = useRef("");

  // 🚀 核心新增：软件启动时，自动扫描本地 Ollama 模型
  useEffect(() => {
    const fetchLocalModels = async () => {
      try {
        const response = await fetch(OLLAMA_TAGS_URL);
        if (!response.ok) throw new Error("Ollama not responding");
        
        const data = await response.json();
        const models = data.models.map((m: any) => m.name); // 提取模型名称
        
        setAvailableModels(models);
        if (models.length > 0) {
          setCurrentModel(models[0]); // 默认选中第一个本地模型
        }
        setIsOllamaRunning(true);
      } catch (error) {
        console.error("无法连接到本地 Ollama:", error);
        setIsOllamaRunning(false);
        setAvailableModels([]);
      }
    };

    fetchLocalModels();
  }, []); // 仅在启动时运行一次

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // 实时同步逻辑
  const extractCodeStreaming = (text: string) => {
    const regex = /```(\w*)\n?([\s\S]*?)(?:```|$)/;
    const match = text.match(regex);
    if (match) {
      return { lang: match[1] || "html", code: match[2] };
    }
    return null;
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000); 
  };

  const handleSend = async () => {
    // 如果没有输入、正在加载，或者【没有检测到模型】，则拒绝发送
    if (!prompt.trim() || isLoading || !currentModel) return;
    
    const userMsg = { role: "user", content: prompt };
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "" }]);
    setPrompt("");
    setIsLoading(true);
    streamBuffer.current = ""; 

    try {
      const response = await fetch(OLLAMA_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: currentModel, messages: [...messages.filter(m => m.content), userMsg], stream: true })
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              streamBuffer.current += json.message.content;
              
              setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = streamBuffer.current;
                return newMsgs;
              });

              const result = extractCodeStreaming(streamBuffer.current);
              if (result) {
                setGeneratedCode(result.code);
                const lang = result.lang.toLowerCase();
                if (lang.includes('py') && currentLanguage !== 'python') setCurrentLanguage('python');
                else if ((lang.includes('html') || lang === '') && currentLanguage !== 'html') setCurrentLanguage('html');
                else if (lang.includes('js') && currentLanguage !== 'javascript') setCurrentLanguage('javascript');
              }
            }
          } catch (e) { }
        }
      }
    } catch (error) { 
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = "⚠️ 连接 Ollama 失败，请检查模型服务是否启动。";
          return newMsgs;
        });
    } finally { 
        setIsLoading(false); 
    }
  };

  return (
    <div className="nf-app">
      <header className="nf-header">
        <div className="nf-header-left">
          <button className="nf-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <PanelLeftClose size={18} style={{ transform: isSidebarOpen ? 'none' : 'rotate(180deg)' }} />
          </button>
          <div className="nf-brand">
            <Sparkles size={18} color="#a855f7" />
            <span>Nebula Forge</span>
          </div>
        </div>

        <div className="nf-header-right">
          <div className="nf-tab-group">
            <button className={activeTab === 'code' ? 'active' : ''} onClick={() => setActiveTab('code')}>
              <Code size={16} /> <span className="hide-sm">代码</span>
            </button>
            <button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}>
              <Eye size={16} /> <span className="hide-sm">预览</span>
            </button>
          </div>
          <div className="nf-action-group">
            <button className="nf-btn-copy" onClick={handleCopy}>
              {isCopied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              <span>{isCopied ? "已复制" : "复制代码"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="nf-body">
        <aside className={`nf-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="nf-sidebar-inner">
            <div className="nf-section"><MessageSquare size={14} /> <span>当前任务</span></div>
            <div className="nf-history-item active">index.workspace</div>
            <div className="nf-sidebar-spacer"></div>
            
            {/* 🚀 动态模型下拉菜单 */}
            <div className="nf-model-box">
              <div className="nf-model-label"><Cpu size={12} /> ENGINE</div>
              <select 
                value={currentModel} 
                onChange={(e) => setCurrentModel(e.target.value)}
                disabled={!isOllamaRunning || availableModels.length === 0}
                style={{
                  background: 'rgba(0,0,0,0.5)', border: '1px solid #27272a', 
                  color: !isOllamaRunning ? '#ef4444' : '#fafafa', 
                  padding: '8px', borderRadius: '6px', width: '100%', outline: 'none'
                }}
              >
                {!isOllamaRunning ? (
                  <option value="">⚠️ 未连接 Ollama</option>
                ) : availableModels.length === 0 ? (
                  <option value="">📥 请先拉取模型</option>
                ) : (
                  availableModels.map(m => <option key={m} value={m}>{m}</option>)
                )}
              </select>
            </div>

          </div>
        </aside>

        <section className="nf-workspace">
          <div className="nf-chat">
            <div className="nf-messages" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`v3-msg ${msg.role}`}>
                  <div className="v3-avatar">{msg.role === 'user' ? 'ME' : 'NF'}</div>
                  <div className="nf-content" style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
                </div>
              ))}
            </div>
            <div className="nf-input-container">
                <div className="nf-input-wrapper">
                  <textarea 
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} 
                    placeholder={!currentModel ? "请先在左侧选择模型..." : "在此输入你的构想..."} 
                    disabled={!currentModel}
                  />
                  <button className="nf-send-btn" onClick={handleSend} disabled={isLoading || !currentModel}>
                    <Send size={18} />
                  </button>
                </div>
            </div>
          </div>

          <div className="nf-viewport">
            <div className="nf-frame-container">
              {activeTab === 'code' ? (
                <Editor 
                    height="100%" 
                    language={currentLanguage} 
                    theme="vs-dark" 
                    value={generatedCode} 
                    options={{ 
                        fontSize: 13, 
                        minimap: { enabled: false },
                        readOnly: isLoading,
                        wordWrap: 'on',
                        padding: { top: 15 }
                    }} 
                />
              ) : (
                <iframe srcDoc={generatedCode} title="preview" />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}