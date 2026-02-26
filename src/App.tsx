import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Send, Code, Eye, Cpu, Sparkles, MessageSquare, PanelLeftClose, Copy, Check } from 'lucide-react';
import "./App.css";

const OLLAMA_API_URL = "http://localhost:11434/api/chat";
const MODELS = ["qwen2.5-coder:14b-instruct-q4_K_M", "qwen2.5-coder:7b", "qwen2.5-coder:1.5b"];

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", content: "星云锻造炉 Lite 已就绪。 \n\n已移除多余按键，代码实时同步与高亮逻辑已重构。" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [generatedCode, setGeneratedCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("html");
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamBuffer = useRef("");

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // 🚀 实时同步逻辑：即使代码没写完，只要有 ``` 就开始提取
  const extractCodeStreaming = (text: string) => {
    const regex = /```(\w*)\n?([\s\S]*?)(?:```|$)/;
    const match = text.match(regex);
    if (match) {
      return { lang: match[1] || "html", code: match[2] };
    }
    return null;
  };

  // 🚀 纯净复制逻辑
  const handleCopy = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000); 
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
              
              // 同步左侧对话框
              setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = streamBuffer.current;
                return newMsgs;
              });

              // 🚀 实时同步到右侧编辑器
              const result = extractCodeStreaming(streamBuffer.current);
              if (result) {
                setGeneratedCode(result.code);
                // 自动识别语言切换高亮
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
        console.error("请求失败:", error);
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
            {/* 🚀 复制键：带成功反馈动画 */}
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
                <div key={i} className={`v3-msg ${msg.role}`}>
                  <div className="v3-avatar">{msg.role === 'user' ? 'ME' : 'NF'}</div>
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
                    placeholder="在此输入你的构想..." 
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