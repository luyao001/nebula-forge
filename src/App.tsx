import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Send, Code, Eye, Download, Cpu, Sparkles, Layout, MessageSquare, PanelLeftClose, Rocket } from 'lucide-react';
import "./App.css";

const OLLAMA_API_URL = "http://localhost:11434/api/chat";
const MODELS = ["qwen2.5-coder:14b-instruct-q4_K_M", "qwen2.5-coder:7b", "qwen2.5-coder:1.5b"];

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", content: "星云锻造炉已升级至极致适配版。 \n\n右上角现在集成了部署、保存、预览功能，尝试调整窗口大小看看。" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [generatedCode, setGeneratedCode] = useState("");
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamBuffer = useRef("");

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const extractCode = (text: string) => {
    const match = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  const handleDeploy = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    alert("🚀 代码已成功复制！即将跳转 Vercel。");
    window.open("https://vercel.com/new", "_blank");
  };

  const handleSave = async () => {
    if (!generatedCode) return;
    try {
      const path = await save({ filters: [{ name: 'HTML', extensions: ['html'] }], defaultPath: 'nebula_project.html' });
      if (path) { await writeTextFile(path, generatedCode); }
    } catch (err) { console.error(err); }
  };

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;
    const userMsg = { role: "user", content: prompt };
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "" }]);
    setPrompt("");
    setIsLoading(true);
    streamBuffer.current = ""; 

    try {
      const response = await fetch(OLLAMA_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: currentModel, messages: [...messages, userMsg], stream: true })
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
              const code = extractCode(streamBuffer.current);
              if (code) setGeneratedCode(code);
            }
          } catch (e) { }
        }
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
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
            <button className="nf-btn-ghost" onClick={handleSave} title="保存项目">
              <Download size={16} />
            </button>
            <button className="nf-btn-deploy" onClick={handleDeploy} title="一键部署">
              <Rocket size={16} /> <span>部署</span>
            </button>
          </div>
        </div>
      </header>

      <main className="nf-body">
        <aside className={`nf-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="nf-sidebar-inner">
            <div className="nf-section">
              <MessageSquare size={14} /> <span>对话历史</span>
            </div>
            <div className="nf-history-item active">当前锻造项目</div>
            
            <div className="nf-sidebar-spacer"></div>
            
            <div className="nf-model-box">
              <div className="nf-model-label"><Cpu size={12} /> ENGINE</div>
              <select value={currentModel} onChange={(e) => setCurrentModel(e.target.value)}>
                {MODELS.map(m => <option key={m} value={m}>{m.split(':')[0]}</option>)}
              </select>
            </div>
          </div>
        </aside>

        <section className="nf-workspace">
          <div className="nf-chat">
            <div className="nf-messages" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`nf-msg ${msg.role}`}>
                  <div className="nf-avatar">{msg.role === 'user' ? 'ME' : 'NF'}</div>
                  <div className="nf-content">{msg.content}</div>
                </div>
              ))}
            </div>
            <div className="nf-input-container">
              <div className="nf-input-wrapper">
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} 
                  placeholder="输入你的构想..." 
                />
                <button className="nf-send-btn" onClick={handleSend} disabled={isLoading}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="nf-viewport">
            <div className="nf-frame-container">
              {activeTab === 'code' ? (
                <Editor height="100%" defaultLanguage="html" theme="vs-dark" value={generatedCode} options={{ fontSize: 13, minimap: { enabled: false } }} />
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