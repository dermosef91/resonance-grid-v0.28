
import React, { useState } from 'react';
import { UpgradeOption, EnemyType, MissionType } from '../../types';
import { ALL_ENEMIES_DB, generateRunWaves } from '../../services/gameData';
import { OverlayContainer } from '../Common';
import { audioEngine, MusicTheme } from '../../services/audioEngine';

export const DebugMenu: React.FC<{
    generateOptions: () => UpgradeOption[],
    onSelect: (opt: UpgradeOption) => void,
    onClose: () => void,
    onSpawnEnemy: (type: EnemyType) => void,
    onStartMission: (type: MissionType) => void,
    onSkipWave: () => void,
    onSpawnPickup: (kind: string) => void
}> = ({ generateOptions, onSelect, onClose, onSpawnEnemy, onStartMission, onSkipWave, onSpawnPickup }) => {
    const [tab, setTab] = useState<'SPAWN' | 'MISSION' | 'CHEATS' | 'LOOT' | 'AUDIO'>('SPAWN');
    const [refreshCounter, setRefreshCounter] = useState(0); // Used to force re-render on cheat select

    // generateOptions reads from mutable refs, so re-calling it on render gives fresh data
    const options = generateOptions();

    // --- ENEMY DATA PREP ---
    const [wavesCache] = useState(() => {
        const waves = generateRunWaves();
        const map = new Map<string, number[]>();
        waves.forEach(w => {
            const add = (t: string) => {
                const list = map.get(t) || [];
                if (!list.includes(w.id)) list.push(w.id);
                map.set(t, list);
            };
            w.types.forEach(add);
            if (w.boss) add(w.boss);
        });
        return map;
    });

    const allEnemyData = Object.values(EnemyType).map(type => {
        const info = ALL_ENEMIES_DB.find(e => e.type === type);
        const waves = wavesCache.get(type)?.sort((a, b) => a - b) || [];
        const waveStr = waves.length > 0
            ? (waves.filter(w => w <= 20).join(', ') + (waves.some(w => w > 20) ? ', ...' : ''))
            : "None";

        return {
            type,
            info,
            waveStr,
            sortOrder: waves.length > 0 ? waves[0] : 999
        };
    });

    const regularEnemies = allEnemyData
        .filter(e => e.info && !e.type.includes('BOSS'))
        .sort((a, b) => a.sortOrder - b.sortOrder);

    const bosses = allEnemyData
        .filter(e => e.info && e.type.includes('BOSS'))
        .filter(e => !['BOSS_TRINITY_CUBE', 'BOSS_TRINITY_PYRAMID', 'BOSS_TRINITY_ORB'].includes(e.type))
        .sort((a, b) => a.sortOrder - b.sortOrder);

    const renderEnemyButton = (item: { type: EnemyType, info: any, waveStr: string }) => (
        <button key={item.type} onClick={() => onSpawnEnemy(item.type)} className="flex items-start gap-3 bg-gray-900 border border-gray-700 hover:border-green-500 text-left p-2 hover:bg-gray-800 group h-full">
            <div className="w-3 h-3 mt-1 border border-gray-600 group-hover:border-white shrink-0" style={{ backgroundColor: item.info?.color || '#555' }}></div>
            <div className="flex flex-col min-w-0 w-full">
                <div className="text-green-400 font-bold text-xs group-hover:text-white truncate">{item.info ? item.info.name : item.type}</div>
                {item.info ? (
                    <div className="text-[10px] text-gray-500 font-mono flex flex-wrap gap-x-2 gap-y-0 leading-tight mt-0.5">
                        <span title="Health">HP:{item.info.hp}</span>
                        <span title="Damage">DMG:{item.info.damage}</span>
                        <span title="Speed">SPD:{item.info.speed}</span>
                        <span title="XP Value">XP:{item.info.xp}</span>
                        <span title={`Waves: ${item.waveStr}`} className="ml-auto text-gray-400 truncate w-full text-right mt-0.5 border-t border-gray-800 pt-0.5">Waves: {item.waveStr}</span>
                    </div>
                ) : (
                    <div className="text-[10px] text-red-500 font-mono">NO DATA</div>
                )}
            </div>
        </button>
    );

    const lootTypes = [
        'XP_SMALL', 'XP_LARGE', 'HEALTH', 'CURRENCY',
        'TIME_CRYSTAL', 'SUPPLY_DROP',
        'MISSION_ITEM', 'MISSION_ZONE',
        'KALEIDOSCOPE', 'STASIS_FIELD'
    ];

    const themes: MusicTheme[] = [
        'DEEP_CIRCUIT',
        'SUB_TERRA',
        'CIRCUIT_BREAKER',
        'LOGIC_GATE',

        'ETHEREAL_VOYAGE',

        'MIND_FLAYER',

        'GLITCH_STORM',
        'SOLAR_PLAINS'
    ];

    // Audio Control Helper
    const renderAudioControl = (label: string, prop: keyof typeof audioEngine, min: number, max: number, step: number) => (
        <div className="flex flex-col gap-1 mb-2 bg-gray-900 border border-gray-700 p-2">
            <div className="flex justify-between items-center text-xs">
                <span className="text-green-400 font-bold uppercase">{label}</span>
                <span className="text-white font-mono">{(audioEngine[prop] as number).toFixed(2)}</span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                defaultValue={audioEngine[prop] as number}
                onChange={(e) => {
                    (audioEngine as any)[prop] = parseFloat(e.target.value);
                    setRefreshCounter(prev => prev + 1); // Force update label
                }}
                className="w-full accent-green-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );

    const renderAudioToggle = (label: string, prop: keyof typeof audioEngine) => (
        <button
            className={`flex items-center justify-between p-2 border ${audioEngine[prop] ? 'border-green-500 bg-green-900/30' : 'border-gray-700 bg-gray-900'} hover:bg-gray-800`}
            onClick={() => {
                (audioEngine as any)[prop] = !audioEngine[prop];
                setRefreshCounter(prev => prev + 1);
            }}
        >
            <span className="text-xs font-bold uppercase text-white">{label}</span>
            <div className={`w-3 h-3 rounded-full ${audioEngine[prop] ? 'bg-green-500' : 'bg-gray-600'}`}></div>
        </button>
    );

    return (
        <OverlayContainer zIndex={100} className="items-start pt-10 overflow-y-auto bg-gray-900/90">
            <div className="bg-black border border-green-500 p-6 max-w-4xl w-full text-left font-mono text-xs mb-10 max-h-[80vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-green-900 pb-2">
                    <h2 className="text-xl text-green-500 font-bold uppercase">DEBUG TERMINAL</h2>
                    <button onClick={onClose} className="text-red-500 hover:text-white font-bold">[CLOSE]</button>
                </div>

                <div className="flex gap-2 mb-6 flex-wrap">
                    {(['SPAWN', 'MISSION', 'CHEATS', 'LOOT', 'AUDIO'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 font-bold uppercase border ${tab === t ? 'bg-green-900 border-green-500 text-white' : 'bg-black border-gray-700 text-gray-500 hover:text-gray-300'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="overflow-y-auto pr-2">
                    {tab === 'SPAWN' && (
                        <div className="flex flex-col gap-6">
                            <div>
                                <div className="text-green-700 font-bold mb-2 border-b border-gray-800">REGULAR HOSTILES</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {regularEnemies.map(renderEnemyButton)}
                                </div>
                            </div>

                            <div>
                                <div className="text-red-700 font-bold mb-2 border-b border-gray-800">BOSS THREATS</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {bosses.map(renderEnemyButton)}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'MISSION' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 md:col-span-4 text-green-700 font-bold mb-1 border-b border-gray-800">FORCE MISSION</div>
                            {Object.values(MissionType).map(type => (
                                <button key={type} onClick={() => onStartMission(type)} className="bg-gray-900 border border-gray-700 hover:border-blue-500 text-gray-400 hover:text-blue-400 p-2 text-center">
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}

                    {tab === 'CHEATS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-green-700 font-bold mb-1 border-b border-gray-800">UPGRADES / CHEATS</div>

                            <button onClick={onSkipWave} className="flex items-center gap-2 bg-gray-900 border border-blue-700 hover:bg-gray-800 p-2 hover:border-white text-left group">
                                <div className="w-4 h-4 border border-gray-600 group-hover:border-white bg-blue-500"></div>
                                <div className="flex flex-col">
                                    <span className="text-blue-400 font-bold group-hover:text-white">SKIP WAVE</span>
                                    <span className="text-[10px] text-gray-500">Instantly start next wave</span>
                                </div>
                            </button>

                            {options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        onSelect(opt);
                                        setRefreshCounter(prev => prev + 1);
                                    }}
                                    className="flex items-center gap-2 bg-gray-900 border border-gray-700 hover:bg-gray-800 p-2 hover:border-white text-left group"
                                >
                                    <div className="w-4 h-4 border border-gray-600 group-hover:border-white" style={{ backgroundColor: opt.color }}></div>
                                    <div className="flex flex-col">
                                        <span className="text-green-400 font-bold group-hover:text-white">{opt.name}</span>
                                        <span className="text-[10px] text-gray-500">{opt.description.substring(0, 40)}...</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {tab === 'LOOT' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 md:col-span-4 text-green-700 font-bold mb-1 border-b border-gray-800">SPAWN DROPS</div>
                            {lootTypes.map(kind => (
                                <button key={kind} onClick={() => onSpawnPickup(kind)} className="bg-gray-900 border border-gray-700 hover:border-yellow-500 text-gray-400 hover:text-yellow-400 p-2 text-center font-bold">
                                    {kind.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    )}

                    {tab === 'AUDIO' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="col-span-full text-green-700 font-bold mb-1 border-b border-gray-800 flex justify-between">
                                <span>PROCEDURAL AUDIO PARAMS</span>
                                <button
                                    className="text-[10px] bg-red-900 px-2 text-white hover:bg-red-700"
                                    onClick={() => {
                                        // Reset Basics
                                        audioEngine.filterModDepth = 0; // Reset to 0
                                        audioEngine.noteDensityMod = 0;
                                        audioEngine.swingAmount = 0;
                                        audioEngine.gateIntensity = 0;
                                        audioEngine.decayModAmount = 0;
                                        audioEngine.detuneAmount = 0;
                                        audioEngine.currentTheme = 'DEEP_CIRCUIT';
                                        // Reset Advanced
                                        audioEngine.breakdownMode = true; // Default True
                                        audioEngine.forceBreakdown = false;
                                        audioEngine.buildupMode = true; // Default True
                                        audioEngine.inversionChance = 0;
                                        audioEngine.accentVolume = 0;
                                        audioEngine.tempoBreathingDepth = 0;
                                        audioEngine.overtureVolume = 0;
                                        audioEngine.silenceChance = 0;
                                        audioEngine.currentOctaveShift = 1.0; // Reset Octave

                                        setRefreshCounter(prev => prev + 1);
                                    }}
                                >
                                    RESET ALL
                                </button>
                            </div>

                            {/* Theme Selection */}
                            <div className="col-span-full mb-2">
                                <div className="text-green-700 font-bold mb-1 text-[10px]">MUSIC THEME</div>
                                <div className="flex gap-2 flex-wrap">
                                    {themes.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => {
                                                audioEngine.setTheme(t);
                                                setRefreshCounter(prev => prev + 1);
                                            }}
                                            className={`px-3 py-1 text-[10px] font-bold border ${audioEngine.currentTheme === t ? 'bg-green-600 text-white border-white' : 'bg-gray-900 text-gray-400 border-gray-700'}`}
                                        >
                                            {t.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Basic Modulators */}
                            {renderAudioControl('Filter Mod Depth', 'filterModDepth', 0, 1, 0.05)}
                            {renderAudioControl('Note Density Mod', 'noteDensityMod', -1, 1, 0.1)}
                            {renderAudioControl('Swing Amount', 'swingAmount', 0, 1, 0.05)}
                            {renderAudioControl('Gate Intensity', 'gateIntensity', 0, 1, 0.05)}
                            {renderAudioControl('Decay Modulation', 'decayModAmount', 0, 1, 0.05)}
                            {renderAudioControl('Detune Drift', 'detuneAmount', 0, 1, 0.05)}

                            {/* Advanced Events */}
                            <div className="col-span-full text-green-700 font-bold mt-4 mb-1 border-b border-gray-800">ADVANCED AUDIO EVENTS</div>

                            <div className="grid grid-cols-2 gap-2">
                                {renderAudioToggle('Breakdown FX (Auto)', 'breakdownMode')}
                                {renderAudioToggle('Force Breakdown', 'forceBreakdown')}
                                {renderAudioToggle('Build-up FX (Auto)', 'buildupMode')}

                                {/* Octave Toggle */}
                                <button
                                    className={`flex items-center justify-between p-2 border ${audioEngine.currentOctaveShift < 1.0 ? 'border-orange-500 bg-orange-900/30' : 'border-gray-700 bg-gray-900'} hover:bg-gray-800`}
                                    onClick={() => {
                                        audioEngine.currentOctaveShift = audioEngine.currentOctaveShift < 1.0 ? 1.0 : 0.5;
                                        setRefreshCounter(prev => prev + 1);
                                    }}
                                >
                                    <span className="text-xs font-bold uppercase text-white">Wave Octave Shift</span>
                                    <div className={`text-[10px] font-mono ${audioEngine.currentOctaveShift < 1.0 ? 'text-orange-500' : 'text-gray-500'}`}>
                                        {audioEngine.currentOctaveShift < 1.0 ? 'LOW (0.5x)' : 'NORMAL (1.0x)'}
                                    </div>
                                </button>
                            </div>

                            {renderAudioControl('Inversion %', 'inversionChance', 0, 1, 0.05)}
                            {renderAudioControl('Accent Vol (Crash)', 'accentVolume', 0, 1, 0.05)}
                            {renderAudioControl('Tempo Breath', 'tempoBreathingDepth', 0, 1, 0.05)}
                            {renderAudioControl('Overture Vol', 'overtureVolume', 0, 1, 0.05)}
                            {renderAudioControl('Silence Gap %', 'silenceChance', 0, 1, 0.05)}
                        </div>
                    )}
                </div>
            </div>
        </OverlayContainer>
    );
};
