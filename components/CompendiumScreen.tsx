
import React, { useEffect, useState, useRef } from 'react';
import { BASE_WEAPONS, BASE_ARTIFACTS, PERMANENT_UPGRADES } from '../services/gameData';
import { MetaState, EnemyType } from '../types';
import { IconFrame, CurrencyDisplay, NeonButton } from './Common';

interface CompendiumProps {
    onBack: () => void;
    metaState: MetaState;
    onBuy: (id: string, cost: number) => void;
}

export const CompendiumScreen: React.FC<CompendiumProps> = ({ onBack, metaState, onBuy }) => {
  const weapons = Object.values(BASE_WEAPONS);
  const artifacts = Object.values(BASE_ARTIFACTS);
  
  // Construct a flat list of navigable items including the Back button
  const allItems = [
      { id: 'BACK_BUTTON', type: 'BUTTON' },
      ...weapons.map(w => ({ ...w, _cat: 'weapon' })),
      ...PERMANENT_UPGRADES.map(p => ({ ...p, _cat: 'perm' })),
      ...artifacts.map(a => ({ ...a, _cat: 'artifact' }))
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | HTMLButtonElement | null)[]>([]);

  // Reset refs array when list changes
  itemRefs.current = itemRefs.current.slice(0, allItems.length);

  // Keyboard Navigation
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
              e.preventDefault();
          }

          let next = selectedIndex;
          const cols = 3; // Approx columns in grid for Up/Down logic
          const k = e.key;

          if (k === 'ArrowRight' || k === 'd' || k === 'D') next = (selectedIndex + 1) % allItems.length;
          else if (k === 'ArrowLeft' || k === 'a' || k === 'A') next = (selectedIndex - 1 + allItems.length) % allItems.length;
          else if (k === 'ArrowDown' || k === 's' || k === 'S') next = Math.min(selectedIndex + cols, allItems.length - 1);
          else if (k === 'ArrowUp' || k === 'w' || k === 'W') next = Math.max(selectedIndex - cols, 0);
          else if (k === 'Enter' || k === ' ') {
              const item = allItems[selectedIndex];
              if (item.id === 'BACK_BUTTON') {
                  onBack();
              } else {
                  // Attempt to buy/upgrade
                  if ((item as any)._cat === 'perm') {
                      const upg = item as any;
                      const currentLevel = metaState.permanentUpgrades?.[upg.id] || 0;
                      
                      // Check Unlock for Perm
                      let reqMet = true;
                      if (upg.unlockReq) {
                          if (upg.unlockReq.type === 'WAVE') reqMet = (metaState.maxWaveCompleted || 0) >= (upg.unlockReq.value as number);
                          // Perms usually don't have RUNS/BOSS checks but support if added
                      }

                      if (reqMet) {
                          const isMaxed = currentLevel >= upg.maxLevel;
                          const cost = Math.floor(upg.costPerLevel * Math.pow(1.5, currentLevel));
                          if (!isMaxed && metaState.currency >= cost) {
                              onBuy(upg.id, cost);
                          }
                      }
                  } else {
                      const itm = item as any;
                      const isUnlocked = !itm.unlockCost || metaState.unlockedItems.includes(itm.id);
                      if (!isUnlocked && metaState.currency >= (itm.unlockCost || 0)) {
                          // Check req met?
                          let reqMet = true;
                          if (itm.unlockReq) {
                              if (itm.unlockReq.type === 'RUNS') reqMet = metaState.runsCompleted >= (itm.unlockReq.value as number);
                              else if (itm.unlockReq.type === 'BOSS') reqMet = metaState.bossesDefeated.includes(itm.unlockReq.value as string);
                              else if (itm.unlockReq.type === 'WAVE') reqMet = (metaState.maxWaveCompleted || 0) >= (itm.unlockReq.value as number);
                          }
                          if (reqMet) {
                              onBuy(itm.id, itm.unlockCost || 0);
                          }
                      }
                  }
              }
          }
          setSelectedIndex(next);
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, allItems, metaState, onBuy, onBack]);

  // Auto-scroll
  useEffect(() => {
      const el = itemRefs.current[selectedIndex];
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [selectedIndex]);

  // Index Tracking for rendering
  let renderIndex = 1; // Start at 1 because 0 is Back Button

  const renderItem = (item: any) => {
      const currentIndex = renderIndex++;
      const isSelected = selectedIndex === currentIndex;
      const isUnlocked = !item.unlockCost || metaState.unlockedItems.includes(item.id);
      const canUnlock = !isUnlocked && metaState.currency >= (item.unlockCost || 0);
      
      let reqMet = true;
      let reqText = "";
      
      if (item.unlockReq && !isUnlocked) {
          if (item.unlockReq.type === 'RUNS') {
              reqMet = metaState.runsCompleted >= (item.unlockReq.value as number);
              reqText = `${item.unlockReq.value} Runs Completed (${metaState.runsCompleted}/${item.unlockReq.value})`;
          } else if (item.unlockReq.type === 'BOSS') {
              reqMet = metaState.bossesDefeated.includes(item.unlockReq.value as string);
              
              let bossName = "Unknown";
              if (item.unlockReq.value === EnemyType.BOSS_VANGUARD) bossName = "Vanguard";
              else if (item.unlockReq.value === EnemyType.BOSS_HIVE_MIND) bossName = "Hive Mind";
              else if (item.unlockReq.value === EnemyType.BOSS_CYBER_KRAKEN) bossName = "Cyber-Kraken";
              
              reqText = `Defeat ${bossName}`;
          } else if (item.unlockReq.type === 'WAVE') {
              reqMet = (metaState.maxWaveCompleted || 0) >= (item.unlockReq.value as number);
              reqText = `Complete Wave ${item.unlockReq.value}`;
          }
      }

      const isVisible = isUnlocked || reqMet;

      // Dynamic styles based on state
      let containerClass = `border p-4 flex flex-col gap-2 relative transition-all group ${isSelected ? 'z-10' : ''} `;
      let nameClass = "font-bold text-lg leading-none mb-1 ";
      
      if (isUnlocked) {
          containerClass += isSelected ? "bg-green-900/30 border-green-400" : "bg-green-900/10 border-green-900/30 hover:border-green-500/50";
          nameClass += "text-green-400";
      } else if (isVisible) {
          containerClass += isSelected ? "bg-gray-800 border-orange-500" : "bg-gray-900 border-gray-700 hover:border-orange-500";
          nameClass += "text-white";
      } else {
          containerClass += "bg-black border-gray-800 opacity-50";
          nameClass += "text-gray-600";
      }

      return (
        <div 
            key={item.id} 
            className={containerClass}
            ref={el => { itemRefs.current[currentIndex] = el; }}
            onClick={() => setSelectedIndex(currentIndex)}
        >
            {isUnlocked && (
                <div className="absolute top-2 right-2 text-[10px] font-mono text-green-500 border border-green-900/50 px-1.5 py-0.5 bg-black/50 tracking-widest">
                    AVAILABLE
                </div>
            )}
            
            <div className="flex items-start gap-4">
                <div className={isVisible ? '' : 'grayscale'}>
                    {isVisible ? (
                        <IconFrame id={item.id} color={item.color} size="lg" />
                    ) : (
                        <div className="w-16 h-16 bg-black border border-gray-700 flex items-center justify-center text-4xl text-gray-800">?</div>
                    )}
                </div>
                <div className="flex-grow pr-16">
                    <h4 className={nameClass}>{isVisible ? item.name : 'LOCKED SIGNAL'}</h4>
                    {isVisible && <div className="text-[10px] font-mono text-gray-500 mb-2 uppercase">{item.type?.replace('_', ' ') || item.rarity}</div>}
                    <p className="text-gray-400 text-xs leading-relaxed">{isVisible ? item.description : 'Data fragments required for decryption.'}</p>
                </div>
            </div>
            
            {!isUnlocked && isVisible && (
                <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between items-center">
                    <CurrencyDisplay amount={item.unlockCost || 0} size="sm" />
                    <NeonButton 
                        variant="shop"
                        onClick={(e) => { e.stopPropagation(); canUnlock && onBuy(item.id, item.unlockCost || 0); }}
                        disabled={!canUnlock}
                        className="py-1 px-4 text-xs"
                    >
                        {canUnlock ? 'BUY' : 'NEED CHIPS'}
                    </NeonButton>
                </div>
            )}
            
            {!isUnlocked && !isVisible && (
                <div className="mt-2 pt-2 border-t border-gray-800 text-xs text-red-500 font-mono">
                    REQ: {reqText}
                </div>
            )}
        </div>
      );
  };

  const renderPermUpgrade = (upg: any) => {
      const currentIndex = renderIndex++;
      const isSelected = selectedIndex === currentIndex;
      const currentLevel = metaState.permanentUpgrades?.[upg.id] || 0;
      const isMaxed = currentLevel >= upg.maxLevel;
      const cost = Math.floor(upg.costPerLevel * Math.pow(1.5, currentLevel));
      
      let reqMet = true;
      let reqText = "";
      if (upg.unlockReq) {
          if (upg.unlockReq.type === 'WAVE') {
              reqMet = (metaState.maxWaveCompleted || 0) >= (upg.unlockReq.value as number);
              reqText = `Complete Wave ${upg.unlockReq.value}`;
          }
      }

      const canAfford = reqMet && !isMaxed && metaState.currency >= cost;
      const hasInvested = currentLevel > 0;

      // Matching Weapons/Collectibles scheme
      let containerClass = `border p-4 relative group transition-all ${isSelected ? 'z-10' : ''} `;
      let nameClass = "font-bold text-lg ";

      if (hasInvested) {
          containerClass += isSelected ? "bg-green-900/30 border-green-400" : "bg-green-900/10 border-green-900/30 hover:border-green-500/50";
          nameClass += "text-green-400";
      } else if (!reqMet) {
          containerClass += "bg-black border-gray-800 opacity-75"; // Greyed out
          nameClass += "text-gray-600";
      } else {
          // Available to buy
          containerClass += isSelected ? "bg-gray-800 border-orange-500" : "bg-gray-900 border-gray-700 hover:border-orange-500";
          nameClass += "text-white";
      }

      return (
          <div 
            key={upg.id} 
            className={containerClass}
            ref={el => { itemRefs.current[currentIndex] = el; }}
            onClick={() => setSelectedIndex(currentIndex)}
          >
              <div className="flex justify-between items-start mb-2">
                  <h4 className={nameClass}>{reqMet ? upg.name : 'LOCKED MOD'}</h4>
                  <div className="flex gap-1">
                      {Array.from({length: upg.maxLevel}).map((_, i) => (
                          <div key={i} className={`w-2 h-4 border ${hasInvested ? 'border-green-500' : 'border-gray-500'} ${i < currentLevel ? (hasInvested ? 'bg-green-400' : 'bg-white') : 'bg-black'}`} />
                      ))}
                  </div>
              </div>
              <p className="text-gray-400 text-xs mb-4 min-h-[40px]">{reqMet ? upg.description : "Advanced combat data required."}</p>
              
              <div className={`flex justify-between items-center border-t pt-2 ${hasInvested ? 'border-green-900/50' : 'border-gray-800'}`}>
                   {!reqMet ? (
                        <div className="w-full text-center font-bold text-xs text-red-500 uppercase tracking-widest">
                            REQ: {reqText}
                        </div>
                   ) : !isMaxed ? (
                       <>
                        <CurrencyDisplay amount={cost} size="sm" />
                        <NeonButton 
                            variant="shop"
                            onClick={(e) => { e.stopPropagation(); canAfford && onBuy(upg.id, cost); }}
                            disabled={!canAfford}
                            className="py-1 px-4 text-xs"
                        >
                            UPGRADE
                        </NeonButton>
                       </>
                   ) : (
                       <div className={`w-full text-center font-bold text-sm uppercase tracking-widest ${hasInvested ? 'text-green-400' : 'text-gray-400'}`}>MAX RANK</div>
                   )}
              </div>
          </div>
      );
  };

  return (
    <div className="absolute inset-0 bg-black z-50 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4 sticky top-0 bg-black/90 backdrop-blur-sm z-20 py-4">
          <div>
              <h2 className="text-4xl font-normal text-white tracking-tighter uppercase">Upgrade Shop</h2>
              <div className="font-mono text-sm mt-1 flex items-center gap-2 text-white">
                AVAILABLE: <CurrencyDisplay amount={metaState.currency} size="md" />
              </div>
          </div>
          <NeonButton 
            ref={el => { itemRefs.current[0] = el; }}
            onClick={onBack}
            variant={selectedIndex === 0 ? 'secondary' : 'ghost'}
            className="py-2 px-6 text-sm"
          >
            Return
          </NeonButton>
        </div>

        {/* Weapons Section First */}
        <div className="mb-12">
          <h3 className="text-2xl text-white font-normal mb-6 uppercase tracking-widest border-l-4 border-white pl-4">Weapons</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weapons.map(renderItem)}
          </div>
        </div>

        {/* Permanent Modifications Section Second */}
        <div className="mb-12">
            <h3 className="text-2xl text-white font-normal mb-6 uppercase tracking-widest border-l-4 border-white pl-4 flex items-center gap-3">
                Permanent Modifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {PERMANENT_UPGRADES.map(renderPermUpgrade)}
            </div>
        </div>

        {/* Artifacts (Renamed to Collectibles) Section Third */}
        <div>
          <h3 className="text-2xl text-white font-normal mb-6 uppercase tracking-widest border-l-4 border-white pl-4">Collectibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artifacts.map(renderItem)}
          </div>
        </div>
      </div>
    </div>
  );
};
