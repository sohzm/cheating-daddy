import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AssistantIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 8V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

const SendIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.49902 13.1201L3.55002 18.66C3.58502 20.91 5.51102 22.39 7.64902 21.61L11.53 20.1C11.8 20 12.2 20 12.47 20.1L16.35 21.61C18.488 22.39 20.414 20.91 20.449 18.66L20.499 13.12C20.521 11.45 19.581 10.04 18.013 9.42L13.102 7.55C12.422 7.29 11.577 7.29 10.897 7.55L5.98602 9.42C4.41802 10.04 3.47802 11.45 3.49902 13.12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 7V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10.5 3.5L12 2L13.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


const NAV_ITEMS = ["Dashboard", "Analytics", "Projects", "Tasks", "Settings"];

const MockContent = ({ title }) => (
    <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="mt-4 text-gray-600">This is the mock content for the {title} section.</p>
    </div>
);

const AssistantPanel = ({ isVisible, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = () => {
        if (input.trim()) {
            setMessages([...messages, { text: input, sender: 'user' }]);
            setInput('');
            // Simulate AI response
            setTimeout(() => {
                setMessages(prev => [...prev, { text: `This is a simulated AI response to "${input}"`, sender: 'ai' }]);
            }, 1000);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 flex flex-col"
                >
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Assistant</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto">
                        {messages.map((msg, index) => (
                            <div key={index} className={`mb-4 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-2 rounded-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-gray-200 flex">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type a message..."
                        />
                        <button onClick={handleSend} className="p-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600">
                            <SendIcon />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const Dashboard = () => {
    const [activeView, setActiveView] = useState("Dashboard");
    const [isAssistantVisible, setAssistantVisible] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'X') {
                setAssistantVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold">Dashboard</h1>
                </div>
                <nav className="flex-1 p-4">
                    <ul>
                        {NAV_ITEMS.map(item => (
                            <li key={item} className="mb-2">
                                <button
                                    onClick={() => setActiveView(item)}
                                    className={`w-full text-left p-2 rounded-md ${activeView === item ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                                >
                                    {item}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            <main className="flex-1 flex flex-col">
                <header className="p-4 bg-white border-b border-gray-200 flex justify-end">
                    <button onClick={() => setAssistantVisible(true)} className="text-gray-500 hover:text-gray-800">
                        <AssistantIcon />
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto">
                    <MockContent title={activeView} />
                </div>
            </main>

            <AssistantPanel isVisible={isAssistantVisible} onClose={() => setAssistantVisible(false)} />
        </div>
    );
};

export default Dashboard;