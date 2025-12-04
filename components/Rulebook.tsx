
// ... keep imports ...
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleDocElement, TextRun, EnhancementAbility, Item, RulebookPage } from '../types';
import GoogleDocRenderer from './GoogleDocRenderer';
import { staticRulebookData } from '../data/rulebookContent';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, XMarkIcon } from './icons';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyPo0la3Zfa_EuNzmO6caEhuQXvqIsRiaecZhgnbxhZxDh_GDQk-fpeoLznvDHnZIth/exec';

// Use CSV link as requested by user.
// NOTE: CSV only exports the first sheet by default because CSV format doesn't support multiple sheets.
const LOADING_MESSAGES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJJvnRQkDH7T4pffBgBdPDPstjI3NceX93zvvqljQKnaKUUCSxasyyjvKZWu3NKxjRxlKvWgufbswy/pub?output=csv'; 

// Helper to get raw text
const getRawText = (el: GoogleDocElement | string | undefined): string => {
    if (!el) return '';
    if (typeof el === 'string') return el;
    if (el.runs) return el.runs.map(r => r.text || '').join('');
    return el.text || '';
};

const processRulebookData = (elements: GoogleDocElement[]) => {
    // ... (Keep existing implementation of processRulebookData completely intact) ...
    if (!elements || elements.length === 0) return { pages: [], footnotes: {} };

    // 1. Build definitions map from markers and content
    const definitionsMap: Record<string, string> = {};
    const contentElements: GoogleDocElement[] = [];
    let lastMarkerNum: string | null = null;
    for (const el of elements) {
        if (el.type === 'footnote_marker') {
            const numMatch = el.text?.match(/\d+/);
            if (numMatch) {
                lastMarkerNum = numMatch[0];
            }
        } else if (el.type === 'footnote_content' && lastMarkerNum) {
            definitionsMap[lastMarkerNum] = (el.runs?.[0]?.text || el.text)?.trim() || '';
            lastMarkerNum = null;
        } else {
            contentElements.push(el);
        }
    }

    // 2. Scan content for [#] placeholders and replace them sequentially.
    // This uses a recursive helper to handle tables and nested structures.
    let placeholderCount = 1;

    const processElement = (el: GoogleDocElement): GoogleDocElement => {
        // Handle Table: Recursively process cells
        if (el.type === 'table' && el.rows) {
            const newRows = el.rows.map(row => 
                row.map(cell => {
                    if (typeof cell === 'object' && cell !== null) {
                        return processElement(cell);
                    } else if (typeof cell === 'string' && cell.includes('[#]')) {
                        // Handle legacy string cells with placeholders
                        let newText = cell;
                        while (newText.includes('[#]')) {
                            newText = newText.replace('[#]', `[${placeholderCount++}]`);
                        }
                        return newText; 
                    }
                    return cell;
                })
            );
            return { ...el, rows: newRows };
        }

        // Handle Text Runs - Try to preserve formatting if possible
        if (el.runs && el.runs.some(run => run.text && run.text.includes('[#]'))) {
            const newRuns: TextRun[] = [];
            el.runs.forEach(run => {
                if (run.text && run.text.includes('[#]')) {
                    const parts = run.text.split(/(\[#\])/g);
                    parts.forEach(part => {
                        if (part === '[#]') {
                            newRuns.push({ ...run, text: `[${placeholderCount++}]` });
                        } else if (part) {
                            newRuns.push({ ...run, text: part });
                        }
                    });
                } else {
                    newRuns.push(run);
                }
            });
            return { ...el, runs: newRuns, text: undefined }; 
        } 
        
        // Handle Split Tokens or missing text property
        const fullText = el.text || (el.runs ? el.runs.map(r => r.text || '').join('') : '');

        if (fullText && fullText.includes('[#]')) {
            let newText = fullText;
            while (newText.includes('[#]')) {
                newText = newText.replace('[#]', `[${placeholderCount++}]`);
            }
            return { ...el, text: newText, runs: undefined };
        }

        return el;
    };

    const processedContentElements = contentElements.map(processElement);
    
    // 3. Process the updated content into pages.
    const pagesData: GoogleDocElement[][] = [];
    let currentPageContent: GoogleDocElement[] = [];
    
    const isPageStarter = (el: GoogleDocElement) => el.type === 'heading_1' || el.type === 'title';

    for (const element of processedContentElements) {
        if (isPageStarter(element) && currentPageContent.length > 0) {
            pagesData.push(currentPageContent);
            currentPageContent = [];
        }
        currentPageContent.push(element);
    }
    if (currentPageContent.length > 0) {
        pagesData.push(currentPageContent);
    }
    
    const cleanTextForId = (text: string) => text
        .replace(/^[📕🎲👥➕❓🔖📖\uFFFD]/u, '')
        .replace(/\uFFFD/g, '')
        .trim();
    
    const getTextFromElement = (el: GoogleDocElement): string => {
        if (el.runs && el.runs.length > 0) {
            return el.runs.map(r => r.text).join('');
        }
        return el.text || '';
    }

    const pages: RulebookPage[] = pagesData.map((content, pageIndex) => {
        const titleElement = content.find(isPageStarter) || ({ text: '소개', type: 'heading_1' } as GoogleDocElement);
        const titleText = cleanTextForId(getTextFromElement(titleElement));
        
        const pageId = `page-${pageIndex}-${titleText.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '')}`;
        
        content.forEach((el, idx) => {
            // Assign stable ID if missing
            if (!el.id) {
                const textSnippet = getTextFromElement(el).slice(0, 20).replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
                el.id = `${pageId}-el-${idx}-${textSnippet}`;
            }

            if ((el.type === 'title' || el.type.startsWith('heading_'))) {
               const text = cleanTextForId(getTextFromElement(el));
               const slug = text.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w\-\uAC00-\uD7A3]/g, '');
               el.id = `${pageId}-section-${idx}-${slug}`;
            }
        });
            
        const subsections: { id: string; title: string; level: number }[] = [];
        let isHiddenSection = false;
        
        const hasCombatExample = content.some(el => {
            const t = getTextFromElement(el);
            return el.type === 'heading_2' && t.includes('전투 예제');
        });

        for (const el of content) {
            const text = getTextFromElement(el);
            if (!text) continue;

            const isHeader = titleElement.type === 'title' 
                ? el.type.startsWith('heading_') 
                : (el.type.startsWith('heading_') && el.type !== 'heading_1');

            if (isHeader) {
                if (hasCombatExample) {
                    if (el.type === 'heading_2') {
                        isHiddenSection = false; 
                    }
                    if (text.includes('진행 예시')) {
                        continue;
                    }
                    if (text.includes('해설')) {
                        isHiddenSection = true;
                        continue;
                    }
                }

                if (!isHiddenSection) {
                    const typeParts = el.type.split('_');
                    const level = typeParts.length > 1 ? parseInt(typeParts[1], 10) : 1;
                    subsections.push({ id: el.id!, title: cleanTextForId(text), level });
                }
            }
        }

        return { id: pageId, title: titleText, content, subsections };
    }).filter(page => {
        const isFootnotePage = page.title.includes('각주');
        const hasOnlyTitle = page.content.length <= 1;
        return !(isFootnotePage && hasOnlyTitle);
    });

    return { pages, footnotes: definitionsMap };
};

const extractGameData = (pages: RulebookPage[]): { abilities: EnhancementAbility[], items: Item[] } => {
    const abilities: EnhancementAbility[] = [];
    const items: Item[] = [];

    pages.forEach(page => {
        page.content.forEach(el => {
            if (el.type === 'table' && el.rows) {
                const rawText = el.rows.flat().map(cell => getRawText(cell)).join(' ');
                
                // Heuristics for Ability Card
                const hasAbilityKeywords = rawText.includes('조건') && rawText.includes('충전');
                
                // Heuristics for Item Card (Exclude NPC cards which might have '생명력')
                const hasItemKeywords = rawText.includes('내구도') && rawText.includes('부피') && !rawText.includes('생명력');

                if (hasAbilityKeywords) {
                    // Try to parse Ability
                    try {
                        let name = '';
                        let description = '';
                        let condition = '-';
                        let charge = '-';

                        // Check format: Labels in col 0 vs col 1
                        const firstRowText = getRawText(el.rows[0]?.[0] || '');
                        const parts = firstRowText.split(/\n+/);
                        name = parts[0].trim();
                        if (parts.length > 1) {
                            description = parts.slice(1).join(' ').trim();
                        } else if (el.rows.length > 1 && !el.rows[1].some(c => getRawText(c).includes('조건'))) {
                             // Sometimes description is in second row if first row is just title
                             description = getRawText(el.rows[1]?.[0] || '').trim();
                        }

                        // Search for details
                        el.rows.forEach((row, rIdx) => {
                            row.forEach((cell, cIdx) => {
                                const text = getRawText(cell);
                                if (text.includes('조건')) {
                                    // Value is next cell or next row same col
                                    const val = el.rows[rIdx]?.[cIdx + 1] || el.rows[rIdx + 1]?.[cIdx];
                                    if(val) condition = getRawText(val).trim();
                                }
                                if (text.includes('충전')) {
                                    const val = el.rows[rIdx]?.[cIdx + 1] || el.rows[rIdx + 1]?.[cIdx];
                                    if(val) charge = getRawText(val).trim();
                                }
                            });
                        });
                        
                        if (name && !name.includes('[') && !name.includes('기술 점수')) {
                             abilities.push({ name, description, condition, charge });
                        }
                    } catch (e) {
                        // ignore parse error
                    }
                } else if (hasItemKeywords) {
                    // Try to parse Item
                     try {
                        let name = '';
                        let description = '';
                        let durability = '-';
                        let volume = 0;

                        const firstRowText = getRawText(el.rows[0]?.[0] || '');
                        const parts = firstRowText.split(/\n+/);
                        name = parts[0].trim();
                        if (parts.length > 1) {
                            description = parts.slice(1).join(' ').trim();
                        } else if (el.rows.length > 1 && !el.rows[1].some(c => getRawText(c).includes('내구도'))) {
                             description = getRawText(el.rows[1]?.[0] || '').trim();
                        }

                        el.rows.forEach((row, rIdx) => {
                            row.forEach((cell, cIdx) => {
                                const text = getRawText(cell);
                                if (text.includes('내구도')) {
                                    const val = el.rows[rIdx]?.[cIdx + 1] || el.rows[rIdx + 1]?.[cIdx];
                                    if(val) durability = getRawText(val).trim();
                                }
                                if (text.includes('부피')) {
                                    const val = el.rows[rIdx]?.[cIdx + 1] || el.rows[rIdx + 1]?.[cIdx];
                                    if(val) {
                                        const vText = getRawText(val).trim();
                                        const vNum = parseInt(vText, 10);
                                        if(!isNaN(vNum)) volume = vNum;
                                    }
                                }
                            });
                        });
                        
                        if (name && !name.includes('[') && !name.includes('소지품')) {
                             items.push({ name, description, durability, volume });
                        }
                    } catch (e) {
                        // ignore parse error
                    }
                }
            }
        });
    });
    
    // Remove duplicates
    const uniqueAbilities = Array.from(new Map(abilities.map(a => [a.name, a])).values());
    const uniqueItems = Array.from(new Map(items.map(i => [i.name, i])).values());

    return { abilities: uniqueAbilities, items: uniqueItems };
};


const Rulebook: React.FC<{
  onUpdate: (status: 'success' | 'fallback', error?: Error) => void;
  refreshTrigger: number;
  setDeployVersion: (version: string) => void;
  forceOffline: boolean;
  onDataLoaded?: (abilities: EnhancementAbility[], items: Item[]) => void;
  onPagesLoaded?: (pages: RulebookPage[]) => void;
}> = ({ onUpdate, refreshTrigger, setDeployVersion, forceOffline, onDataLoaded, onPagesLoaded }) => {
    const [pages, setPages] = useState<RulebookPage[]>([]);
    const [footnotes, setFootnotes] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    
    // Loading Message State
    const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
    const [currentTip, setCurrentTip] = useState('');
    const [isFading, setIsFading] = useState(false);
    
    const [activePageIndex, setActivePageIndex] = useState(0);
    // Track expanded sections for accordion menu
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Scroll-to-next State
    const [pullProgress, setPullProgress] = useState(0);
    const pullRef = useRef(0);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isPullTriggeredRef = useRef(false);
    const PULL_THRESHOLD = 1500; 

    // Target Scroll State for navigation between pages
    const [targetScrollId, setTargetScrollId] = useState<string | null>(null);

    // Footnote Tooltip State
    const [activeTooltip, setActiveTooltip] = useState<{ content: string; rect: DOMRect } | null>(null);

    const handleShowFootnote = useCallback((content: string, rect: DOMRect) => {
        setActiveTooltip({ content, rect });
    }, []);

    const handleHideFootnote = useCallback(() => {
        setActiveTooltip(null);
    }, []);

    useEffect(() => {
        try {
          const urlParts = GOOGLE_SCRIPT_URL.split('/');
          const deployId = urlParts[urlParts.length - 2];
          setDeployVersion(deployId);
        } catch (e) {
          console.error("Could not parse deployment version", e);
          setDeployVersion('N/A');
        }
    }, [setDeployVersion]);

    // Add safe clamp for activePageIndex when pages change
    useEffect(() => {
        if (pages.length > 0 && activePageIndex >= pages.length) {
            setActivePageIndex(0);
        }
    }, [pages.length, activePageIndex]);

    // Fetch Loading Messages
    useEffect(() => {
        if (!isLoading) return;

        const defaultTips = [
            "팁: 캐릭터의 행운점은 생명력이자 운명입니다.",
            "팁: 주사위 결과가 마음에 들지 않나요? 행운점을 사용해보세요.",
            "팁: 휴식은 모험의 필수 요소입니다.",
            "팁: 마스터와 상의하여 멋진 장면을 연출해보세요.",
            "팁: 오프라인 모드에서도 규칙서를 열람할 수 있습니다."
        ];
        
        const parseHtmlMessages = (html: string) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const tables = doc.querySelectorAll('table');
            const messages: string[] = [];
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                for (let i = 1; i < rows.length; i++) {
                    const cells = rows[i].querySelectorAll('td');
                    cells.forEach(cell => {
                        const text = cell.textContent?.trim();
                        if (text && text.length > 0) messages.push(text);
                    });
                }
            });
            return messages;
        };

        const parseCsvMessages = (csv: string) => {
             const lines = csv.split(/\r?\n/);
             const messages: string[] = [];
             for (let i = 1; i < lines.length; i++) {
                 const line = lines[i];
                 if (!line.trim()) continue;
                 let currentCell = '';
                 let inQuote = false;
                 for (let j = 0; j < line.length; j++) {
                     const char = line[j];
                     if (char === '"') {
                         if (inQuote && line[j+1] === '"') {
                             currentCell += '"';
                             j++;
                         } else {
                             inQuote = !inQuote;
                         }
                     } else if (char === ',' && !inQuote) {
                         if (currentCell.trim()) messages.push(currentCell.trim());
                         currentCell = '';
                     } else {
                         currentCell += char;
                     }
                 }
                 if (currentCell.trim()) messages.push(currentCell.trim());
             }
             return messages;
        };

        const fetchLoadingMessages = async () => {
            if (!LOADING_MESSAGES_SHEET_URL) {
                setLoadingMessages(defaultTips);
                setCurrentTip(defaultTips[0]);
                return;
            }

            try {
                const response = await fetch(LOADING_MESSAGES_SHEET_URL);
                if (!response.ok) throw new Error("Fetch failed");
                const text = await response.text();
                
                let extractedMessages: string[] = [];
                if (LOADING_MESSAGES_SHEET_URL.includes('pubhtml')) {
                    extractedMessages = parseHtmlMessages(text);
                } else {
                    extractedMessages = parseCsvMessages(text);
                }

                if (extractedMessages.length > 0) {
                    const uniqueMessages = Array.from(new Set(extractedMessages));
                    setLoadingMessages(uniqueMessages);
                    setCurrentTip(uniqueMessages[Math.floor(Math.random() * uniqueMessages.length)]);
                } else {
                    setLoadingMessages(defaultTips);
                    setCurrentTip(defaultTips[0]);
                }

            } catch (e) {
                console.warn("Loading messages fetch failed, using default.", e);
                setLoadingMessages(defaultTips);
                setCurrentTip(defaultTips[0]);
            }
        };

        fetchLoadingMessages();
    }, [isLoading]);

    // Rotate Loading Message
    useEffect(() => {
        if (!isLoading || loadingMessages.length <= 1) return;
        const interval = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentTip(prev => {
                    let next = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
                    if (loadingMessages.length > 1 && next === prev) {
                         const idx = Math.floor(Math.random() * loadingMessages.length);
                         next = loadingMessages[idx];
                    }
                    return next;
                });
                setIsFading(false);
            }, 500); 
        }, 4000);
        return () => clearInterval(interval);
    }, [isLoading, loadingMessages]);


    useEffect(() => {
        const mainElement = document.querySelector('main');
        if (mainElement) {
            // Only scroll to top if we are not targeting a specific scroll ID
            if (!targetScrollId) {
                window.scrollTo({
                    top: mainElement.offsetTop - 80, 
                    behavior: 'auto'
                });
            }
            isPullTriggeredRef.current = false;
        }
        pullRef.current = 0;
        setPullProgress(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePageIndex]); // Remove targetScrollId from dependency to prevent scroll-to-top when targetScrollId is cleared

    // Automatically expand the section of the active page
    useEffect(() => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (!next.has(activePageIndex)) {
                next.add(activePageIndex);
            }
            return next;
        });
    }, [activePageIndex]);

    const scrollToId = useCallback((id: string) => {
        const element = document.getElementById(id);
        const headerHeight = 80; // Approximate header height

        if (element) {
            // 1. Find the best target for highlighting (and scrolling)
            let target = element;
            
            // Prioritize the highlight container if the element itself is one or is inside one
            const container = element.closest('[data-highlight-container="true"]');
            if (container instanceof HTMLElement) {
                target = container;
            } else if (element.offsetHeight === 0) {
                 // Fallback for anchors: try next sibling
                 const next = element.nextElementSibling;
                 if (next instanceof HTMLElement) target = next;
            }

            // 2. Center the target (use target rect for better positioning of large cards)
            const rect = target.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            const viewportHeight = window.innerHeight;
            
            // Desired Scroll Y: Center of element at center of viewport
            let scrollY = absoluteTop - (viewportHeight / 2) + (rect.height / 2);
            
            // Constraint: Top of element should not be obscured by header
            const minScrollY = absoluteTop - headerHeight - 20; // 20px padding
            
            // If element is taller than viewport or if centering pushes top behind header, align top
            if (rect.height > (viewportHeight - headerHeight) || scrollY > minScrollY) {
                 scrollY = minScrollY;
            }
            
            window.scrollTo({ top: scrollY, behavior: "smooth" });

            // 3. Highlight Logic
            // Simulate click if interactive to ensure consistency with user experience
            // This directly invokes the onClick handler on the element (e.g., ExampleCard) 
            // which contains the exact highlight logic we want.
            if (target.classList.contains('cursor-pointer')) {
                target.click();
            } else {
                // For regular text elements, just apply the animation class
                target.classList.remove('highlight-animate');
                void target.offsetWidth; // Force reflow
                target.classList.add('highlight-animate');
                setTimeout(() => target.classList.remove('highlight-animate'), 3000);
            }
        }
    }, []);

    // Effect to handle deferred scrolling after page transition
    useEffect(() => {
        if (targetScrollId) {
            // Allow time for the new page content to render and transition animation (0.5s) to complete
            const timer = setTimeout(() => {
                scrollToId(targetScrollId);
                setTargetScrollId(null);
            }, 600); // 600ms to be safe after 500ms slide-in animation
            return () => clearTimeout(timer);
        }
    }, [activePageIndex, targetScrollId, scrollToId]);

    const handleTocClick = (e: React.MouseEvent<HTMLElement>, pageIndex: number, id: string) => {
        e.preventDefault();
        
        if (activePageIndex !== pageIndex) {
            setTargetScrollId(id);
            setActivePageIndex(pageIndex);
        } else {
            scrollToId(id);
        }
    };

    const toggleSection = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const loadAndProcessData = useCallback(async () => {
        if (forceOffline) {
            console.log("수동 오프라인 모드 활성화. 정적 데이터를 사용합니다.");
            const { pages: fallbackPages, footnotes: fallbackFootnotes } = processRulebookData(staticRulebookData.elements);
            setPages(fallbackPages);
            setFootnotes(fallbackFootnotes);
            
            if (onDataLoaded) {
                 const { abilities, items } = extractGameData(fallbackPages);
                 onDataLoaded(abilities, items);
            }
            if (onPagesLoaded) {
                onPagesLoaded(fallbackPages);
            }
            
            onUpdate('fallback');
            setIsLoading(false);
            return;
        }

        const cachedData = localStorage.getItem('cachedRulebookData');
        if (cachedData) {
            try {
                const parsedData = JSON.parse(cachedData);
                const { pages: cachedPages, footnotes: cachedFootnotes } = processRulebookData(parsedData);
                setPages(cachedPages);
                setFootnotes(cachedFootnotes);
                
                if (onDataLoaded) {
                    const { abilities, items } = extractGameData(cachedPages);
                    onDataLoaded(abilities, items);
                }
                if (onPagesLoaded) {
                    onPagesLoaded(cachedPages);
                }
            } catch (e) {
                console.error("캐시 데이터 파싱 실패", e);
                localStorage.removeItem('cachedRulebookData');
            }
        }

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL);
            if (!response.ok) throw new Error(`네트워크 응답 오류: ${response.statusText}`);
            
            const data = await response.json();
            if (data.error) throw new Error(`스크립트 오류: ${data.error}`);
            
            const { pages: processedPages, footnotes: extractedFootnotes } = processRulebookData(data.elements);
            
            if (processedPages.length < 2) {
                 throw new Error("데이터가 불완전합니다. (페이지 수 부족)");
            }

            setPages(processedPages);
            setFootnotes(extractedFootnotes);
            
            if (onDataLoaded) {
                const { abilities, items } = extractGameData(processedPages);
                onDataLoaded(abilities, items);
            }
            if (onPagesLoaded) {
                onPagesLoaded(processedPages);
            }
            
            localStorage.setItem('cachedRulebookData', JSON.stringify(data.elements));
            onUpdate('success');
        } catch (error) {
            console.warn("실시간 규칙서 로딩 실패. 백업 또는 오프라인 데이터를 유지합니다.", error);
            if (!cachedData) {
                const { pages: fallbackPages, footnotes: fallbackFootnotes } = processRulebookData(staticRulebookData.elements);
                setPages(fallbackPages);
                setFootnotes(fallbackFootnotes);
                
                if (onDataLoaded) {
                     const { abilities, items } = extractGameData(fallbackPages);
                     onDataLoaded(abilities, items);
                }
                if (onPagesLoaded) {
                    onPagesLoaded(fallbackPages);
                }
            }
            onUpdate('fallback', error as Error);
        } finally {
            setIsLoading(false);
        }
    }, [onUpdate, forceOffline, onDataLoaded, onPagesLoaded]);

    useEffect(() => {
        setIsLoading(true);
        loadAndProcessData();
    }, [refreshTrigger, loadAndProcessData]);

    const handlePrevPage = useCallback(() => {
        setActivePageIndex(prev => Math.max(0, prev - 1));
    }, []);

    const handleNextPage = useCallback(() => {
        setActivePageIndex(prev => Math.min(pages.length - 1, prev + 1));
    }, [pages.length]);

    // Pull-to-next logic (kept same as before)
    useEffect(() => {
        let startY = 0;
        const resetInactivityTimer = () => {
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
            }
            resetTimerRef.current = setTimeout(() => {
                setPullProgress(0);
                pullRef.current = 0;
            }, 5000);
        };

        const handleWheel = (e: WheelEvent) => {
            resetInactivityTimer();
            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.offsetHeight;
            const isAtBottom = Math.abs(documentHeight - scrollPosition) < 20; 
            const hasNextPage = activePageIndex < pages.length - 1;

            if (isAtBottom && hasNextPage && e.deltaY > 0) {
                pullRef.current = Math.min(pullRef.current + e.deltaY, PULL_THRESHOLD);
                setPullProgress((pullRef.current / PULL_THRESHOLD) * 100);

                if (pullRef.current >= PULL_THRESHOLD) {
                    isPullTriggeredRef.current = true;
                    handleNextPage();
                    pullRef.current = 0;
                    setPullProgress(0);
                    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
                }
            } else if (pullRef.current > 0) {
                pullRef.current = Math.max(0, pullRef.current - 20);
                setPullProgress((pullRef.current / PULL_THRESHOLD) * 100);
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY;
            resetInactivityTimer();
        };

        const handleTouchMove = (e: TouchEvent) => {
            resetInactivityTimer();
            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.offsetHeight;
            const isAtBottom = Math.abs(documentHeight - scrollPosition) < 20;
            const hasNextPage = activePageIndex < pages.length - 1;

            const currentY = e.touches[0].clientY;
            const deltaY = startY - currentY; 

            if (isAtBottom && hasNextPage && deltaY > 0) {
                pullRef.current = Math.min(pullRef.current + (deltaY * 2.0), PULL_THRESHOLD);
                setPullProgress((pullRef.current / PULL_THRESHOLD) * 100);

                if (pullRef.current >= PULL_THRESHOLD) {
                    isPullTriggeredRef.current = true;
                    handleNextPage();
                    pullRef.current = 0;
                    setPullProgress(0);
                    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
                }
                startY = currentY; 
            } else if (pullRef.current > 0) {
                pullRef.current = 0;
                setPullProgress(0);
            }
        };

        const handleTouchEnd = () => {
             if (pullRef.current < PULL_THRESHOLD && pullRef.current > 0) {
                 const decay = setInterval(() => {
                     if(pullRef.current <= 0) {
                         clearInterval(decay);
                         setPullProgress(0);
                     } else {
                         pullRef.current -= 50;
                         setPullProgress(Math.max(0, (pullRef.current / PULL_THRESHOLD) * 100));
                     }
                 }, 16);
             }
        };

        window.addEventListener('wheel', handleWheel);
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        };
    }, [pages.length, activePageIndex, handleNextPage]);

    // Helper to get text for search
    const getElementText = (el: GoogleDocElement) => {
        if (el.runs) return el.runs.map(r => r.text).join('');
        return el.text || '';
    };

    // Search Logic
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        const results: { pageIndex: number, elementId: string | undefined, text: string, type: string }[] = [];

        pages.forEach((page, pIndex) => {
            page.content.forEach(el => {
                if (el.type === 'table' && el.rows) {
                    el.rows.forEach((row, rowIndex) => {
                        row.forEach(cell => {
                            let cellText = '';
                            if (typeof cell === 'string') cellText = cell;
                            else if (cell && typeof cell === 'object') cellText = getElementText(cell);
                            
                            if (cellText.toLowerCase().includes(query)) {
                                results.push({
                                    pageIndex: pIndex,
                                    elementId: el.id, // Target the table container for highlighting
                                    text: cellText,
                                    type: '표 내용'
                                });
                            }
                        });
                    });
                } else {
                    const text = getElementText(el);
                    if (text.toLowerCase().includes(query)) {
                        results.push({
                            pageIndex: pIndex,
                            elementId: el.id,
                            text: text,
                            type: el.type.includes('heading') ? '제목' : '본문'
                        });
                    }
                }
            });
        });
        return results;
    }, [searchQuery, pages]);

    const handleSearchResultClick = (pageIndex: number, elementId: string | undefined) => {
        if (activePageIndex === pageIndex) {
            // If on the same page, scroll immediately without delay
            if (elementId) {
                scrollToId(elementId);
            }
        } else {
            setActivePageIndex(pageIndex);
            if (elementId) {
                setTargetScrollId(elementId);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-lg animate-pulse">규칙서을 불러오는 중...</p>
                    {currentTip && (
                        <p 
                            className={`text-slate-500 text-sm mt-2 max-w-md text-center px-4 transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}
                        >
                            {currentTip}
                        </p>
                    )}
                </div>
            </div>
        );
    }
    
    const activePage = pages[activePageIndex];

    // ... (Keep render logic) ...
    return (
        <div className="flex flex-col md:flex-row gap-8 relative">
            <aside className="md:w-1/4 lg:w-1/5 md:sticky md:top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto p-2 custom-scrollbar flex flex-col gap-4">
                
                {/* Search Bar */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 block w-full pl-9 p-2.5 placeholder-slate-500"
                        placeholder="규칙 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <nav className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700 flex-1 overflow-y-auto">
                    {searchQuery ? (
                        <div>
                            <h2 className="font-bold text-sm mb-3 text-cyan-400 border-b border-slate-600 pb-2">
                                검색 결과 ({searchResults.length})
                            </h2>
                            {searchResults.length > 0 ? (
                                <ul className="space-y-3">
                                    {searchResults.map((result, idx) => (
                                        <li key={idx}>
                                            <button
                                                onClick={() => handleSearchResultClick(result.pageIndex, result.elementId)}
                                                className="text-left w-full group"
                                            >
                                                <div className="text-xs text-cyan-500 font-semibold mb-0.5">{result.type} · {pages[result.pageIndex]?.title}</div>
                                                <div className="text-sm text-slate-300 group-hover:text-white line-clamp-2 leading-snug">
                                                    {result.text}
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-4">검색 결과가 없습니다.</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <h2 className="font-bold text-lg mb-4 text-white border-b border-slate-600 pb-2">목차</h2>
                            <ul className="space-y-2">
                                {pages.map((page, index) => {
                                    const isExpanded = expandedSections.has(index);
                                    const hasSubsections = page.subsections.length > 0;
                                    
                                    return (
                                        <li key={page.id}>
                                            <div className={`group flex items-center w-full rounded-md transition-all duration-200 mb-1 ${
                                                index === activePageIndex 
                                                    ? 'bg-cyan-600 text-white shadow-md' 
                                                    : 'hover:bg-slate-700 text-slate-300 hover:text-white'
                                            }`}>
                                                <button
                                                    onClick={() => setActivePageIndex(index)}
                                                    className="flex-grow text-left font-semibold p-2 focus:outline-none"
                                                >
                                                    {page.title}
                                                </button>
                                                
                                                {hasSubsections && (
                                                    <button
                                                        onClick={(e) => toggleSection(e, index)}
                                                        className="p-2 px-3 focus:outline-none"
                                                        aria-label={isExpanded ? "목차 접기" : "목차 펼치기"}
                                                    >
                                                        <ChevronRightIcon className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                    </button>
                                                )}
                                            </div>

                                            {hasSubsections && (
                                                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                    <div className="overflow-hidden">
                                                        <ul className="pl-3 border-l-2 border-slate-600 space-y-1 ml-1 mb-2">
                                                            {page.subsections.map(sub => {
                                                                let indentClass = 'text-slate-400 font-medium';
                                                                let textSizeClass = 'text-sm';
                                                                if (sub.level === 3) {
                                                                    indentClass = 'pl-6 text-slate-500 font-normal';
                                                                } else if (sub.level >= 4) {
                                                                    indentClass = 'pl-10 text-slate-500 font-normal';
                                                                    textSizeClass = 'text-xs';
                                                                }

                                                                return (
                                                                    <li key={sub.id}>
                                                                        <a
                                                                            href={`#${sub.id}`}
                                                                            onClick={(e) => handleTocClick(e, index, sub.id)}
                                                                            className={`block ${textSizeClass} py-1 px-2 rounded transition-colors truncate ${indentClass} hover:text-cyan-300 hover:bg-slate-700/50`}
                                                                            title={sub.title}
                                                                        >
                                                                        {sub.title}
                                                                        </a>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </nav>
            </aside>

            <article className="md:w-3/4 lg:w-4/5 bg-slate-800 p-6 sm:p-10 rounded-lg shadow-xl border border-slate-700 min-h-[500px] relative">
                {activePage ? (
                    <div key={activePage.id} className="prose prose-slate prose-invert max-w-none animate-slide-in-bottom">
                       <GoogleDocRenderer 
                           elements={activePage.content}
                           pageTitle={activePage.title}
                           footnotes={footnotes}
                           onShowFootnote={handleShowFootnote}
                           onHideFootnote={handleHideFootnote}
                       />
                    </div>
                ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-lg">규칙서 내용을 표시할 수 없습니다.</p>
                        <p className="text-sm mt-2">상단의 새로고침 버튼을 눌러 다시 시도해보세요.</p>
                    </div>
                )}
                
                {/* Pull-to-next Indicator */}
                {pullProgress > 0 && activePageIndex < pages.length - 1 && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
                        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 px-4 py-2 rounded-full shadow-xl">
                            <span className="text-cyan-400 text-sm font-bold flex items-center gap-2">
                                <ChevronRightIcon className="w-4 h-4 rotate-90" />
                                계속 스크롤하여 다음 페이지로
                            </span>
                        </div>
                        <div className="w-48 h-1.5 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className="h-full bg-cyan-400 transition-all duration-75 ease-out shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                style={{ width: `${Math.min(pullProgress, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
                
                {/* Footnote Tooltip */}
                {activeTooltip && (
                    <div 
                        className="fixed z-[100] bg-slate-900 text-slate-200 text-sm p-3 rounded-lg shadow-xl border border-slate-600 max-w-sm pointer-events-none animate-fade-in"
                        style={{
                            left: `${Math.min(window.innerWidth - 320, Math.max(10, activeTooltip.rect.left - 150))}px`,
                            top: `${activeTooltip.rect.top - 10}px`,
                            transform: 'translateY(-100%)',
                        }}
                    >
                        <div className="font-semibold text-cyan-400 mb-1 border-b border-slate-700 pb-1">각주</div>
                        <div className="whitespace-pre-wrap leading-relaxed">{activeTooltip.content}</div>
                        <div 
                            className="absolute w-3 h-3 bg-slate-900 border-b border-r border-slate-600 rotate-45"
                            style={{
                                bottom: '-7px',
                                left: `${Math.min(300, Math.max(20, activeTooltip.rect.left - Math.min(window.innerWidth - 320, Math.max(10, activeTooltip.rect.left - 150))))}px`,
                            }}
                        />
                    </div>
                )}
            </article>

            {/* Navigation Buttons (Bottom Right) */}
            {pages.length > 0 && (
                <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
                    <button
                        onClick={handlePrevPage}
                        disabled={activePageIndex === 0}
                        className={`
                            flex items-center justify-center w-12 h-12 rounded-full shadow-lg border transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500
                            ${activePageIndex === 0 
                                ? 'opacity-0 pointer-events-none translate-x-8' 
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 translate-x-0'
                            }
                        `}
                        aria-label="이전 페이지"
                        title={(activePageIndex > 0 && pages[activePageIndex - 1]) ? `이전: ${pages[activePageIndex - 1].title}` : '이전 페이지'}
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>

                    <button
                        onClick={handleNextPage}
                        disabled={activePageIndex >= pages.length - 1}
                        className={`
                            flex items-center justify-center w-12 h-12 rounded-full shadow-lg border transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500
                            ${activePageIndex >= pages.length - 1
                                ? 'opacity-0 pointer-events-none translate-x-8'
                                : 'bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-500 hover:border-cyan-400 translate-x-0'
                            }
                        `}
                        aria-label="다음 페이지"
                        title={(activePageIndex < pages.length - 1 && pages[activePageIndex + 1]) ? `다음: ${pages[activePageIndex + 1].title}` : '다음 페이지'}
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Rulebook;
