

import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GoogleDocElement } from '../types';
import { 
    ChatBubbleIcon, PlusIcon, 
    LightningBoltIcon, BugAntIcon,
    SkullIcon, FireIcon, CpuChipIcon, SparklesIcon, SwordIcon, PersonIcon,
    BeastIcon, GunIcon, BeakerIcon, ShieldIcon, BowIcon, CitizenIcon
} from './icons';

interface GoogleDocRendererProps {
  elements: GoogleDocElement[];
  pageTitle?: string;
  footnotes?: Record<string, string>;
  onShowFootnote?: (content: string, rect: DOMRect) => void;
  onHideFootnote?: () => void;
}

// Skill Descriptions Mapping
const SKILL_DESCRIPTIONS: Record<string, string> = {
    "경갑옷": "가죽 갑옷이나 갬비슨 등 가벼운 방어구를 효율적으로 사용하여 기동성을 살리며 피해를 줄이는 기술입니다.",
    "단검술": "숨겨진 칼날이나 투척용 단검을 능숙하게 다룹니다. 기습과 빠른 연타에 특화되어 있습니다.",
    "중갑옷": "판금 갑옷 같은 무거운 장비를 입고도 지치지 않고 충격을 흘려보내는 기술입니다.",
    "한손검술": "검과 방패, 혹은 검 한 자루를 균형 있게 사용하는 가장 보편적이고 안정적인 전투 기술입니다.",
    "아덴류 검술": "특정 유파의 검술입니다. 화려한 기교보다는 실전적인 살상력을 중시합니다.",
    "왕국 레인저 궁술": "왕국 정규군의 사격술입니다. 장거리 정밀 사격과 지형지물을 이용한 사격에 능합니다.",
    "은신술": "발소리를 죽이고 그림자 속에 숨어 적의 눈을 피하는 기술입니다.",
    "소총술": "화약 무기인 소총을 다룹니다. 장전 속도와 조준의 정확도를 높입니다.",
    "투척술": "무기나 도구를 던져 적을 맞추는 기술입니다. 투창, 단검, 폭발물 등을 포함합니다.",
    "봉술": "긴 지팡이나 봉을 이용해 적을 제압하거나 거리를 유지하는 무술입니다.",
    "양손검술": "거대한 검을 휘둘러 파괴적인 위력을 발휘합니다. 방어보다는 공격에 치중합니다.",
    "권총술": "근거리 사격과 빠른 반응 속도를 요하는 권총 사격 기술입니다.",
    "중화기": "대포, 기관총 등 거치형 화기나 폭발성 무기를 다루는 전문 기술입니다.",
    "도끼술": "무게중심이 앞에 쏠린 도끼를 이용해 방패를 부수거나 갑옷을 찌그러뜨립니다.",
    "둔기술": "철퇴나 망치로 충격파를 주어 중갑을 입은 적에게도 유효타를 입힙니다.",
    "격투술": "맨몸으로 싸우는 기술입니다. 주먹, 발차기, 관절기 등을 포함합니다.",
    "소방": "화재를 진압하고 위험한 환경에서 인명을 구조하는 지식과 기술입니다.",
    "구조술": "재난 현장에서 효율적으로 생존자를 탐색하고 응급 처치하는 능력입니다.",
    "신비성 수치": "마법적인 현상에 대한 감화력이나 저항력을 나타내는 척도입니다.",
    "화염 마법": "불꽃을 일으켜 적을 태우거나 폭발을 일으키는 파괴적인 마법입니다.",
    "바람 마법": "공기의 흐름을 제어해 비행하거나 보이지 않는 칼날을 날리는 마법입니다.",
    "물 마법": "물을 조작하여 치유하거나, 얼음으로 변형시켜 공격/방어하는 마법입니다.",
    "신비 마법": "순수한 마력을 다루거나 현실의 법칙을 일시적으로 비틀어버리는 마법입니다.",
    "공학": "기계를 설계, 수리, 조작하거나 구조물의 약점을 파악하는 지식입니다.",
    "철학": "논리적 사고와 토론, 사상의 구조를 이해하여 대화에서 우위를 점합니다.",
    "사회과학": "사회의 구조, 경제, 심리 등을 이해하여 군중을 선동하거나 상황을 분석합니다.",
    "해킹 기술": "전자 보안 시스템을 뚫거나 정보를 탈취하는 디지털 기술입니다.",
    "묘기": "저글링, 줄타기 등 신체를 이용한 기예로 사람들의 이목을 끕니다.",
    "교섭술": "상대방을 설득하거나 협박하여 원하는 정보를 얻거나 거래를 성사시킵니다.",
    "정치학": "권력의 흐름을 읽고 파벌 간의 알력 다툼에서 이득을 취하는 능력입니다.",
    "기만": "거짓말, 변장, 속임수를 통해 상대를 혼란에 빠뜨립니다.",
    "연기": "다른 인격을 연기하여 감정을 속이거나 상황을 모면합니다.",
    "차량 운전": "자동차나 트럭 등 지상 이동 수단을 능숙하게 조작합니다.",
    "비행기 운전": "복잡한 비행 장치를 조작하여 하늘을 납니다.",
    "승마": "말이나 그와 유사한 탈것을 타고 이동하거나 전투를 수행합니다."
};

const getCellAlignmentClass = (cell: string | GoogleDocElement | undefined): string => {
    if (typeof cell !== 'object' || cell === null || !cell.alignment) return 'text-left';
    
    const alignment = cell.alignment.toUpperCase();
    switch (alignment) {
        case 'CENTER': return 'text-center';
        case 'END': return 'text-right';
        case 'JUSTIFY': return 'text-justify';
        case 'START':
        default: return 'text-left';
    }
};

const getRawCellText = (cell: string | GoogleDocElement | undefined): string => {
    if (!cell) return '';
    if (typeof cell === 'string') return cell;
    if (cell.runs) return cell.runs.map(r => r.text || '').join('');
    return cell.text || '';
};

const getCellText = (cell: string | GoogleDocElement | undefined): string => {
    return getRawCellText(cell).replace(/\[npc\]|\[skill\]/gi, '').trim();
};

const isExplicitNpcTable = (element: GoogleDocElement): boolean => {
    if (element.type !== 'table' || !element.rows) return false;
    const tableText = element.rows.flat().map(getRawCellText).join(' ');
    return /\[npc\]/i.test(tableText);
};

const isSkillTable = (element: GoogleDocElement): boolean => {
    if (element.type !== 'table' || !element.rows) return false;
    const tableText = element.rows.flat().map(getRawCellText).join(' ');
    return /\[skill\]/i.test(tableText);
};

const isAbilityExampleTable = (element: GoogleDocElement): boolean => {
    if (isExplicitNpcTable(element) || isSkillTable(element)) return false;
    if (element.type !== 'table' || !element.rows) return false;
    const tableText = element.rows.flat().map(getCellText).join(' ');
    return tableText.includes('조건') && tableText.includes('충전');
};

const isItemExampleTable = (element: GoogleDocElement): boolean => {
    if (isExplicitNpcTable(element) || isSkillTable(element)) return false;
    if (element.type !== 'table' || !element.rows) return false;
    const tableText = element.rows.flat().map(getCellText).join(' ');

    // Add a check to prevent misclassifying NPC tables as items.
    // NPCs use '생명력' (HP), which items do not. This is for static data heuristic.
    if (tableText.includes('생명력')) {
        return false;
    }

    return tableText.includes('내구도') && tableText.includes('부피');
};

const isFAQHeaderTable = (element: GoogleDocElement): boolean => {
    if (element.type !== 'table' || !element.rows || element.rows.length < 2) return false;
    
    const firstRowText = getCellText(element.rows[0]?.[0]).trim();
    const secondRowTexts = element.rows[1].map(cell => getCellText(cell).trim());

    // Detects the specific two-row header table for FAQs to hide it.
    // Row 1 starts with "Q & A"
    // Row 2 is ["질문", "분야", "답변"]
    return firstRowText === 'Q & A' &&
           secondRowTexts[0] === '질문' &&
           secondRowTexts[1] === '분야' &&
           secondRowTexts[2] === '답변';
};

// This handles the static data structure with a header row
const isFAQTable = (element: GoogleDocElement): boolean => {
    if (element.type !== 'table' || !element.rows || element.rows.length < 1) return false;
    // Don't mistake the header-only table for a full FAQ table
    if (isFAQHeaderTable(element)) return false; 
    const header = element.rows[0].map(cell => getCellText(cell).trim());
    return header[0] === '질문' && header[1] === '분야' && header[2] === '답변';
};

// This is a heuristic to identify the live data structure (one Q&A per table)
const isPossibleFAQItemTable = (element: GoogleDocElement): boolean => {
    if (element.type !== 'table' || !element.rows) return false;
    // Avoid classifying ability/item/header tables as FAQ items
    if (isAbilityExampleTable(element) || isItemExampleTable(element) || isFAQHeaderTable(element) || isSkillTable(element)) return false;
    // An FAQ item table has exactly one row with three cells.
    return element.rows.length === 1 && element.rows[0].length === 3;
};

// Heuristic for Static/Fallback Data Format: Paragraph -> Table -> List
const isNpcStatBlockStart = (element: GoogleDocElement, nextElement?: GoogleDocElement): boolean => {
    if (
        element.type !== 'paragraph' ||
        !element.isBold ||
        !element.text ||
        !element.text.includes('.')
    ) {
        return false;
    }

    if (
        !nextElement ||
        nextElement.type !== 'table' ||
        !nextElement.rows ||
        nextElement.rows.length === 0
    ) {
        return false;
    }

    const statText = nextElement.rows.flat().map(getCellText).join(' ');
    const hasStats =
        statText.includes('생명력') ||
        statText.includes('총 부피') ||
        statText.includes('기술 점수');
    
    return hasStats && element.text.length < 150;
};

// Heuristic for Live Data Format: Single unified table
const isNpcCardTable = (element: GoogleDocElement): boolean => {
    if (element.type !== 'table' || !element.rows || element.rows.length < 3) return false;
    
    const firstCellText = getCellText(element.rows[0]?.[0]);
    const secondRowText = element.rows[1]?.map(getCellText).join(' ') || '';
    const thirdCellText = getCellText(element.rows[2]?.[0]).trim();

    const hasNameDesc = firstCellText.includes('.');
    const hasStats = secondRowText.includes('생명력') || secondRowText.includes('총 부피') || secondRowText.includes('기술 점수');
    const hasActionHeader = ['주요 행동', '보조 행동', '지속', '지속 효과', '지속 효과.'].some(h => thirdCellText.startsWith(h));

    // Make sure it's not an ability/item card
    if (isAbilityExampleTable(element) || isItemExampleTable(element)) return false;

    return hasNameDesc && hasStats && hasActionHeader;
};

// Helper for Chat Detection
const getChatSpeaker = (element: GoogleDocElement): 'M' | 'L' | null => {
    // Check text property
    let text = element.text || '';
    // If text is empty, check runs
    if (!text && element.runs) {
        text = element.runs.map(r => r.text).join('');
    }
    
    text = text.trim();
    if (text.startsWith('M:') || text.startsWith('M :')) return 'M';
    if (text.startsWith('L:') || text.startsWith('L :')) return 'L';
    return null;
};

// Helper component to create invisible anchor points for table rows within transformed components
const RowAnchors: React.FC<{ tableId?: string, rowCount: number }> = ({ tableId, rowCount }) => {
    if (!tableId || rowCount <= 0) return null;
    return (
        <div className="absolute top-0 left-0 w-full h-0 overflow-visible pointer-events-none">
            {Array.from({ length: rowCount }).map((_, i) => (
                <div key={i} id={`${tableId}-row-${i}`} className="absolute top-0" />
            ))}
        </div>
    );
};


const FAQAccordion: React.FC<{ rows: (string | GoogleDocElement)[][], id?: string, itemIds?: string[] }> = ({ rows, id, itemIds }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqData = useMemo(() => {
        // Skip header row (index 0)
        if (!rows || rows.length <= 1) return [];
        return rows.slice(1).map(row => {
            const questionCellText = getCellText(row[0]).trim();
            const lines = questionCellText.split(/\n+/);

            // The last line is the asker, the rest is the question.
            const question = lines.length > 1 ? lines.slice(0, -1).join('\n').trim() : lines[0].trim();
            const asker = lines.length > 1 ? lines[lines.length - 1].trim() : '익명';

            return {
                question,
                asker,
                category: getCellText(row[1]).trim(),
                answer: getCellText(row[2]).trim(),
            };
        });
    }, [rows]);

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div id={id} data-highlight-container="true" className="space-y-4 not-prose my-8 p-4 bg-slate-900/50 rounded-xl border border-slate-700 scroll-mt-24 relative">
            {faqData.map((item, index) => (
                <div 
                    key={index} 
                    id={itemIds ? itemIds[index] : (id ? `${id}-row-${index + 1}` : undefined)}
                    className={`bg-slate-800 rounded-lg shadow-md transition-all duration-300 ease-in-out border scroll-mt-24 ${openIndex === index ? 'border-cyan-500 ring-2 ring-cyan-500/50' : 'border-slate-700 hover:border-slate-600'}`}
                >
                    <button
                        onClick={() => handleToggle(index)}
                        className="w-full text-left p-4 focus:outline-none"
                        aria-expanded={openIndex === index}
                    >
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-start gap-3">
                                    <ChatBubbleIcon className="w-7 h-7 text-cyan-400 flex-shrink-0 mt-0.5" />
                                    <span className="font-bold text-lg text-white leading-tight">{item.question}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 pl-10">
                                    {item.category && (
                                      <span className="font-semibold bg-slate-700 text-cyan-400 px-2 py-0.5 rounded">{item.category}</span>
                                    )}
                                    <span>·</span>
                                    <span>질문자: {item.asker}</span>
                                </div>
                            </div>
                            <div className="transition-transform duration-300 ease-in-out flex-shrink-0" style={{ transform: openIndex === index ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                               <PlusIcon className="w-6 h-6 text-slate-400" />
                            </div>
                        </div>
                    </button>
                    <div className={`faq-answer-wrapper ${openIndex === index ? 'open' : ''}`}>
                        <div className="faq-answer-content">
                            <div className="px-4 pb-5 pt-3 border-t border-slate-700/70">
                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{item.answer}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const SkillTagExplorer: React.FC<{ rows: (string | GoogleDocElement)[][], id?: string }> = ({ rows, id }) => {
    const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
    const [dynamicDescriptions, setDynamicDescriptions] = useState<Record<string, string>>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('ai_skill_descriptions');
                return saved ? JSON.parse(saved) : {};
            } catch (e) {
                console.error("Failed to load skill descriptions from localStorage", e);
                return {};
            }
        }
        return {};
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);

    const skills = useMemo(() => {
        if (!rows) return [];
        const extractedSkills: string[] = [];
        rows.forEach(row => {
            row.forEach(cell => {
                const text = getCellText(cell);
                if (text) {
                    // Split text by newlines to support multiple skills in one cell
                    const parts = text.split(/\r?\n/);
                    parts.forEach(part => {
                        const trimmed = part.trim();
                        if (trimmed) {
                            extractedSkills.push(trimmed);
                        }
                    });
                }
            });
        });
        // Sort skills alphabetically (Korean support)
        return extractedSkills.sort((a, b) => a.localeCompare(b));
    }, [rows]);

    useEffect(() => {
        if (!selectedSkill) return;
        // If we already have a description, clear error and return
        if (SKILL_DESCRIPTIONS[selectedSkill] || dynamicDescriptions[selectedSkill]) {
            setGenerationError(null);
            return;
        }

        let isMounted = true;
        const generateDescription = async () => {
            setIsGenerating(true);
            setGenerationError(null);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `TRPG '아카샤 심플리'의 기술인 '${selectedSkill}'을 1~2문장으로(최대 2줄) 아주 짧고 간결하게 설명해줘. 
                    현대/판타지 배경에 어울리게 서술하고, 말투는 정중한 설명조(~입니다)를 사용해.
                    ** 같은 마크다운 문법이나 특수기호는 절대 사용하지 말고 순수 텍스트로만 출력해.`,
                });
                if (isMounted) {
                    const text = response.text;
                    if (text) {
                        setDynamicDescriptions(prev => {
                            const next = { ...prev, [selectedSkill]: text.trim() };
                            localStorage.setItem('ai_skill_descriptions', JSON.stringify(next));
                            return next;
                        });
                    } else {
                        setGenerationError("설명을 생성할 수 없습니다.");
                    }
                }
            } catch (error) {
                console.error("AI Description Generation Error:", error);
                if (isMounted) setGenerationError("AI 연결에 실패했습니다.");
            } finally {
                if (isMounted) setIsGenerating(false);
            }
        };
        generateDescription();

        return () => { isMounted = false; };
    }, [selectedSkill, dynamicDescriptions]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        const target = e.currentTarget;
        target.classList.remove('highlight-animate');
        void target.offsetWidth; 
        target.classList.add('highlight-animate');
        
        setTimeout(() => target.classList.remove('highlight-animate'), 3000);
    };

    const description = selectedSkill ? (SKILL_DESCRIPTIONS[selectedSkill] || dynamicDescriptions[selectedSkill]) : null;

    return (
        // Split container to avoid highlight clipping. Outer div handles positioning.
        <div className="not-prose my-8 relative">
            <div 
                id={id} 
                data-highlight-container="true" 
                onClick={handleClick}
                className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden scroll-mt-24 cursor-pointer hover:border-cyan-500/30 hover:shadow-cyan-500/10 transition-all duration-200"
            >
                <RowAnchors tableId={id} rowCount={rows.length} />
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <CpuChipIcon className="w-24 h-24 text-cyan-500" />
                </div>
                
                <h4 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2 flex items-center gap-2">
                    <span>기술 태그 살펴보기</span>
                    <span className="text-xs text-slate-500 font-normal normal-case ml-auto">태그를 선택하여 설명을 확인하세요</span>
                </h4>
                
                <div className="flex flex-wrap gap-2 mb-6">
                    {skills.map((skill, idx) => (
                        <button
                            key={`${skill}-${idx}`}
                            onClick={(e) => {
                                // Don't stop propagation so the card highlights too, 
                                // or stop it if we only want the button. 
                                // User said "Table design highlights when clicked". 
                                // Clicking a button is part of using the table, so let it bubble.
                                setSelectedSkill(skill === selectedSkill ? null : skill);
                            }}
                            className={`
                                px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 transform border
                                ${selectedSkill === skill 
                                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] scale-105' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700/50 hover:text-cyan-300 hover:border-cyan-500/50 hover:scale-110'
                                }
                            `}
                        >
                            {skill}
                        </button>
                    ))}
                </div>
                
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${selectedSkill ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                    {selectedSkill && (
                        <div className="bg-slate-800/80 rounded-lg p-5 border border-cyan-500/30 shadow-inner relative animate-fade-in-fast backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <SparklesIcon className={`w-5 h-5 text-cyan-400 ${isGenerating && !description ? 'animate-spin' : ''}`} />
                                <h5 className="text-cyan-300 font-bold text-lg">{selectedSkill}</h5>
                            </div>
                            <p className="text-slate-200 leading-relaxed text-sm min-h-[3rem]">
                                {description || (isGenerating ? (
                                    <span className="text-slate-400 animate-pulse">AI가 기술 설명을 생성하고 있습니다...</span>
                                ) : generationError ? (
                                    <span className="text-red-400 text-xs">{generationError}</span>
                                ) : (
                                    "이 기술에 대한 상세 설명이 아직 기록되지 않았습니다."
                                ))}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ... (Rest of NpcIcon, NpcCard, ChatSequence, CombatExampleSwitcher components remain unchanged) ...
// ... (Including NpcData interface, NpcIcon, NpcCard, ChatSequence, CombatExampleSwitcher) ...

interface NpcData {
    name: string;
    description: string;
    stats: { label: string; value: string }[];
    actions: {
        category: string;
        abilities: { name: string; description: string; charge?: number }[];
    }[];
    sourceRowCount: number; // For mapping table rows to component
}

const NpcIcon: React.FC<{ name: string; description: string; className?: string }> = ({ name, description, className }) => {
    const text = (name + ' ' + description).toLowerCase();
    
    // 1. Undead (Skull)
    if (text.match(/좀비|스켈레톤|유령|언데드|시체|망령|귀신|해골|망자|리치|뱀파이어|강시|구울|undead|zombie|skeleton|ghost|ghoul/)) {
        return <SkullIcon className={className} />;
    }

    // 2. Mechanical / Robot (Chip)
    if (text.match(/로봇|기계|안드로이드|드론|터렛|메카|슈트|공업|장갑|전차|사이보그|automaton|machine|mech|robot/)) {
        return <CpuChipIcon className={className} />;
    }

    // 3. Elemental (Fire)
    if (text.match(/샐러맨더|화염|불꽃|이프리트|정령|마그마|용암|elemental|fire|flame/)) {
        return <FireIcon className={className} />;
    }

    // 4. Beast / Monster (Beast/Paw) vs Insect (Bug)
    if (text.match(/벌레|곤충|거미|지네|개미|전갈|insect|bug|spider/)) {
        return <BugAntIcon className={className} />;
    }
    if (text.match(/늑대|곰|야수|동물|크리처|괴물|드래곤|용|개|호랑이|사자|독수리|맹수|마수|와이번|비스트|몬스터|beast|animal|wolf|bear|dragon/)) {
        return <BeastIcon className={className} />;
    }
    
    // 5. Specialist / Science (Beaker)
    if (text.match(/부식|독|약품|연금술|화학|전문가|플라스크|연구원|박사|과학|실험|포션|alchemist|scientist|poison/)) {
        return <BeakerIcon className={className} />;
    }

    // 6. Ranged / Gun (Gun)
    if (text.match(/보병|소총|권총|군인|사격|저격|총|갱단|경찰|특수부대|솔져|머스킷|거너|gun|rifle|sniper|soldier/)) {
        return <GunIcon className={className} />;
    }

    // 7. Ranged / Bow (Bow)
    if (text.match(/궁수|활|사수|화살|헌터|사냥꾼|레인저|아처|bow|archer|hunter/)) {
        return <BowIcon className={className} />;
    }

    // 8. Magic (Sparkles)
    if (text.match(/주술사|마법사|사제|위자드|클레릭|소서러|신비|마녀|매직|워록|성직자|힐러|메이지|wizard|mage|cleric|magic/)) {
        return <SparklesIcon className={className} />;
    }

    // 9. Defense / Tank (Shield)
    if (text.match(/기사|가드|경비|방패|갑옷|성기사|중갑|팔라딘|수호자|탱커|나이트|knight|guard|shield/)) {
        return <ShieldIcon className={className} />;
    }

    // 10. Melee / Sword (Sword)
    if (text.match(/잡졸|전사|병사|암살자|검사|용사|대장|용병|해적|무사|파이터|검|칼|워리어|로그|버서커|sword|warrior|fighter/)) {
        return <SwordIcon className={className} />;
    }

    // 11. Citizen / National (Added '국민')
    if (text.match(/국민|시민|citizen/)) {
        return <CitizenIcon className={className} />;
    }
    
    // 12. Civilian (Person)
    if (text.match(/민간인|사람|주민|평민|civilian|villager|commoner|human/)) {
        return <PersonIcon className={className} />;
    }
    
    // Default
    return <PersonIcon className={className} />;
};


const NpcCard: React.FC<{ npc: NpcData, id?: string }> = ({ npc, id }) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        const target = e.currentTarget;
        target.classList.remove('highlight-animate');
        void target.offsetWidth; 
        target.classList.add('highlight-animate');
        
        setTimeout(() => target.classList.remove('highlight-animate'), 3000);
    };

    return (
    <div className="not-prose my-6 relative rounded-xl">
        <div 
            id={id} 
            data-highlight-container="true" 
            onClick={handleClick}
            className="p-6 bg-slate-900/50 rounded-xl border border-slate-700 shadow-lg relative z-10 scroll-mt-24 cursor-pointer hover:border-cyan-500/30 hover:shadow-cyan-500/10 transition-all duration-200"
        >
            <RowAnchors tableId={id} rowCount={npc.sourceRowCount} />

            <div className="border-b border-slate-600 pb-4 mb-4 flex items-start justify-between gap-4">
                <div className="flex-grow">
                    <h3 className="text-2xl font-bold text-cyan-400">{npc.name}</h3>
                    <p className="text-slate-400 italic mt-1">{npc.description}</p>
                </div>
                <NpcIcon 
                    name={npc.name} 
                    description={npc.description}
                    className="w-10 h-10 text-slate-500 flex-shrink-0 mt-1" 
                />
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
                {npc.stats.map(stat => (
                    <div key={stat.label} className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-400">{stat.label.replace(/\.$/, '')}:</span>
                        <span className="text-lg font-bold text-white">{stat.value}</span>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                {npc.actions.map(category => (
                    <div key={category.category}>
                        <h4 className="font-bold text-lg text-slate-300 border-b border-slate-700 pb-1 mb-2">{category.category}</h4>
                        <ul className="space-y-3 list-none p-0">
                            {category.abilities.map((ability, index) => (
                                <li key={index} className="bg-slate-800/50 p-3 rounded-md">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-grow">
                                            {ability.name ? (
                                                <>
                                                    <strong className="font-semibold text-slate-100">{ability.name}.</strong>
                                                    <span className="text-slate-300 ml-1">{ability.description}</span>
                                                </>
                                            ) : (
                                                <span className="text-slate-300">{ability.description}</span>
                                            )}
                                        </div>
                                        {ability.charge !== undefined && (
                                            <div title="충전" className="flex-shrink-0 flex items-center gap-1 bg-slate-700 text-amber-400 px-2 py-1 rounded-full text-xs font-bold">
                                                <LightningBoltIcon className="w-3 h-3" />
                                                <span>충전 {ability.charge}</span>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    </div>
    );
};


const ChatSequence: React.FC<{
    messages: { speaker: 'M' | 'L', elements: GoogleDocElement[] }[];
    renderContent: (el: GoogleDocElement) => React.ReactNode;
}> = ({ messages, renderContent }) => {
    return (
        <div className="flex flex-col space-y-6 my-8 not-prose px-2 sm:px-4">
            {messages.map((msg, idx) => {
                const isLeft = msg.speaker === 'M';
                
                return (
                    <div key={idx} className={`flex w-full ${isLeft ? 'justify-start' : 'justify-end'}`}>
                        <div className={`flex max-w-[90%] sm:max-w-[80%] gap-3 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                            {/* Avatar */}
                            <div className="flex-shrink-0 flex flex-col justify-end pb-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                                    isLeft 
                                        ? 'bg-slate-700 text-slate-300 ring-1 ring-slate-600' 
                                        : 'bg-cyan-600 text-white ring-1 ring-cyan-500'
                                }`}>
                                    {msg.speaker}
                                </div>
                            </div>
                            
                            {/* Bubble */}
                            <div className={`relative px-4 py-3 shadow-md border min-w-[120px] ${
                                isLeft
                                    ? 'bg-slate-800 border-slate-700 rounded-2xl rounded-bl-none text-slate-200'
                                    : 'bg-cyan-900/40 border-cyan-700/50 rounded-2xl rounded-br-none text-slate-100'
                            }`}>
                                <div className="space-y-2 text-sm leading-relaxed">
                                    {msg.elements.map((el, elIdx) => {
                                        // Remove prefix for the first element
                                        let contentEl = el;
                                        if (elIdx === 0) {
                                            // Shallow copy is enough if we only modify top level props, but runs are nested.
                                            contentEl = JSON.parse(JSON.stringify(el));
                                            const prefixRegex = /^[ML]\s*:\s*/;
                                            if (contentEl.runs) {
                                                for (const run of contentEl.runs) {
                                                    if (run.text && prefixRegex.test(run.text)) {
                                                        run.text = run.text.replace(prefixRegex, '');
                                                        break;
                                                    }
                                                }
                                            } else if (contentEl.text) {
                                                contentEl.text = contentEl.text.replace(prefixRegex, '');
                                            }
                                        }

                                        if (contentEl.type === 'list_item') {
                                             return (
                                                <div key={elIdx} id={el.id} className="flex gap-2 ml-1 text-left scroll-mt-24">
                                                    <span className={`select-none mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLeft ? 'bg-slate-500' : 'bg-cyan-500'}`}></span>
                                                    <div className="flex-1">{renderContent(contentEl)}</div>
                                                </div>
                                            );
                                        }
                                        
                                        return (
                                            <div key={elIdx} id={el.id} className={`${contentEl.isBold ? 'font-bold' : ''} ${contentEl.isItalic ? 'italic' : ''} ${contentEl.alignment === 'CENTER' ? 'text-center' : 'text-center'} scroll-mt-24`}>
                                                {renderContent(contentEl)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const CombatExampleSwitcher: React.FC<{
    introElements: GoogleDocElement[];
    narrativeElements: GoogleDocElement[];
    explanationElements: GoogleDocElement[];
    renderElement: (el: GoogleDocElement, idx: number) => React.ReactNode;
}> = ({ introElements, narrativeElements, explanationElements, renderElement }) => {
    const [showExplanation, setShowExplanation] = useState(false);

    // Re-calculating indices for rendering to avoid key conflicts or issues, 
    // though in the parent loop indices are global, here we treat them locally.
    const renderContent = (elements: GoogleDocElement[]) => (
        <div className="space-y-4">
            {elements.map((el, idx) => renderElement(el, idx))}
        </div>
    );

    return (
        <div className="relative group my-8">
            {/* Intro Content (Always Visible) */}
            <div className="mb-6">
                {renderContent(introElements)}
            </div>

            <div className="relative overflow-hidden min-h-[300px] border border-slate-700/50 rounded-xl bg-slate-900/30 p-6 shadow-inner">
                {/* Headers Display */}
                <h3 className="font-semibold text-cyan-400 mb-4 text-xl border-b border-slate-700 pb-2">
                    {showExplanation ? '해설' : '진행 예시'}
                </h3>

                {/* Content Area with Transition */}
                <div className="relative">
                    {/* Narrative Layer */}
                    <div 
                        className={`transition-all duration-500 ease-in-out transform ${
                            showExplanation 
                                ? 'opacity-0 translate-x-[20px] pointer-events-none absolute top-0 left-0 w-full' 
                                : 'opacity-100 translate-x-0 relative'
                        }`}
                    >
                        {renderContent(narrativeElements)}
                    </div>

                    {/* Explanation Layer */}
                    <div 
                        className={`transition-all duration-500 ease-in-out transform ${
                            showExplanation 
                                ? 'opacity-100 translate-x-0 relative' 
                                : 'opacity-0 -translate-x-[20px] pointer-events-none absolute top-0 left-0 w-full'
                        }`}
                    >
                         {renderContent(explanationElements)}
                    </div>
                </div>

                {/* Floating Switch Button */}
                <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className={`absolute top-1/2 -translate-y-1/2 z-20 
                        w-10 py-6 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.4)] 
                        transition-all duration-500 ease-out cursor-pointer border border-cyan-500/50
                        opacity-0 group-hover:opacity-100
                        flex items-center justify-center
                        ${showExplanation 
                            ? 'bg-slate-800 text-cyan-400 right-2' 
                            : 'bg-cyan-600 text-white right-6'
                        }
                        hover:scale-105 active:scale-95
                    `}
                    title={showExplanation ? "원문으로 돌아가기" : "해설 보기"}
                >
                    <div 
                        className="text-xs font-bold tracking-widest uppercase flex items-center justify-center h-full"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                    >
                        {showExplanation ? '원문 보기' : '해설 보기'}
                    </div>
                </button>
            </div>
        </div>
    );
};


const GoogleDocRenderer: React.FC<GoogleDocRendererProps> = ({ elements, pageTitle, footnotes, onShowFootnote, onHideFootnote }) => {
    
  if (!elements || elements.length === 0) {
    return <p className="text-slate-400 italic">규칙서 내용이 없습니다.</p>;
  }

  const usedFootnotes = new Set<string>();

  const getBlockFormatClasses = (element: GoogleDocElement) => {
    let classes = '';
    // Normalize alignment to uppercase to handle 'center' vs 'CENTER'
    const alignment = element.alignment?.toUpperCase();
    
    switch (alignment) {
      case 'CENTER': classes += 'text-center '; break;
      case 'END': classes += 'text-right '; break;
      case 'JUSTIFY': classes += 'text-justify '; break;
      case 'START':
      default: classes += 'text-left '; break;
    }
    // Block-level formatting if runs is not present
    if (!element.runs) {
        if (element.isBold) classes += 'font-bold ';
        if (element.isItalic) classes += 'italic ';
        if (element.isUnderline) classes += 'underline ';
    }
    // Preserve whitespace and newlines
    classes += 'whitespace-pre-wrap ';
    return classes.trim();
  };

  const getTextStyle = (element: GoogleDocElement): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (element.fontSize) {
      style.fontSize = `${element.fontSize}pt`;
      style.lineHeight = '1.5';
    }
    return style;
  };

  const handleAnchorClick = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    const headerOffset = 100;
    if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });

        // Highlight effect logic replicated here for consistency
        let highlightTarget = element;
        // Handle hidden anchor elements (used in grouped components like NPCs)
        if (element.classList.contains('absolute') && element.classList.contains('-top-20')) {
             if (element.nextElementSibling instanceof HTMLElement) {
                 highlightTarget = element.nextElementSibling;
             }
        }

        highlightTarget.classList.remove('highlight-animate');
        void highlightTarget.offsetWidth; // Force reflow
        highlightTarget.classList.add('highlight-animate');
        
        setTimeout(() => highlightTarget.classList.remove('highlight-animate'), 2000);
    }
  };

  const renderTextAndFootnotes = (text: string | number | undefined | null) => {
    if (text === null || text === undefined || text === '') return null;
    
    // Ensure text is a string and replace /r and \r with newlines
    const strText = String(text).replace(/\/r/g, '\n').replace(/\r/g, '\n');

    const parts = strText.split(/(\[\d+\])/g);

    return parts.map((part, index) => {
        if (/^\[\d+\]$/.test(part)) {
            const num = part.replace(/[\[\]]/g, '');
            if (footnotes && footnotes[num]) {
                usedFootnotes.add(num);
            }
            const refId = `footnote-ref-${num}`;
            const targetId = `footnote-body-${num}`;

            const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
                if (footnotes && footnotes[num] && onShowFootnote) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onShowFootnote(`[${num}] ${footnotes[num]}`, rect);
                }
            };
            const handleMouseLeave = () => {
                if (onHideFootnote) onHideFootnote();
            };

            return (
                <span key={index} id={refId} className="inline-block align-middle mx-0.5 relative -top-0.5">
                    <button
                        onClick={(e) => handleAnchorClick(e, targetId)}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        aria-label={`각주 ${num}번`}
                    >
                        <ChatBubbleIcon className="w-4 h-4" />
                    </button>
                </span>
            );
        }
        return part;
    });
  };

  const renderContent = (element: GoogleDocElement) => {
    if (element.runs && element.runs.length > 0) {
      return element.runs.map((run, index) => {
        const runClasses = [];
        if (run.isBold) runClasses.push('font-bold');
        if (run.isItalic) runClasses.push('italic');
        if (run.isUnderline) runClasses.push('underline');
        
        const content = (
          <span className={runClasses.join(' ')}>
            {renderTextAndFootnotes(run.text)}
          </span>
        );

        if (run.linkUrl) {
            return (
                <a
                    key={index}
                    href={run.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline hover:text-cyan-300 transition-colors"
                >{content}</a>
            );
        }
        return React.cloneElement(content, { key: index });
      });
    }
    // Fallback for older data structure or simple text elements
    if (element.text) {
      return renderTextAndFootnotes(element.text);
    }
    return null;
  }

  // Helper to render cell content whether it's a string or a GoogleDocElement object
  const renderCell = (cell: string | GoogleDocElement | undefined): React.ReactNode => {
      if (typeof cell === 'object' && cell !== null) {
          return renderContent(cell);
      }
      return renderTextAndFootnotes(cell as string);
  };

  const renderElement = (element: GoogleDocElement, index: number) => {
    // If Rulebook.tsx didn't assign an ID (legacy support), generate one.
    // However, we expect Rulebook.tsx to handle it now.
    const id = element.id || (element.text || `element-${index}`)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-\uAC00-\uD7A3]/g, '');

    const formatClasses = getBlockFormatClasses(element);
    const style = getTextStyle(element);

    switch (element.type) {
      case 'title':
        return (
          <h1 key={index} id={id} className={`font-extrabold text-cyan-400 border-b border-slate-600 pb-4 mb-6 scroll-mt-24 ${formatClasses}`} style={{ ...style, fontSize: style.fontSize || '3.5rem' }}>
            {renderContent(element)}
          </h1>
        );
      case 'heading_1':
        return (
          <h1 key={index} id={id} className={`font-bold text-cyan-400 border-b border-slate-600 pb-2 mb-4 mt-8 scroll-mt-24 ${formatClasses}`} style={{ ...style, fontSize: style.fontSize || '2.25rem' }}>
            {renderContent(element)}
          </h1>
        );
      case 'heading_2':
        return (
          <h2 key={index} id={id} className={`font-bold text-cyan-400 mb-3 mt-6 scroll-mt-24 ${formatClasses}`} style={{ ...style, fontSize: style.fontSize || '1.875rem' }}>
            {renderContent(element)}
          </h2>
        );
      case 'heading_3':
        return (
          <h3 key={index} id={id} className={`font-semibold text-cyan-400 mb-2 mt-4 scroll-mt-24 ${formatClasses}`} style={{ ...style, fontSize: style.fontSize || '1.5rem' }}>
            {renderContent(element)}
          </h3>
        );
      case 'heading_4':
      case 'heading_5':
      case 'heading_6':
         return (
          <h4 key={index} id={id} className={`font-medium text-cyan-400 mb-2 mt-3 scroll-mt-24 ${formatClasses}`} style={{ ...style, fontSize: style.fontSize || '1.25rem' }}>
            {renderContent(element)}
          </h4>
         );
      case 'quote':
        return (
          <blockquote key={index} id={id} className={`border-l-4 border-cyan-500 pl-4 py-2 my-4 text-slate-400 bg-slate-800/50 rounded-r-md scroll-mt-24 ${formatClasses}`} style={style}>
            {renderContent(element)}
          </blockquote>
        );
      case 'table':
        return (
          // Split wrapper for highlighting/positioning vs inner div for scrolling
          <div key={index} id={id} data-highlight-container="true" className="my-6 scroll-mt-24 rounded-lg relative">
              <div className="overflow-x-auto p-1.5">
                <table className="w-full border-collapse text-sm table-fixed">
                  <thead>
                    <tr className="bg-slate-700/80">
                      {element.rows?.[0]?.map((cell, cIndex) => (
                        <th key={cIndex} className={`border border-slate-600 p-3 font-bold text-cyan-300 whitespace-pre-wrap break-words ${getCellAlignmentClass(cell)}`}>
                            {renderCell(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {element.rows?.slice(1).map((row, rIndex) => (
                      <tr key={rIndex} id={`${id}-row-${rIndex + 1}`} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                        {row.map((cell, cIndex) => (
                          <td key={cIndex} className={`border border-slate-600 p-3 text-slate-300 whitespace-pre-wrap break-words ${getCellAlignmentClass(cell)}`}>
                              {renderCell(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        );
      case 'paragraph':
      default:
        const hasContent = (element.runs && element.runs.some(r => r.text && String(r.text).trim() !== '')) || (element.text && String(element.text).trim() !== '');
        if (!hasContent) return null;
        
        return (
          <p key={index} id={id} className={`mb-3 leading-relaxed text-slate-300 scroll-mt-24 ${formatClasses}`} style={style}>
            {renderContent(element)}
          </p>
        );
    }
  };

  const ExampleCard: React.FC<{
    title: React.ReactNode;
    description: React.ReactNode;
    footer: React.ReactNode;
    id?: string;
    rowCount?: number;
  }> = ({ title, description, footer, id, rowCount }) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        const target = e.currentTarget;
        target.classList.remove('highlight-animate');
        void target.offsetWidth; 
        target.classList.add('highlight-animate');
        
        setTimeout(() => target.classList.remove('highlight-animate'), 3000);
    };

    return (
        <div className="h-full relative">
            <div 
                id={id} 
                data-highlight-container="true" 
                onClick={handleClick}
                className="p-4 rounded-lg border-2 bg-slate-800/50 border-slate-700 not-prose flex flex-col h-full relative z-10 scroll-mt-24 cursor-pointer hover:border-cyan-500/30 hover:bg-slate-800 hover:shadow-md transition-all duration-200"
            >
                <RowAnchors tableId={id} rowCount={rowCount || 0} />
                <div className="flex-grow">
                    <h4 className="font-bold text-white">{title}</h4>
                    <div className="text-sm text-slate-300 mt-2">
                        {description}
                    </div>
                </div>
                <div className="pt-2">
                    {footer}
                </div>
            </div>
        </div>
    );
  };
  
  const parseExampleCardData = (rows: (string | GoogleDocElement)[][]): {
    title: React.ReactNode;
    description: React.ReactNode | null;
    details: { label: string; value: React.ReactNode }[];
  } | null => {
    if (!rows || rows.length === 0) return null;

    let titleNode: React.ReactNode;
    let descriptionNode: React.ReactNode | null = null;
    const details: { label: string; value: React.ReactNode }[] = [];
    const keywords = ['조건', '충전', '내구도', '부피'];

    // --- Format detection ---
    const hasLabelsInCol1 = rows.some(r => r.length > 1 && keywords.includes(getCellText(r[1])));

    if (hasLabelsInCol1) {
        // LIVE FORMAT (labels are in column 1)
        const combinedText = getCellText(rows[0]?.[0] || '');
        const parts = combinedText.split(/\n\n|\n/).filter(p => p.trim() !== '');
        titleNode = renderTextAndFootnotes(parts[0]);
        if (parts.length > 1) {
            descriptionNode = <p>{renderTextAndFootnotes(parts.slice(1).join('\n').trim())}</p>;
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2) continue;
            
            const labelText = getCellText(row[1]);
            const foundKeyword = keywords.find(kw => labelText.includes(kw));
            
            if (foundKeyword) {
                // The value is in the next row, same column
                const valueCell = rows[i + 1]?.[1];
                if (valueCell !== undefined) {
                    details.push({ label: foundKeyword, value: renderCell(valueCell) });
                }
            }
        }
    } else { // STATIC FORMAT (covers both clean tables and ones with mixed column counts)
        const firstRowText = getCellText(rows[0]?.[0] || '');
        const titleParts = firstRowText.split(/\n\n|\n/).filter(p => p.trim() !== '');
        titleNode = renderTextAndFootnotes(titleParts[0] || '');

        let descriptionText = '';
        if (titleParts.length > 1) {
            descriptionText = titleParts.slice(1).join('\n').trim();
        } else {
            // Check second row for description, common in static files
            descriptionText = getCellText(rows[1]?.[0] || '');
        }
        
        if (descriptionText.trim()) {
            descriptionNode = <p>{renderTextAndFootnotes(descriptionText)}</p>;
        }
        
        rows.forEach(row => {
            if (row.length < 2) return;
            const label = getCellText(row[0]);
            const foundKeyword = keywords.find(kw => label.includes(kw));

            if (foundKeyword) {
                details.push({ label: foundKeyword, value: renderCell(row[1]) });
            }
        });
    }

    if (!titleNode || (React.isValidElement<React.PropsWithChildren>(titleNode) && !titleNode.props.children)) return null;

    return { title: titleNode, description: descriptionNode, details };
  };
  
  const renderSortedDetails = (details: { label: string; value: React.ReactNode }[]) => {
      const detailOrder = ['조건', '내구도', '충전', '부피'];
      const sortedDetails = details
          .filter(d => d.label && d.value)
          .sort((a, b) => detailOrder.indexOf(a.label) - detailOrder.indexOf(b.label));

      if (sortedDetails.length === 0) return null;

      return (
          <div className="text-xs text-slate-400 mt-2 flex justify-between items-center gap-4">
              {sortedDetails.map(detail => (
                  <span key={detail.label}>
                      <strong>{detail.label}:</strong> {detail.value}
                  </span>
              ))}
          </div>
      );
  }

  const parseAbilityLine = (line: string): { name: string; description: string; charge?: number } | null => {
      const text = line.trim();
      if (!text) return null;
  
      let charge: number | undefined = undefined;
      let processedText = text;
      const chargeMatch = text.match(/\(충전\s*(\d+)\)$/);
      if (chargeMatch) {
          charge = parseInt(chargeMatch[1], 10);
          processedText = text.replace(/\(충전\s*(\d+)\)$/, '').trim();
      }
  
      const dotIndex = processedText.indexOf('.');
      const commaIndex = processedText.indexOf(',');
      let delimiterIndex = -1;
  
      if (dotIndex > -1 && commaIndex > -1) {
          delimiterIndex = Math.min(dotIndex, commaIndex);
      } else {
          delimiterIndex = Math.max(dotIndex, commaIndex);
      }
      
      if (delimiterIndex > 0) {
          const name = processedText.substring(0, delimiterIndex).trim();
          const description = processedText.substring(delimiterIndex + 1).trim();
          return { name, description, charge };
      }
      
      return { name: '', description: processedText, charge };
  };

  const renderGroupedElements = () => {
    const output: React.ReactNode[] = [];
    const currentPage = pageTitle || '';
    const isCreationPage = currentPage.includes('생성 규칙');
    const isExamplePage = currentPage.includes('예시 자료');

    let i = 0;
    while (i < elements.length) {
        const currentElement = elements[i];
        const nextElement = elements[i + 1];

        // Combat Example Switcher Detection
        const elementText = getCellText(currentElement);
        if (currentElement.type === 'heading_2' && elementText.includes('전투 예제')) {
            const introElements: GoogleDocElement[] = [];
            const narrativeElements: GoogleDocElement[] = [];
            const explanationElements: GoogleDocElement[] = [];
            
            const mainHeader = currentElement;
            i++; // skip main header
            
            // 1. Intro (until "진행 예시")
            while (i < elements.length) {
                const el = elements[i];
                const text = getCellText(el);
                if (el.type === 'heading_3' && text.includes('진행 예시')) break;
                if (el.type.startsWith('heading_1')) break; // safety
                introElements.push(el);
                i++;
            }

            // 2. Narrative (until "해설")
            if (i < elements.length && getCellText(elements[i]).includes('진행 예시')) {
                i++; // Skip "진행 예시" header
                while (i < elements.length) {
                    const el = elements[i];
                    const text = getCellText(el);
                    if (el.type === 'heading_3' && text.includes('해설')) break;
                    if (el.type.startsWith('heading_1') || el.type === 'heading_2') break;
                    narrativeElements.push(el);
                    i++;
                }
            }

            // 3. Explanation (until next major section)
            if (i < elements.length && getCellText(elements[i]).includes('해설')) {
                i++; // Skip "해설" header
                while (i < elements.length) {
                    const el = elements[i];
                    if (el.type.startsWith('heading_1') || el.type === 'heading_2') break;
                    explanationElements.push(el);
                    i++;
                }
            }

            // Push Main Header then Switcher
            output.push(renderElement(mainHeader, i)); // Render H2 normally
            output.push(
                <CombatExampleSwitcher 
                    key={`combat-switcher-${i}`}
                    introElements={introElements}
                    narrativeElements={narrativeElements}
                    explanationElements={explanationElements}
                    renderElement={renderElement}
                />
            );
            
            // Loop continues from current i position
            continue;
        }


        // Chat Detection logic
        const chatSpeaker = getChatSpeaker(currentElement);
        if (chatSpeaker) {
             const chatMessages: { speaker: 'M' | 'L', elements: GoogleDocElement[] }[] = [];
             let currentSpeaker = chatSpeaker;
             let currentMessageElements: GoogleDocElement[] = [currentElement];
             
             i++; // Consumed currentElement
             
             while (i < elements.length) {
                 const nextEl = elements[i];
                 // Break on complex components
                 if (nextEl.type.startsWith('heading') || nextEl.type === 'title' || nextEl.type === 'table') break;
                 
                 const nextSpeaker = getChatSpeaker(nextEl);
                 if (nextSpeaker) {
                      chatMessages.push({ speaker: currentSpeaker, elements: currentMessageElements });
                      currentSpeaker = nextSpeaker;
                      currentMessageElements = [nextEl];
                      i++;
                      continue;
                 }
                 
                 if (nextEl.type === 'list_item') {
                     currentMessageElements.push(nextEl);
                     i++;
                     continue;
                 }
                 
                 // Stop if we hit a paragraph that isn't a speaker. 
                 // Assuming strictly alternating or consecutive dialogue blocks for this section.
                 break;
             }
             chatMessages.push({ speaker: currentSpeaker, elements: currentMessageElements });
             
             output.push(<ChatSequence key={`chat-${i}`} messages={chatMessages} renderContent={renderContent} />);
             continue;
        }

        const isStaticNpcHeuristic = isNpcStatBlockStart(currentElement, nextElement);
        const isLiveNpcHeuristic = isNpcCardTable(currentElement);
        const isExampleCard = isAbilityExampleTable(currentElement) || isItemExampleTable(currentElement);
        
        // Check for Skill Table Detection (New Feature)
        const isSkillTagTable = isSkillTable(currentElement);

        const isNpcByTag =
            (isStaticNpcHeuristic && nextElement && isExplicitNpcTable(nextElement)) ||
            (isLiveNpcHeuristic && isExplicitNpcTable(currentElement));

        const shouldRenderAsNpc = !isCreationPage && (isNpcByTag || (isExamplePage && (isStaticNpcHeuristic || isLiveNpcHeuristic)));
        const shouldRenderAsExample = !isExamplePage && isExampleCard;

        if (isSkillTagTable && currentElement.rows) {
             output.push(<SkillTagExplorer key={`skill-tags-${i}`} id={currentElement.id} rows={currentElement.rows} />);
             i++;
             continue;
        }

        if (shouldRenderAsNpc) {
            if (isLiveNpcHeuristic) {
                try {
                    const table = currentElement;
                    const rows = table.rows || [];

                    const nameDescText = getCellText(rows[0]?.[0]);
                    const firstDotIndex_title = nameDescText.indexOf('.');
                    const name = firstDotIndex_title > -1 ? nameDescText.substring(0, firstDotIndex_title).trim() : nameDescText.trim();
                    const description = firstDotIndex_title > -1 ? nameDescText.substring(firstDotIndex_title + 1).trim() : '';

                    const stats: { label: string; value: string }[] = (rows[1] || []).map(cell => {
                        const text = getCellText(cell).trim();
                        let label = text;
                        let value = '-';

                        const firstDotIndex = text.indexOf('.');
                        if (firstDotIndex > 0) {
                            label = text.substring(0, firstDotIndex + 1).trim();
                            value = text.substring(firstDotIndex + 1).trim();
                        } else {
                            const lastSpaceIndex = text.lastIndexOf(' ');
                            if (lastSpaceIndex > 0) {
                                label = text.substring(0, lastSpaceIndex).trim();
                                value = text.substring(lastSpaceIndex + 1).trim();
                            }
                        }
                        if (value === '') value = '-';
                        return { label, value };
                    }).filter(s => s.label);

                    const actions: NpcData['actions'] = [];
                    for (let r = 2; r < rows.length; r++) {
                        const row = rows[r];
                        if (!row || row.length < 2) continue;
                        
                        const category = getCellText(row[0]).trim().replace(/\.$/, '');
                        if (!category) continue;
                        
                        const abilitiesText = getCellText(row[1]).trim();
                        const abilities = abilitiesText.split('\n').map(parseAbilityLine)
                          .filter((a): a is { name: string; description: string; charge?: number } => a !== null && (!!a.name || !!a.description));
                        
                        if (abilities.length > 0) {
                          actions.push({ category, abilities });
                        }
                    }
                    
                    const npcData: NpcData = { name, description, stats, actions, sourceRowCount: rows.length };
                    output.push(<NpcCard key={`npc-table-${i}`} npc={npcData} id={currentElement.id} />);
                    i++;
                    continue;
                } catch (e) {
                    console.error("Failed to parse live NPC card, rendering as default.", e, currentElement);
                }
            } else if (isStaticNpcHeuristic) {
                const blockStartIndex = i;
                const npcElements: GoogleDocElement[] = [elements[i], elements[i + 1]];
                i += 2;

                while (i < elements.length) {
                    const nextEl = elements[i];
                    
                    if (isNpcStatBlockStart(nextEl, elements[i + 1])) {
                        break;
                    }

                    if (nextEl.type === 'paragraph' && nextEl.isBold) {
                        npcElements.push(nextEl);
                        i++;
                        while (i < elements.length && elements[i].type === 'list_item') {
                            npcElements.push(elements[i]);
                            i++;
                        }
                    } else {
                        break;
                    }
                }

                try {
                    const titleElement = npcElements[0];
                    const statsElement = npcElements[1];
                    const actionElements = npcElements.slice(2);
                    
                    const titleFullText = titleElement.text || '';
                    const firstDotIndex_title = titleFullText.indexOf('.');
                    const name = firstDotIndex_title > 0 ? titleFullText.substring(0, firstDotIndex_title).trim() : titleFullText.trim();
                    const description = firstDotIndex_title > 0 ? titleFullText.substring(firstDotIndex_title + 1).trim() : '';
                    
                    const stats: { label: string; value: string }[] = [];
                    if (statsElement && statsElement.type === 'table' && statsElement.rows) {
                        statsElement.rows[0].forEach(cell => {
                            const cellText = getCellText(cell).trim();
                            let label = cellText;
                            let value = '';

                            if (cellText.startsWith('기술 점수.')) {
                                const firstDotIndex = cellText.indexOf('.');
                                label = cellText.substring(0, firstDotIndex + 1).trim();
                                value = cellText.substring(firstDotIndex + 1).trim();
                                if (value === '') value = '-';
                            } else {
                                const lastSpaceIndex = cellText.lastIndexOf(' ');
                                if (lastSpaceIndex > -1) {
                                    label = cellText.substring(0, lastSpaceIndex);
                                    value = cellText.substring(lastSpaceIndex + 1);
                                }
                            }
                            stats.push({ label, value });
                        });
                    }

                    const actions: NpcData['actions'] = [];
                    let currentActionCategory: { category: string; abilities: { name: string; description: string; charge?: number }[] } | null = null;
                    
                    actionElements.forEach(el => {
                        if (el.type === 'paragraph' && el.isBold) {
                            if (currentActionCategory?.abilities.length) {
                                actions.push(currentActionCategory);
                            }
                            const categoryName = getCellText(el).trim().replace(/\.$/, '');
                            currentActionCategory = { category: categoryName, abilities: [] };
                        } else if (el.type === 'list_item' && currentActionCategory) {
                             const abilityData = parseAbilityLine(getCellText(el));
                             if(abilityData){
                                currentActionCategory.abilities.push(abilityData);
                             }
                        }
                    });

                    if (currentActionCategory?.abilities.length) {
                        actions.push(currentActionCategory);
                    }

                    const npcData: NpcData = { name, description, stats, actions, sourceRowCount: 0 };
                    
                    // Collect IDs of consumed elements to create hidden anchors for scroll capability
                    const consumedIds = npcElements.map(e => e.id).filter(Boolean) as string[];
                    
                    // Filter out the ID that is used on the Card itself to avoid duplicate
                    const cardId = npcElements[0].id;
                    const anchorIds = consumedIds.filter(id => id !== cardId);

                    output.push(
                        <div key={`npc-${blockStartIndex}`} className="relative" data-highlight-container="true">
                            {anchorIds.map(id => <div key={id} id={id} className="absolute -top-20" />)}
                            <NpcCard npc={npcData} id={cardId} />
                        </div>
                    );
                } catch (e) {
                    console.error("Failed to parse NPC block, rendering as default.", e, npcElements);
                    npcElements.forEach((el, idx) => {
                       const rendered = renderElement(el, blockStartIndex + idx);
                       if (rendered) output.push(rendered);
                    });
                }
                continue;
            }
        }
        
        if (shouldRenderAsExample) {
            const cards: React.ReactNode[] = [];
            let cardStartIndex = i;
            while (i < elements.length && (isAbilityExampleTable(elements[i]) || isItemExampleTable(elements[i]))) {
                const cardElement = elements[i];
                if (!cardElement.rows) { i++; continue; }

                const cardData = parseExampleCardData(cardElement.rows);
                if (cardData) {
                    const { title, description, details } = cardData;
                    const detailsNode = renderSortedDetails(details);
                    cards.push(<ExampleCard key={`card-${i}`} id={cardElement.id} title={title} description={description} footer={detailsNode} rowCount={cardElement.rows.length} />);
                }
                i++;
            }
            output.push(<div key={`card-grid-${cardStartIndex}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">{cards}</div>);
            continue;
        }

        if (isFAQHeaderTable(currentElement)) {
            i++;
            continue;
        } else if (isFAQTable(currentElement)) {
            if (currentElement.rows) {
                output.push(<FAQAccordion key={`faq-${i}`} id={currentElement.id} rows={currentElement.rows} />);
            }
            i++;
            continue;
        } else if (isPossibleFAQItemTable(currentElement)) {
            const faqItemRows: (string | GoogleDocElement)[][] = [];
            const faqItemIds: string[] = [];
            const groupStartIndex = i;
            const tableId = elements[i].id; // Use the first table's ID for the accordion group

            while (i < elements.length && isPossibleFAQItemTable(elements[i])) {
                const itemElement = elements[i];
                if (itemElement.rows && itemElement.rows.length > 0) {
                    faqItemRows.push(itemElement.rows[0]);
                    faqItemIds.push(itemElement.id || '');
                }
                i++;
            }
            
            if (faqItemRows.length > 0) {
                const rowsForAccordion = [["질문", "분야", "답변"], ...faqItemRows];
                output.push(<FAQAccordion key={`faq-group-${groupStartIndex}`} id={tableId} rows={rowsForAccordion} itemIds={faqItemIds} />);
            }
            continue;
        } else if (currentElement.type === 'list_item') {
            const listItems: GoogleDocElement[] = [];
            while (i < elements.length && elements[i].type === 'list_item') {
                listItems.push(elements[i]);
                i++;
            }
            output.push(
                <ul key={`ul-${i - 1}`} className="list-disc pl-6 space-y-1 mb-4 text-slate-300 marker:text-cyan-500">
                    {listItems.map((item, itemIndex) => {
                       const formatClasses = getBlockFormatClasses(item);
                       const style = getTextStyle(item);
                       return (
                        <li key={itemIndex} id={item.id} className={`pl-1 ${formatClasses} scroll-mt-24`} style={style}>
                            {renderContent(item)}
                        </li>
                       );
                    })}
                </ul>
            );
            continue;
        }
        
        const rendered = renderElement(currentElement, i);
        if(rendered) {
            output.push(rendered);
        }
        i++;
    }
    return output;
  };

  const renderedContent = renderGroupedElements();
  const sortedFootnotes = Array.from(usedFootnotes).sort((a, b) => parseInt(a) - parseInt(b));

  return (
      <>
          {renderedContent}

          {sortedFootnotes.length > 0 && footnotes && (
              <div className="mt-12 pt-6 border-t border-slate-600">
                  <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">각주</h4>
                  <ol className="space-y-3">
                      {sortedFootnotes.map(num => (
                          <li key={num} id={`footnote-body-${num}`} className="text-sm text-slate-400 flex gap-2 rounded p-1 -ml-1 scroll-mt-24">
                                <button
                                    onClick={(e) => handleAnchorClick(e, `footnote-ref-${num}`)}
                                    className="font-bold text-cyan-500 select-none hover:text-cyan-300 transition-colors"
                                    aria-label={`각주 ${num}번으로 돌아가기`}
                                >
                                    [{num}]
                                </button>
                                <div className="flex-1 whitespace-pre-wrap">
                                    {footnotes[num]}
                                </div>
                          </li>
                      ))}
                  </ol>
              </div>
          )}
      </>
  );
};

export default GoogleDocRenderer;
