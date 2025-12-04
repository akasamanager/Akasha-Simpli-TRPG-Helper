

import React, { useState, useMemo, useCallback } from 'react';
import { Character, EnhancementAbility, Item, Skill } from '../types';
import { exampleAbilities } from '../data/abilities';
import { exampleItems } from '../data/items';
import { INITIAL_CHARACTER, BASE_SKILLS, ADDITIONAL_SKILL_POINTS, MAX_ENHANCEMENTS, MAX_ITEMS } from '../constants';
import CharacterSheet from './CharacterSheet';
import { PlusIcon, MinusIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from './icons';

interface CharacterCreatorProps {
    customAbilities?: EnhancementAbility[];
    customItems?: Item[];
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ customAbilities, customItems }) => {
    const [step, setStep] = useState(1);
    const [character, setCharacter] = useState<Character>(INITIAL_CHARACTER);
    const totalSteps = 5;

    const abilitiesToUse = useMemo(() => {
        return (customAbilities && customAbilities.length > 0) ? customAbilities : exampleAbilities;
    }, [customAbilities]);

    const itemsToUse = useMemo(() => {
        return (customItems && customItems.length > 0) ? customItems : exampleItems;
    }, [customItems]);

    const handleNext = () => setStep(prev => Math.min(prev + 1, totalSteps));
    const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));
    const handleReset = () => {
        setCharacter(INITIAL_CHARACTER);
        setStep(1);
    };

    const updateProfile = (field: keyof Character['profile'], value: string) => {
        setCharacter(prev => ({ ...prev, profile: { ...prev.profile, [field]: value } }));
    };

    const updateSkills = (skills: Skill[]) => {
        setCharacter(prev => ({...prev, abilities: {...prev.abilities, skills}}));
    };

    const updateEnhancements = (enhancements: EnhancementAbility[]) => {
        setCharacter(prev => ({...prev, abilities: {...prev.abilities, enhancements}}));
    };
    
    const updateItems = (items: Item[]) => {
        setCharacter(prev => ({...prev, inventory: {...prev.inventory, items}}));
    };

    const renderStep = () => {
        switch (step) {
            case 1: return <Step1Profile profile={character.profile} updateProfile={updateProfile} />;
            case 2: return <Step2Skills skills={character.abilities.skills} updateSkills={updateSkills} />;
            case 3: return <Step3Enhancements selected={character.abilities.enhancements} updateEnhancements={updateEnhancements} availableAbilities={abilitiesToUse} />;
            case 4: return <Step4Items selected={character.inventory.items} updateItems={updateItems} availableItems={itemsToUse} />;
            case 5: return <Step5Review character={character} handleReset={handleReset} />;
            default: return null;
        }
    };
    
    return (
        <div className="bg-slate-800 p-4 sm:p-8 rounded-lg shadow-xl max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">캐릭터 생성기</h2>
            <p className="text-center text-slate-400 mb-6">단계별로 당신만의 캐릭터를 만들어보세요.</p>
            
            {/* Progress Bar */}
            <div className="mb-8">
                <div className="relative pt-1">
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-700">
                        <div style={{ width: `${(step / totalSteps) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-cyan-500 transition-all duration-500"></div>
                    </div>
                </div>
                <p className="text-center text-sm font-semibold text-slate-300">단계 {step} / {totalSteps}</p>
            </div>

            <div className="min-h-[50vh]">
                {renderStep()}
            </div>

            {/* Navigation */}
            {step < totalSteps && (
                 <div className="flex justify-between mt-8">
                    <button onClick={handlePrev} disabled={step === 1} className="flex items-center gap-2 px-6 py-2 bg-slate-600 text-white rounded-md disabled:opacity-50 hover:bg-slate-500 transition-colors">
                        <ChevronLeftIcon className="w-5 h-5" /> 이전
                    </button>
                    <button onClick={handleNext} disabled={step === totalSteps} className="flex items-center gap-2 px-6 py-2 bg-cyan-600 text-white rounded-md disabled:opacity-50 hover:bg-cyan-500 transition-colors">
                        다음 <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

// Step Components

const Step1Profile: React.FC<{profile: Character['profile'], updateProfile: (field: keyof Character['profile'], value: string) => void}> = ({profile, updateProfile}) => {
    return (
        <div>
            <h3 className="text-xl font-bold text-cyan-400 mb-4">1. 설정</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="캐릭터 이름" value={profile.name} onChange={e => updateProfile('name', e.target.value)} />
                <InputField label="신상 정보 (외모, 직업 등)" value={profile.info} onChange={e => updateProfile('info', e.target.value)} />
                <TextAreaField label="배경 이야기" value={profile.backstory} onChange={e => updateProfile('backstory', e.target.value)} className="md:col-span-2"/>
                <TextAreaField label="인연" value={profile.bonds} onChange={e => updateProfile('bonds', e.target.value)} />
                <TextAreaField label="추억" value={profile.memories} onChange={e => updateProfile('memories', e.target.value)} />
            </div>
        </div>
    );
};
const InputField: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string}> = ({label, value, onChange, className}) => (
    <div className={className}>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input type="text" value={value} onChange={onChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
    </div>
);
const TextAreaField: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className?: string}> = ({label, value, onChange, className}) => (
    <div className={className}>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <textarea value={value} onChange={onChange} rows={4} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
    </div>
);

const Step2Skills: React.FC<{skills: Skill[], updateSkills: (skills: Skill[]) => void}> = ({skills, updateSkills}) => {
    const [newSkillName, setNewSkillName] = useState('');
    
    const totalPointsUsed = useMemo(() => {
        return skills.reduce((sum, skill) => {
            const baseValue = BASE_SKILLS.includes(skill.name) ? 1 : 0;
            return sum + (skill.score - baseValue);
        }, 0);
    }, [skills]);

    const remainingPoints = ADDITIONAL_SKILL_POINTS - totalPointsUsed;

    const handleSkillChange = (name: string, delta: number) => {
        const newSkills = skills.map(s => {
            if (s.name === name) {
                const baseValue = BASE_SKILLS.includes(name) ? 1 : 0;
                const newScore = Math.max(baseValue, s.score + delta);
                return {...s, score: newScore};
            }
            return s;
        });
        updateSkills(newSkills);
    };

    const handleAddSkill = () => {
        if(newSkillName && !skills.find(s => s.name === newSkillName)) {
            updateSkills([...skills, {name: newSkillName, score: 0}]);
            setNewSkillName('');
        }
    };
    
    const handleRemoveSkill = (name: string) => {
        updateSkills(skills.filter(s => s.name !== name));
    }

    return (
        <div>
            <h3 className="text-xl font-bold text-cyan-400 mb-4">2. 기술 점수 배분</h3>
            <div className="bg-slate-700 p-4 rounded-lg mb-6 text-center">
                <p className="text-lg">남은 추가 기술 점수: <span className="font-bold text-2xl text-cyan-300">{remainingPoints}</span> / {ADDITIONAL_SKILL_POINTS}</p>
            </div>
            <div className="space-y-4">
                {skills.map(skill => {
                    const isBase = BASE_SKILLS.includes(skill.name);
                    return (
                        <div key={skill.name} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-md">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-lg w-24">{skill.name}</span>
                                {!isBase && <button onClick={() => handleRemoveSkill(skill.name)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-4 h-4" /></button>}
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => handleSkillChange(skill.name, -1)} disabled={skill.score <= (isBase ? 1 : 0)} className="p-1 rounded-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50"><MinusIcon className="w-5 h-5"/></button>
                                <span className="text-xl font-bold w-8 text-center">{skill.score}</span>
                                <button onClick={() => handleSkillChange(skill.name, 1)} disabled={remainingPoints <= 0} className="p-1 rounded-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50"><PlusIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 flex gap-2">
                <input type="text" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} placeholder="새 기술 이름" className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                <button onClick={handleAddSkill} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500">기술 추가</button>
            </div>
        </div>
    );
};

const SelectableCard: React.FC<{title: string, description: React.ReactNode, isSelected: boolean, onSelect: () => void, disabled: boolean}> = ({title, description, isSelected, onSelect, disabled}) => (
    <div 
        onClick={() => !disabled && onSelect()}
        className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
            isSelected 
                ? 'bg-cyan-900/50 border-cyan-500 shadow-lg' 
                : disabled 
                    ? 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed'
                    : 'bg-slate-800/50 border-slate-700 hover:border-cyan-600 hover:bg-slate-700/50'
        }`}
    >
        <h4 className="font-bold text-white">{title}</h4>
        <div className="text-sm text-slate-300 mt-2">{description}</div>
    </div>
);


const Step3Enhancements: React.FC<{selected: EnhancementAbility[], updateEnhancements: (enhancements: EnhancementAbility[]) => void, availableAbilities: EnhancementAbility[]}> = ({selected, updateEnhancements, availableAbilities}) => {
    const handleSelect = useCallback((ability: EnhancementAbility) => {
        const isSelected = selected.some(a => a.name === ability.name);
        if (isSelected) {
            updateEnhancements(selected.filter(a => a.name !== ability.name));
        } else if (selected.length < MAX_ENHANCEMENTS) {
            updateEnhancements([...selected, ability]);
        }
    }, [selected, updateEnhancements]);
    
    return (
        <div>
            <h3 className="text-xl font-bold text-cyan-400 mb-4">3. 강화 능력 선택</h3>
            <div className="bg-slate-700 p-4 rounded-lg mb-6 text-center">
                <p className="text-lg">선택한 능력: <span className="font-bold text-2xl text-cyan-300">{selected.length}</span> / {MAX_ENHANCEMENTS}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {availableAbilities.map(ability => (
                    <SelectableCard 
                        key={ability.name}
                        title={ability.name}
                        description={
                            <>
                                <p>{ability.description}</p>
                                <div className="text-xs text-slate-400 mt-2 flex justify-between">
                                    <span><strong>조건:</strong> {ability.condition}</span>
                                    <span><strong>충전:</strong> {ability.charge}</span>
                                </div>
                            </>
                        }
                        isSelected={selected.some(a => a.name === ability.name)}
                        onSelect={() => handleSelect(ability)}
                        disabled={selected.length >= MAX_ENHANCEMENTS && !selected.some(a => a.name === ability.name)}
                    />
                ))}
            </div>
        </div>
    );
};

const Step4Items: React.FC<{selected: Item[], updateItems: (items: Item[]) => void, availableItems: Item[]}> = ({selected, updateItems, availableItems}) => {
    const handleSelect = useCallback((item: Item) => {
        const isSelected = selected.some(i => i.name === item.name);
        if (isSelected) {
            updateItems(selected.filter(i => i.name !== item.name));
        } else if (selected.length < MAX_ITEMS) {
            updateItems([...selected, item]);
        }
    }, [selected, updateItems]);
    
    return (
        <div>
            <h3 className="text-xl font-bold text-cyan-400 mb-4">4. 소지품 선택</h3>
            <div className="bg-slate-700 p-4 rounded-lg mb-6 text-center">
                <p className="text-lg">선택한 소지품: <span className="font-bold text-2xl text-cyan-300">{selected.length}</span> / {MAX_ITEMS}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {availableItems.map(item => (
                    <SelectableCard 
                        key={item.name}
                        title={item.name}
                        description={
                            <>
                                <p>{item.description}</p>
                                <div className="text-xs text-slate-400 mt-2 flex justify-between">
                                    <span><strong>내구도:</strong> {item.durability}</span>
                                    <span><strong>부피:</strong> {item.volume}</span>
                                </div>
                            </>
                        }
                        isSelected={selected.some(i => i.name === item.name)}
                        onSelect={() => handleSelect(item)}
                        disabled={selected.length >= MAX_ITEMS && !selected.some(i => i.name === item.name)}
                    />
                ))}
            </div>
        </div>
    );
};

const Step5Review: React.FC<{character: Character, handleReset: () => void}> = ({character, handleReset}) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-cyan-400">5. 캐릭터 시트 검토</h3>
                <button onClick={handleReset} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors">
                    다시 만들기
                </button>
            </div>
            <CharacterSheet character={character} />
        </div>
    );
};


export default CharacterCreator;
