
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { RobotIcon, XMarkIcon, PaperAirplaneIcon } from './icons';
import { GoogleDocElement, RulebookPage } from '../types';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

interface RulebookBotProps {
    pages: RulebookPage[];
}

const RulebookBot: React.FC<RulebookBotProps> = ({ pages }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [contextReady, setContextReady] = useState(false);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 'init',
                    role: 'model',
                    text: '안녕하세요! 저는 아카샤 심플리 가이드 봇 "심(Sim)"입니다. 규칙서 내용에 대해 궁금한 점이 있으신가요?'
                }
            ]);
        }
    }, [messages.length]);

    // Construct Context from pages
    useEffect(() => {
        if (pages.length === 0) return;

        const extractTextFromElement = (el: GoogleDocElement): string => {
            let text = '';
            if (el.text) text += el.text + ' ';
            if (el.runs) text += el.runs.map(r => r.text).join('') + ' ';
            if (el.rows) {
                text += el.rows.map(row => 
                    row.map(cell => 
                        typeof cell === 'string' ? cell : extractTextFromElement(cell)
                    ).join(' | ')
                ).join('\n') + '\n';
            }
            return text;
        };

        let fullText = "다음은 '아카샤 심플리' TRPG의 전체 규칙서 내용입니다:\n\n";
        pages.forEach(page => {
            fullText += `--- ${page.title} ---\n`;
            page.content.forEach(el => {
                fullText += extractTextFromElement(el) + '\n';
            });
            fullText += '\n';
        });

        // Initialize Chat Session with System Instruction
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatSessionRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `당신은 '아카샤 심플리' TRPG 시스템의 친절하고 박식한 가이드 로봇 '심(Sim)'입니다. 
                사용자의 질문에 대해 아래 제공된 [규칙서 내용]을 바탕으로 정확하고 이해하기 쉽게 답변해주세요.
                
                [지침]
                1. 답변은 친절하고 격식 있는 '해요체'를 사용하세요. (예: "그건 이렇게 판정해요!")
                2. 규칙서에 없는 내용이라면 "죄송해요, 그 내용은 규칙서에서 찾을 수 없어요."라고 정직하게 말하세요.
                3. 가능하다면 답변과 관련된 규칙서의 섹션 제목이나 페이지를 언급해주면 좋습니다.
                4. 답변은 너무 길지 않게 요점 위주로 설명해주세요.
                5. 로봇 캐릭터 컨셉을 유지해주세요 (예: 삐리릭, 알겠습니다!).

                [규칙서 내용]
                ${fullText}`,
            },
        });
        
        setContextReady(true);

    }, [pages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || !chatSessionRef.current || !contextReady) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({
                message: userMsg.text
            });
            
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: result.text || "오류가 발생하여 답변을 가져올 수 없습니다."
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "죄송해요, 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 font-sans">
            {/* Chat Window */}
            <div 
                className={`
                    absolute bottom-16 left-0 w-[320px] sm:w-[360px] 
                    bg-slate-800/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl overflow-hidden
                    transition-all duration-300 ease-out origin-bottom-left flex flex-col
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
                `}
                style={{ maxHeight: 'calc(100vh - 120px)' }}
            >
                {/* Header */}
                <div className="bg-slate-900/80 p-3 flex justify-between items-center border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="bg-cyan-600 p-1.5 rounded-full">
                            <RobotIcon className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-white font-bold text-sm">Sim (AI 가이드)</h3>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] custom-scrollbar bg-slate-900/30">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div 
                                className={`
                                    max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                                    ${msg.role === 'user' 
                                        ? 'bg-cyan-600 text-white rounded-br-none shadow-md' 
                                        : 'bg-slate-700 text-slate-200 rounded-bl-none shadow-sm border border-slate-600'
                                    }
                                `}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-700 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-600">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="규칙에 대해 물어보세요..."
                        disabled={!contextReady || isLoading}
                        className="flex-1 bg-slate-900 text-white text-sm rounded-full px-4 py-2 border border-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || !contextReady || isLoading}
                        className="bg-cyan-600 text-white p-2 rounded-full hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                    >
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300
                    ${isOpen ? 'bg-slate-700 text-white rotate-90' : 'bg-cyan-600 text-white hover:bg-cyan-500 hover:scale-110'}
                `}
                aria-label="AI 가이드 봇 열기"
            >
                {isOpen ? <XMarkIcon className="w-6 h-6" /> : <RobotIcon className="w-7 h-7" />}
            </button>
        </div>
    );
};

export default RulebookBot;
