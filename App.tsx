
import React, { useState, useEffect, useRef } from 'react';
import { Joystick } from './components/Joystick';
import { GameHUD, MainMenu, LevelUpScreen, GameOverScreen, DebugMenu, PauseMenu, MissionCompleteScreen, AugmentScreen } from './components/UIOverlays';
import { CompendiumScreen } from './components/CompendiumScreen';
import { loadMetaState, saveMetaState, resetMetaState } from './services/persistence';
import { useGameEngine } from './hooks/useGameEngine';
import { MetaState } from './types';
import { audioEngine } from './services/audioEngine';
import { WEAPON_AUGMENTS } from './services/gameData';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metaState, setMetaState] = useState<MetaState>(() => loadMetaState());

  const {
    status,
    setStatus,
    uiStats,
    waveInfo,
    inventory,
    artifacts,
    activeBoss,
    activeBosses, // Destructure activeBosses
    levelUpOptions,
    gameOverInfo,
    showDebug,
    setShowDebug,
    startGame,
    selectUpgrade,
    generateDebugOptions,
    handleDebugSpawn,
    togglePause,
    handleDebugMission,
    advanceWave,
    getNextMissionInfo,
    tutorialStep,
    isMissionReward,
    handleAdReward,
    augmentTarget,
    applyAugment,
    handleDebugPickup
  } = useGameEngine(canvasRef, metaState, setMetaState);

  useEffect(() => {
    if (status !== 'LEVEL_UP') return;
    const handleMenuKeys = (e: KeyboardEvent) => {
      const key = e.key;
      if (key === '1' && levelUpOptions[0]) selectUpgrade(levelUpOptions[0]);
      if (key === '2' && levelUpOptions[1]) selectUpgrade(levelUpOptions[1]);
      if (key === '3' && levelUpOptions[2]) selectUpgrade(levelUpOptions[2]);
    };
    window.addEventListener('keydown', handleMenuKeys);
    return () => window.removeEventListener('keydown', handleMenuKeys);
  }, [status, levelUpOptions, selectUpgrade]);

  useEffect(() => {
    if (status !== 'AUGMENT_SELECT' || !augmentTarget) return;
    const augments = WEAPON_AUGMENTS[augmentTarget.id];
    if (!augments) return;

    const handleAugmentKeys = (e: KeyboardEvent) => {
      const key = e.key;
      if (key === '1' && augments[0]) applyAugment(augments[0].id);
      if (key === '2' && augments[1]) applyAugment(augments[1].id);
    };
    window.addEventListener('keydown', handleAugmentKeys);
    return () => window.removeEventListener('keydown', handleAugmentKeys);
  }, [status, augmentTarget, applyAugment]);

  useEffect(() => {
    if (status === 'MENU') {
      audioEngine.stop();
    } else if (status === 'PAUSED') {
      audioEngine.setMasterVolume(0);
    } else if (status === 'LEVEL_UP' || status === 'MISSION_COMPLETE' || status === 'AUGMENT_SELECT') {
      audioEngine.setMasterVolume(0.5);
      audioEngine.setProfile('TRIBAL');
    } else {
      audioEngine.setMasterVolume(0.5);
      audioEngine.setProfile('INDUSTRIAL');
    }
  }, [status]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="block fixed inset-0 bg-black touch-none"
      />
      {status === 'PLAYING' && <Joystick />}
      {(status === 'PLAYING' || status === 'PAUSED' || status === 'LEVEL_UP' || status === 'MISSION_COMPLETE' || status === 'AUGMENT_SELECT') && (
        <GameHUD
          key="game-hud"
          uiStats={uiStats}
          waveInfo={waveInfo}
          inventory={inventory}
          artifacts={artifacts}
          activeBoss={activeBoss}
          activeBosses={activeBosses} // Pass activeBosses
          onPause={togglePause}
          isLevelUp={status === 'LEVEL_UP'}
          tutorialStep={tutorialStep}
        />
      )}

      {status === 'PAUSED' && (
        <PauseMenu
          onResume={togglePause}
          onQuit={() => setStatus('MENU')}
        />
      )}

      {status === 'MENU' && (
        <MainMenu
          startGame={startGame}
          openCompendium={() => setStatus('COMPENDIUM')}
          currency={metaState.currency}
          showShop={true}
          maxWave={metaState.maxWaveCompleted}
        />
      )}

      {status === 'LEVEL_UP' && (
        <LevelUpScreen
          options={levelUpOptions}
          onSelect={selectUpgrade}
          title={isMissionReward && waveInfo.mission ? `MISSION COMPLETE: ${waveInfo.mission.description}` : undefined}
        />
      )}

      {status === 'AUGMENT_SELECT' && augmentTarget && (
        <AugmentScreen
          weapon={augmentTarget}
          onSelect={applyAugment}
        />
      )}

      {status === 'MISSION_COMPLETE' && (
        <MissionCompleteScreen
          nextMission={getNextMissionInfo()}
          completedMission={waveInfo.mission}
          onContinue={advanceWave}
        />
      )}

      {status === 'GAME_OVER' && gameOverInfo && (
        <GameOverScreen
          score={gameOverInfo.score}
          level={gameOverInfo.level}
          wave={gameOverInfo.wave}
          chipsEarned={gameOverInfo.chipsEarned}
          currency={metaState.currency}
          newUnlocks={gameOverInfo.newUnlocks}
          newAvailable={gameOverInfo.newAvailable}
          onRestart={startGame}
          openStore={() => setStatus('COMPENDIUM')}
          onDoubleReward={handleAdReward}
        />
      )}

      {status === 'COMPENDIUM' && (
        <CompendiumScreen
          onBack={() => setStatus('MENU')}
          metaState={metaState}
          onBuy={(id, cost) => {
            const isPerm = id.startsWith('perm_');
            if (isPerm) {
              const currentLevel = metaState.permanentUpgrades?.[id] || 0;
              const newPerms = { ...metaState.permanentUpgrades, [id]: currentLevel + 1 };
              const newState = { ...metaState, currency: metaState.currency - cost, permanentUpgrades: newPerms };
              setMetaState(newState);
              saveMetaState(newState);
            } else {
              const newState = { ...metaState, currency: metaState.currency - cost, unlockedItems: [...metaState.unlockedItems, id] };
              setMetaState(newState);
              saveMetaState(newState);
            }
          }}
        />
      )}

      {showDebug && (
        <DebugMenu
          generateOptions={generateDebugOptions}
          onSelect={selectUpgrade}
          onClose={() => setShowDebug(false)}
          onSpawnEnemy={handleDebugSpawn}
          onStartMission={handleDebugMission}
          onSkipWave={advanceWave}
          onSpawnPickup={handleDebugPickup}
        />
      )}
    </>
  );
};

export default App;
