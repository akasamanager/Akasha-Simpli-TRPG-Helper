
import React, { useState, useCallback, useEffect } from 'react';
import Rulebook from './components/Rulebook';
import CharacterCreator from './components/CharacterCreator';
import RulebookBot from './components/RulebookBot';
import { ArrowPathIcon } from './components/icons';
import { EnhancementAbility, Item, RulebookPage } from './types';

type View = 'rulebook' | 'creator';

const App: React.FC = () => {
  const [view, setView] = useState<View>('rulebook');
  
  // State for sync status
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [relativeTime, setRelativeTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [fullDeployId, setFullDeployId] = useState('');
  const [displayVersion, setDisplayVersion] = useState('');
  
  const [forceOffline, setForceOffline] = useState(false);

  // Dynamic Game Data from Rulebook
  const [gameData, setGameData] = useState<{ abilities: EnhancementAbility[], items: Item[] }>({ abilities: [], items: [] });
  // Pages for Chatbot
  const [pages, setPages] = useState<RulebookPage[]>([]);

  const handleGameDataLoaded = useCallback((abilities: EnhancementAbility[], items: Item[]) => {
      setGameData({ abilities, items });
  }, []);

  const handlePagesLoaded = useCallback((loadedPages: RulebookPage[]) => {
      setPages(loadedPages);
  }, []);

  useEffect(() => {
      const storedLastUpdated = localStorage.getItem('lastUpdatedTime');
      if (storedLastUpdated) {
          setLastUpdated(new Date(storedLastUpdated));
      }
  }, []);

  const handleUpdate = useCallback((status: 'success' | 'fallback', error?: Error) => {
    setIsLoading(false);
    if (status === 'success') {
      const now = new Date();
      setLastUpdated(now);
      localStorage.setItem('lastUpdatedTime', now.toISOString());
      setIsFallbackActive(false);
      setFetchError(null);
    } else {
      // Don't clear lastUpdated if fallback, just show status
      setIsFallbackActive(true);
      if (error) {
          setFetchError(error.message);
      } else if (!fetchError) { // Keep existing error if undefined passed
          setFetchError('오프라인 데이터 사용 중');
      }
    }
  }, [fetchError]);

  const handleSetVersion = useCallback((id: string) => {
    setFullDeployId(id);
  }, []);

  useEffect(() => {
    if (!fullDeployId) return;

    const shortId = fullDeployId.slice(-6);

    const MANUAL_VERSIONS: Record<string, number> = {
        "AKfycbylvOe0ltS1u558pgWjj_cHVtFBvKvecmasv1KEH0Sbc-V0fU2u7-xU02AmfyGw364A": 69,
        "AKfycbzYZ7Byxr6qOBL2Emi7J3cWQfHzHnvkQiYp1r2x28SAWXMEitOyq0p29gg9flM_UF9L": 70,
        "AKfycbyOS8KsUDB375DtsvUUz1GbhJagxERlVJRRv6Svde8K_fGxdOTPVNF-9oOFNeQgfwMo": 72,
        "AKfycbylCR1uPC9vjA3Xw62932vd1Hndwysqglw9-ktIPSC2iF8zRB6qYOrBOZGFvq6D5hva": 80,
        "AKfycbyPo0la3Zfa_EuNzmO6caEhuQXvqIsRiaecZhgnbxhZxDh_GDQk-fpeoLznvDHnZIth": 81,
    };

    if (MANUAL_VERSIONS[fullDeployId]) {
        setDisplayVersion(`v${MANUAL_VERSIONS[fullDeployId]}(${shortId})`);
        return;
    }

    let versions: Record<string, number> = {};
    try {
        const storedVersions = localStorage.getItem('deployVersions');
        if (storedVersions) {
            versions = JSON.parse(storedVersions);
        }
    } catch (e) {
        console.error("Failed to parse deploy versions from localStorage", e);
        localStorage.removeItem('deployVersions');
    }

    let versionNumber: number;
    if (versions[fullDeployId]) {
        versionNumber = versions[fullDeployId];
    } else {
        const maxVersion = Object.values(versions).reduce((max, v) => Math.max(max, v), 0);
        const newVersionNumber = maxVersion + 1;
        versions[fullDeployId] = newVersionNumber;
        try {
            localStorage.setItem('deployVersions', JSON.stringify(versions));
        } catch (e) {
            console.error("Failed to save deploy versions to localStorage", e);
        }
        versionNumber = newVersionNumber;
    }
    
    setDisplayVersion(`v${versionNumber}(${shortId})`);

  }, [fullDeployId]);


  useEffect(() => {
    if (!lastUpdated) {
      setRelativeTime('');
      return;
    }

    const updateRelativeTime = () => {
      const now = new Date();
      const seconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
      if (seconds < 5) {
        setRelativeTime('방금 전 업데이트');
      } else if (seconds < 60) {
        setRelativeTime(`${seconds}초 전 업데이트`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setRelativeTime(`${minutes}분 전 업데이트`);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const triggerRefresh = () => {
    setIsLoading(true);
    // Don't clear lastUpdated immediately on refresh to avoid flickering
    setIsFallbackActive(false);
    setFetchError(null);
    setForceOffline(false); // Reset forced offline
    setRefreshKey(prev => prev + 1);
  };
  
  const toggleOfflineMode = () => {
      setForceOffline(true);
      setIsLoading(true);
      setFetchError("수동으로 활성화됨");
      setRefreshKey(prev => prev + 1);
  }

  const navButtonClasses = (isActive: boolean) =>
    `px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 ${
      isActive
        ? 'bg-cyan-600 text-white'
        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
    }`;
    
  const renderSyncStatus = () => {
    let statusContent;
    if (isLoading) {
        statusContent = <span className="text-slate-400">동기화 중...</span>;
    } else if (isFallbackActive) {
        statusContent = (
            <div className="flex items-center gap-2 text-amber-400" title={fetchError || ''}>
                <span>⚡️ 오프라인 버전 표시 중: <span className="font-mono text-xs">{fetchError}</span></span>
            </div>
        );
    } else if (lastUpdated) {
        statusContent = <span className="text-green-400">{relativeTime}</span>;
    }

    return (
        <div className="flex items-center gap-2 text-xs">
            {statusContent}
            <button onClick={triggerRefresh} className="p-1 text-slate-400 hover:text-white transition-colors" aria-label="규칙서 새로고침">
                <ArrowPathIcon className="w-4 h-4" />
            </button>
        </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans">
      <header className="bg-slate-800 shadow-lg sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white">Akasha Simpli TRPG Helper</h1>
              {renderSyncStatus()}
            </div>
            <div className="flex items-center space-x-4">
               <button
                 onClick={() => setView('rulebook')}
                 className={navButtonClasses(view === 'rulebook')}
               >
                 규칙서 보기
               </button>
              <button
                onClick={() => setView('creator')}
                className={navButtonClasses(view === 'creator')}
              >
                캐릭터 생성
              </button>
            </div>
          </div>
        </nav>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Render Rulebook always but hide it when not active to persist state and fetching logic */}
        <div className={view === 'rulebook' ? 'block' : 'hidden'}>
            <Rulebook 
                onUpdate={handleUpdate} 
                refreshTrigger={refreshKey} 
                setDeployVersion={handleSetVersion} 
                forceOffline={forceOffline}
                onDataLoaded={handleGameDataLoaded}
                onPagesLoaded={handlePagesLoaded}
            />
        </div>
        
        {view === 'creator' && (
            <CharacterCreator 
                customAbilities={gameData.abilities}
                customItems={gameData.items}
            />
        )}
      </main>
      
      {/* Bot is now global */}
      <RulebookBot pages={pages} />

      <footer className="text-center p-4 text-slate-500 text-sm space-y-2">
        <p>Created for Akasha Simpli TRPG. All rules content provided by KingCrab.</p>
        <div className="flex flex-col items-center gap-1">
            {displayVersion && (
                <p className="font-mono text-xs text-slate-600">
                    Deploy Ver: {displayVersion}
                </p>
            )}
            <button 
                onClick={toggleOfflineMode}
                className="text-xs text-slate-600 hover:text-slate-400 underline decoration-dotted transition-colors"
            >
                오프라인 데이터로 보기
            </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
