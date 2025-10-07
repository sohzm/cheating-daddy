import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiHome,
  FiBarChart2,
  FiFolder,
  FiCheckSquare,
  FiSettings,
  FiSend
} from 'react-icons/fi';

// Tabs
const tabs = [
  { key: 'dashboard', name: 'Dashboard', icon: FiHome },
  { key: 'analytics', name: 'Analytics', icon: FiBarChart2 },
  { key: 'projects', name: 'Projects', icon: FiFolder },
  { key: 'tasks', name: 'Tasks', icon: FiCheckSquare },
  { key: 'settings', name: 'Settings', icon: FiSettings }
];

// Simple content per tab (sample cards)
const TabContent = ({ active }) => {
  const card = (title, body) => (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-body">{body}</div>
    </div>
  );

  if (active === 'dashboard') {
    return (
      <div className="grid">
        {card('Overview', 'KPIs, summaries, and quick links.')}
        {card('Recent Activity', 'Latest updates and alerts.')}
        {card('Shortcuts', 'Jump into frequent actions.')}
      </div>
    );
  }

  if (active === 'analytics') {
    return (
      <div className="grid">
        {card('Trends', 'Performance and funnel metrics.')}
        {card('Cohorts', 'Stickiness and retention insights.')}
        {card('Benchmarks', 'Targets vs actuals.')}
      </div>
    );
  }

  if (active === 'projects') {
    return (
      <div className="grid">
        {card('Roadmap', 'Milestones and deliverables.')}
        {card('Status', 'Risks, owners, and timelines.')}
        {card('Files', 'Specs, docs, and assets.')}
      </div>
    );
  }

  if (active === 'tasks') {
    return (
      <div className="grid">
        {card('Backlog', 'Prioritized tasks ready to pick.')}
        {card('In Progress', 'Active work items.')}
        {card('Done', 'Recently completed items.')}
      </div>
    );
  }

  return (
    <div className="grid">
      {card('Preferences', 'Theme, notifications, and profile.')}
      {card('Integrations', 'APIs and tokens.')}
      {card('Billing', 'Plan and usage.')}
    </div>
  );
};

// Unified AI router: switch internally by tab if needed, but always return plain text
async function getAIResponse(activeTab, text) {
  const hints = {
    dashboard:
      "Here’s a quick take focused on home metrics and highlights.",
    analytics:
      "Here’s a concise view on trends, cohorts, and performance.",
    projects:
      "Here’s a brief project‑centric response with milestones in mind.",
    tasks:
      "Here’s an action‑oriented reply focusing on next steps.",
    settings:
      "Here’s guidance around configuration and preferences."
  };
  const preface = hints[activeTab] ?? "Here’s a helpful answer.";
  // Replace this with real API calls if needed; keep the response text free of per-tab labels
  // Example:
  // const res = await fetch(`/api/${activeTab}/chat`, { method: 'POST', body: JSON.stringify({ text }) });
  // const { reply } = await res.json();
  // return reply;
  return `${preface} ${text ? `Regarding “${text},” here’s what stands out.` : ""}`.trim();
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Welcome. Ask anything — one AI handles every tab." }
  ]);
  const [draft, setDraft] = useState('');

  // Assistant is completely hidden at first glance
  const [isChatVisible, setIsChatVisible] = useState(false);

  const listRef = useRef(null);

  const activeTabName = useMemo(
    () => tabs.find(t => t.key === activeTab)?.name ?? 'Dashboard',
    [activeTab]
  );

  // Auto-scroll messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Global shortcuts: Ctrl+Shift+X toggles chat; Ctrl+Shift+E hides chat
  useEffect(() => {
    const handler = (e) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      const k = (e.code?.startsWith('Key') ? e.code.slice(3) : e.key)?.toLowerCase();
      if (k === 'x') {
        e.preventDefault();
        setIsChatVisible(v => !v);
      } else if (k === 'e') {
        e.preventDefault();
        setIsChatVisible(false);
        setDraft('');
        // Optionally blur active element for safety
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setDraft('');
    const reply = await getAIResponse(activeTab, text);
    setMessages(prev => [...prev, { role: 'ai', content: reply }]);
  };

  const onComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-top">Cheating Daddy</div>
          <div className="brand-bottom">Analytics</div>
        </div>

        <nav className="nav">
          {tabs.map(({ key, name, icon: Icon }) => {
            const active = key === activeTab;
            return (
              <motion.button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`nav-btn ${active ? 'active' : ''}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{name}</span>
              </motion.button>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>{activeTabName}</h1>
            <p>Real‑time metrics, insights, and a unified assistant.</p>
          </div>
        </header>

        <TabContent active={activeTab} />

        {isChatVisible && (
          <section className="assistant">
            <div className="assistant-title">Assistant</div>

            <div className="messages" ref={listRef}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`bubble ${m.role === 'ai' ? 'ai' : 'user'}`}
                >
                  <div className="label">{m.role === 'ai' ? 'AI' : 'You'}</div>
                  <div className="text">{m.content}</div>
                </div>
              ))}
            </div>

            <div className="composer">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder="Type a message..."
                rows={2}
              />
              <button className="send" onClick={send} title="Send (Enter)">
                <FiSend />
              </button>
            </div>
          </section>
        )}

        <style>{`
          :root {
            --bg-0: #0b1020;
            --bg-1: rgba(255,255,255,0.04);
            --bg-2: rgba(255,255,255,0.06);
            --stroke: rgba(255,255,255,0.10);
            --soft: rgba(255,255,255,0.06);
            --text-1: #e2e8f0;
            --text-2: #94a3b8;
            --accent: #7c5cff;
            --ai: #0ea5e9;
            --user: #a78bfa;
          }
          * { box-sizing: border-box; }
          .app {
            min-height: 100vh;
            display: grid;
            grid-template-columns: 240px 1fr;
            background: radial-gradient(1200px 600px at 20% -20%, rgba(124,92,255,0.12), transparent),
                        radial-gradient(1000px 500px at 110% 10%, rgba(34,211,238,0.10), transparent),
                        linear-gradient(180deg, #0b1020, #0d1327 40%, #0b1020);
            color: var(--text-1);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji;
          }
          .sidebar {
            backdrop-filter: blur(8px);
            border-right: 1px solid var(--stroke);
            background: linear-gradient(180deg, var(--bg-1), transparent);
            padding: 20px 14px;
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
          .brand-top { font-weight: 700; letter-spacing: 0.3px; }
          .brand-bottom { font-size: 28px; line-height: 28px; margin-top: -2px; }
          .nav { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
          .nav-btn {
            height: 40px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 12px;
            border-radius: 10px;
            color: var(--text-1);
            background: transparent;
            border: 1px solid transparent;
            cursor: pointer;
          }
          .nav-btn:hover { background: var(--bg-1); border-color: var(--stroke); }
          .nav-btn.active {
            background: linear-gradient(180deg, rgba(124,92,255,0.18), rgba(124,92,255,0.10));
            border: 1px solid rgba(124,92,255,0.35);
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
          }
          .nav-icon { font-size: 16px; opacity: 0.9; }
          .nav-label { font-size: 14px; }

          .main { padding: 26px 32px; overflow: auto; }
          .header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 16px; }
          .header h1 { margin: 0; font-size: 22px; }
          .header p { margin: 6px 0 0; color: var(--text-2); }

          .grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 18px;
          }
          .card {
            background: var(--soft);
            border: 1px solid var(--stroke);
            border-radius: 14px;
            padding: 14px;
          }
          .card-title { font-weight: 600; margin-bottom: 4px; }
          .card-body { color: var(--text-2); }

          .assistant {
            margin-top: 18px;
            background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
            border: 1px solid var(--stroke);
            border-radius: 14px;
            overflow: hidden;
          }
          .assistant-title {
            padding: 12px 14px;
            border-bottom: 1px solid var(--stroke);
            font-weight: 600;
          }
          .messages {
            max-height: 280px;
            overflow: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .bubble {
            display: grid;
            grid-template-columns: 56px 1fr;
            gap: 8px;
            padding: 10px;
            border-radius: 10px;
            border: 1px solid var(--stroke);
            background: rgba(255,255,255,0.03);
          }
          .bubble.ai .label { color: var(--ai); }
          .bubble.user .label { color: var(--user); }
          .label { font-weight: 700; }
          .text { white-space: pre-wrap; color: var(--text-1); }

          .composer {
            display: grid;
            grid-template-columns: 1fr 42px;
            gap: 8px;
            padding: 10px;
            border-top: 1px solid var(--stroke);
            background: rgba(255,255,255,0.02);
          }
          .composer textarea {
            resize: none;
            width: 100%;
            background: rgba(255,255,255,0.03);
            color: var(--text-1);
            border: 1px solid var(--stroke);
            border-radius: 10px;
            padding: 10px 12px;
            outline: none;
          }
          .composer textarea:focus {
            border-color: rgba(124,92,255,0.45);
            box-shadow: 0 0 0 3px rgba(124,92,255,0.15);
          }
          .send {
            border-radius: 10px;
            border: 1px solid rgba(124,92,255,0.35);
            background: linear-gradient(180deg, rgba(124,92,255,0.35), rgba(124,92,255,0.18));
            color: white;
            display: grid;
            place-items: center;
            cursor: pointer;
          }
          .send:hover { filter: brightness(1.05); }
        `}</style>
      </main>
    </div>
  );
}
