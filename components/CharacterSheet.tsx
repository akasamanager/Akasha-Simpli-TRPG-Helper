
import React from 'react';
import { Character, EnhancementAbility, Item, Skill } from '../types';

interface CharacterSheetProps {
  character: Character;
}

const SheetSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-slate-800 p-4 rounded-lg shadow-inner">
    <h3 className="text-lg font-bold text-cyan-400 border-b border-slate-600 pb-2 mb-3">{title}</h3>
    {children}
  </div>
);

const SkillDisplay: React.FC<{ skill: Skill }> = ({ skill }) => (
  <div className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md">
    <span className="font-semibold">{skill.name}</span>
    <span className="font-bold text-cyan-300 text-lg">{skill.score}</span>
  </div>
);

const AbilityDisplay: React.FC<{ ability: EnhancementAbility }> = ({ ability }) => (
  <div className="bg-slate-700/50 p-3 rounded-md">
    <h4 className="font-bold text-slate-100">{ability.name}</h4>
    <p className="text-sm text-slate-300 mt-1">{ability.description}</p>
    <div className="text-xs text-slate-400 mt-2 flex justify-between">
      <span><strong>조건:</strong> {ability.condition}</span>
      <span><strong>충전:</strong> {ability.charge}</span>
    </div>
  </div>
);

const ItemDisplay: React.FC<{ item: Item }> = ({ item }) => (
  <div className="bg-slate-700/50 p-3 rounded-md">
    <h4 className="font-bold text-slate-100">{item.name}</h4>
    <p className="text-sm text-slate-300 mt-1">{item.description}</p>
    <div className="text-xs text-slate-400 mt-2 flex justify-between">
      <span><strong>내구도:</strong> {item.durability}</span>
      <span><strong>부피:</strong> {item.volume}</span>
    </div>
  </div>
);

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character }) => {
  const totalVolume = character.inventory.items.reduce((sum, item) => sum + item.volume, 0);

  return (
    <div className="bg-slate-900/50 p-6 rounded-xl shadow-2xl border border-slate-700">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-white tracking-wider">{character.profile.name || '캐릭터 이름'}</h1>
        <p className="text-slate-400 mt-1">{character.profile.info || '캐릭터 신상 정보'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-1 space-y-6">
          <SheetSection title="기본 능력">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-sm text-slate-400">행운점</div>
                <div className="text-3xl font-bold text-cyan-300">{character.abilities.luck}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">총 부피</div>
                <div className="text-3xl font-bold text-cyan-300">{totalVolume}</div>
              </div>
            </div>
          </SheetSection>
          <SheetSection title="기술 점수">
            <div className="space-y-2">
              {character.abilities.skills.map(skill => <SkillDisplay key={skill.name} skill={skill} />)}
            </div>
          </SheetSection>
        </div>

        {/* Middle Column */}
        <div className="md:col-span-1 space-y-6">
          <SheetSection title="강화 능력">
            <div className="space-y-3">
              {character.abilities.enhancements.length > 0 ? (
                character.abilities.enhancements.map(ability => <AbilityDisplay key={ability.name} ability={ability} />)
              ) : <p className="text-slate-400 text-sm">선택된 강화 능력이 없습니다.</p>}
            </div>
          </SheetSection>
           <SheetSection title="소지품">
            <div className="space-y-3">
              {character.inventory.items.length > 0 ? (
                character.inventory.items.map(item => <ItemDisplay key={item.name} item={item} />)
              ) : <p className="text-slate-400 text-sm">소지품이 없습니다.</p>}
            </div>
          </SheetSection>
        </div>
        
        {/* Right Column */}
        <div className="md:col-span-1 space-y-6">
          <SheetSection title="배경 이야기">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{character.profile.backstory || '배경 이야기가 없습니다.'}</p>
          </SheetSection>
          <SheetSection title="인연">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{character.profile.bonds || '인연이 없습니다.'}</p>
          </SheetSection>
          <SheetSection title="추억">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{character.profile.memories || '추억이 없습니다.'}</p>
          </SheetSection>
        </div>
      </div>
    </div>
  );
};

export default CharacterSheet;
