
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, StoryMessage, PlayerChoice, ModalType, NSFWPreferences, Entity, EntityType, CharacterStats, InventoryItem, CharacterAttribute, ItemEffect, ToastType, StatChange, Achievement, Skill, SkillChange, ActiveSidebarTab, NPCProfile, RelationshipStatus, Objective, EquipmentSlot, StatBonus, StorySetupData, SkillProficiency } from '../types';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import { useSettings } from '../contexts/SettingsContext';
import { usePublicToast } from '../contexts/ToastContext';
import { generateInitialStory, generateNextStorySegment, NextStorySegmentResult } from '../services/GeminiService';
import { LOCAL_STORAGE_API_KEY } from '../constants';

interface GamePageProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  openModal: (modalType: ModalType) => void;
  quitGame: () => void;
  nsfwSettings: NSFWPreferences;
}

const INITIAL_MESSAGES_TO_SHOW = 20;
const MESSAGES_TO_LOAD_PER_CLICK = 20;

// --- Helper Functions for Stats with Equipment ---
const calculateEffectiveStats = (
    baseStats: CharacterStats, 
    equippedItems: Partial<Record<EquipmentSlot, InventoryItem['id']>>,
    inventory: InventoryItem[]
): CharacterStats => {
    const effectiveStats = JSON.parse(JSON.stringify(baseStats)) as CharacterStats; 

    const allBonuses: StatBonus[] = [];
    Object.values(equippedItems).forEach(itemId => {
        if (itemId) {
            const item = inventory.find(i => i.id === itemId);
            if (item && item.equippable && item.statBonuses) {
                allBonuses.push(...item.statBonuses);
            }
        }
    });

    // Apply flat bonuses first
    allBonuses.forEach(bonus => {
        if (!bonus.isPercentage) {
            const stat = effectiveStats[bonus.statId];
            if (stat) {
                if (bonus.appliesToMax && typeof stat.maxValue === 'number') {
                    stat.maxValue += bonus.value;
                } else if (typeof stat.value === 'number') {
                    stat.value += bonus.value;
                }
                // Ensure HP value doesn't exceed new max HP if max HP was increased by a flat amount
                if (bonus.statId === 'hp' && typeof stat.value === 'number' && typeof stat.maxValue === 'number') {
                     if (bonus.appliesToMax) { // If maxHP changed, current HP might need adjustment relative to old max.
                        // This specific logic might need refinement based on game rules for max HP increase.
                        // For now, simple cap.
                     }
                    stat.value = Math.min(stat.value, stat.maxValue);
                }
            }
        }
    });

    // Apply percentage bonuses
    allBonuses.forEach(bonus => {
        if (bonus.isPercentage) {
            const statToUpdateWithPercentage = effectiveStats[bonus.statId]; 
            // Percentage bonus should typically apply to the *base* stat value or *base* max value,
            // not the value already modified by flat bonuses from other items, to avoid compounding issues.
            const originalBaseStatForPercentage = baseStats[bonus.statId];

            if (statToUpdateWithPercentage && originalBaseStatForPercentage) {
                const baseValueForCalc = bonus.appliesToMax && typeof originalBaseStatForPercentage.maxValue === 'number'
                    ? originalBaseStatForPercentage.maxValue
                    : typeof originalBaseStatForPercentage.value === 'number'
                    ? originalBaseStatForPercentage.value
                    : 0; 

                if (typeof baseValueForCalc === 'number' && baseValueForCalc !== 0) { // Avoid division by zero or no-op
                    const percentageIncrement = baseValueForCalc * (bonus.value / 100);
                    if (bonus.appliesToMax && typeof statToUpdateWithPercentage.maxValue === 'number') {
                        statToUpdateWithPercentage.maxValue += percentageIncrement;
                    } else if (typeof statToUpdateWithPercentage.value === 'number') {
                        statToUpdateWithPercentage.value += percentageIncrement;
                    }
                     // Ensure HP value doesn't exceed new max HP if max HP was increased by percentage
                    if (bonus.statId === 'hp' && typeof statToUpdateWithPercentage.value === 'number' && typeof statToUpdateWithPercentage.maxValue === 'number') {
                        statToUpdateWithPercentage.value = Math.min(statToUpdateWithPercentage.value, statToUpdateWithPercentage.maxValue);
                    }
                }
            }
        }
    });
    
    // Final clamping for HP and other stats
    if (effectiveStats.hp && typeof effectiveStats.hp.value === 'number' && typeof effectiveStats.hp.maxValue === 'number') {
        effectiveStats.hp.value = Math.min(effectiveStats.hp.value, effectiveStats.hp.maxValue);
        effectiveStats.hp.value = Math.max(0, effectiveStats.hp.value); 
    }
    for (const statId in effectiveStats) {
        const stat = effectiveStats[statId];
        if (typeof stat.value === 'number' && typeof stat.maxValue === 'number' && stat.id !== 'hp' && !stat.isProgressionStat) { // Exclude progression stat from min/max clamping like this
            stat.value = Math.min(stat.value, stat.maxValue);
             if (stat.id === 'mp' || stat.id === 'spiritual_qi') stat.value = Math.max(0, stat.value); // MP and QI can be 0
        }
        // Round to 1 decimal place for display, except for specific stats
        if (typeof stat.value === 'number' && stat.id !== 'attack_speed') stat.value = parseFloat(stat.value.toFixed(1));
        if (typeof stat.maxValue === 'number' && stat.id !== 'attack_speed') stat.maxValue = parseFloat(stat.maxValue.toFixed(1));
    }
    return effectiveStats;
};


// --- Panel Components (Styling enhanced) ---
interface CharacterStatsPanelProps {
  baseStats: CharacterStats;
  equippedItems: Partial<Record<EquipmentSlot, InventoryItem['id']>>;
  inventory: InventoryItem[];
  characterName: string;
}
const CharacterStatsPanel: React.FC<CharacterStatsPanelProps> = React.memo(({ baseStats, equippedItems, inventory, characterName }) => {
  const effectiveStats = useMemo(() => calculateEffectiveStats(baseStats, equippedItems, inventory), [baseStats, equippedItems, inventory]);
  
  if (Object.keys(baseStats).length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 p-4 text-center">Chưa có thông tin chỉ số.</p>;
  }

  const progressionStat = Object.values(effectiveStats).find(stat => stat.isProgressionStat);
  const coreStatsToDisplay: (keyof CharacterStats)[] = ['hp', 'mp', 'spiritual_qi'];
  const primaryAttributes: (keyof CharacterStats)[] = ['intelligence', 'constitution', 'agility', 'luck']; 
  const combatStatOrder: (keyof CharacterStats)[] = ['damage_output', 'defense_value', 'attack_speed', 'crit_chance', 'crit_damage_bonus', 'evasion_chance'];

  const otherNonCombatStats = Object.values(effectiveStats).filter(stat =>
    !stat.isProgressionStat &&
    !coreStatsToDisplay.includes(stat.id) &&
    !primaryAttributes.includes(stat.id) && 
    !combatStatOrder.includes(stat.id)
  );

  const renderStat = useCallback((stat: CharacterAttribute, isCombatStat: boolean = false, isPrimaryAttribute: boolean = false, isCore: boolean = false) => {
    const valueIsPercentage = ['crit_chance', 'crit_damage_bonus', 'evasion_chance'].includes(stat.id);
    let displayValue: string | number = typeof stat.value === 'number' 
        ? parseFloat(stat.value.toFixed(stat.id === 'attack_speed' ? 2 : 1)) 
        : String(stat.value);
    
    if (valueIsPercentage) {
        displayValue = `${displayValue}%`;
    } else if (typeof stat.value === 'number' && stat.maxValue !== undefined && !stat.isProgressionStat) {
        const val = parseFloat(stat.value.toFixed(1));
        const maxVal = parseFloat(stat.maxValue.toFixed(1));
        displayValue = `${val} / ${maxVal}`;
    }

    let bgColor = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/80';
    let textColor = 'text-slate-700 dark:text-slate-200';
    let iconColor = 'text-primary dark:text-primary-light';
    let progressBarColor = 'bg-primary dark:bg-primary-dark';

    if (isCombatStat) {
        bgColor = 'bg-rose-50 dark:bg-rose-900/50 border-rose-200 dark:border-rose-700/70';
        textColor = 'text-rose-700 dark:text-rose-200';
        iconColor = 'text-rose-500 dark:text-rose-400';
        progressBarColor = 'bg-rose-500 dark:bg-rose-400';
    } else if (isPrimaryAttribute) {
        bgColor = 'bg-sky-50 dark:bg-sky-900/50 border-sky-200 dark:border-sky-700/70';
        textColor = 'text-sky-700 dark:text-sky-200';
        iconColor = 'text-sky-500 dark:text-sky-400';
        progressBarColor = 'bg-sky-500 dark:bg-sky-400';
    } else if (isCore) {
        if (stat.id === 'hp') { iconColor = 'text-red-500 dark:text-red-400'; progressBarColor = 'bg-red-500 dark:bg-red-400'; }
        else if (stat.id === 'mp') { iconColor = 'text-blue-500 dark:text-blue-400'; progressBarColor = 'bg-blue-500 dark:bg-blue-400'; }
        else if (stat.id === 'spiritual_qi') { iconColor = 'text-amber-500 dark:text-amber-400'; progressBarColor = 'bg-amber-500 dark:bg-amber-400'; }
    }


    const originalBaseStatValue = baseStats[stat.id]?.value; 
    const originalBaseStatMaxValue = baseStats[stat.id]?.maxValue; 
    let bonusDisplay = "";

    if (typeof stat.value === 'number' && typeof originalBaseStatValue === 'number' && Math.abs(stat.value - originalBaseStatValue) > 0.01) {
        const diff = stat.value - originalBaseStatValue;
        bonusDisplay += ` (Gốc ${parseFloat(originalBaseStatValue.toFixed(1))}${diff !== 0 ? `, ${diff > 0 ? '+' : ''}${parseFloat(diff.toFixed(1))} từ trang bị` : ''})`;
    }
    
    if (typeof stat.maxValue === 'number' && typeof originalBaseStatMaxValue === 'number' && 
        stat.maxValue !== originalBaseStatMaxValue && 
        (!bonusDisplay.includes("Gốc") || ['hp', 'mp', 'spiritual_qi'].includes(stat.id)) ) { 
      const maxDiff = stat.maxValue - originalBaseStatMaxValue;
      if (bonusDisplay.includes("Gốc")) { 
        if (maxDiff !== 0) bonusDisplay += ` / Max Gốc ${parseFloat(originalBaseStatMaxValue.toFixed(1))}${maxDiff !==0 ? `, ${maxDiff > 0 ? '+' : ''}${parseFloat(maxDiff.toFixed(1))} từ trang bị` : ''}`;
      } else { 
         bonusDisplay += ` (Max Gốc ${parseFloat(originalBaseStatMaxValue.toFixed(1))}${maxDiff !== 0 ? `, ${maxDiff > 0 ? '+' : ''}${parseFloat(maxDiff.toFixed(1))} từ trang bị` : ''})`;
      }
    }


    return (
        <div key={stat.id} className={`p-3.5 rounded-xl shadow-interactive dark:shadow-interactive-dark border ${bgColor} transition-all duration-200 hover:shadow-md`}>
          <div className="flex justify-between items-center mb-1.5">
            <span className={`font-semibold text-md flex items-center ${textColor}`}>
              {stat.icon && <i className={`${stat.icon} mr-2.5 w-5 text-center ${iconColor} text-xl opacity-90`}></i>}
              {stat.name}:
            </span>
            <span className={`font-bold text-lg ${textColor}`}>
              {displayValue}
            </span>
          </div>
           {bonusDisplay && <p className={`text-xs mt-0.5 ${textColor} opacity-80 italic`}>{bonusDisplay.trim()}</p>}
          {typeof stat.value === 'number' && stat.maxValue !== undefined && !stat.isProgressionStat && !valueIsPercentage && stat.maxValue > 0 && (
            <div className={`w-full rounded-full h-3 overflow-hidden mt-2 ${bgColor} bg-opacity-60 shadow-inner`}>
              <div
                className={`${progressBarColor} h-full rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${Math.max(0, Math.min(100, (stat.value / stat.maxValue) * 100))}%` }}
              ></div>
            </div>
          )}
          {stat.description && <p className={`text-xs mt-2 ${textColor} opacity-90 leading-relaxed`}>{stat.description}</p>}
        </div>
    );
  }, [baseStats]);

  return (
    <div className="space-y-4 text-sm">
      <h3 className="text-2xl font-bold mb-4 text-center text-primary dark:text-primary-light tracking-wide drop-shadow-sm">
         {characterName}
      </h3>
      {progressionStat && (
        <div key={progressionStat.id} className="p-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 dark:from-amber-500 dark:via-yellow-600 dark:to-amber-700 rounded-xl shadow-xl text-white">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-2xl flex items-center">
              {progressionStat.icon && <i className={`${progressionStat.icon} mr-3 w-7 text-center text-3xl opacity-80`}></i>}
              {progressionStat.name}:
            </span>
            <span className="font-extrabold text-2xl tracking-tight">
              {String(progressionStat.value)}
            </span>
          </div>
          {progressionStat.description && <p className="text-xs opacity-90 mt-1.5">{progressionStat.description}</p>}
        </div>
      )}

      {coreStatsToDisplay.map(id => effectiveStats[id] && renderStat(effectiveStats[id], false, false, true))}

      <h4 className="text-xl font-semibold mt-5 pt-4 border-t border-border-light dark:border-border-dark text-sky-600 dark:text-sky-300">Thuộc Tính Chính</h4>
      {primaryAttributes.map(id => effectiveStats[id] && renderStat(effectiveStats[id], false, true))}


      <h4 className="text-xl font-semibold mt-5 pt-4 border-t border-border-light dark:border-border-dark text-rose-600 dark:text-rose-300">Chỉ Số Chiến Đấu</h4>
      {combatStatOrder.map(id => effectiveStats[id] && renderStat(effectiveStats[id], true))}

      {otherNonCombatStats.length > 0 && (
          <>
            <h4 className="text-xl font-semibold mt-5 pt-4 border-t border-border-light dark:border-border-dark">Chỉ Số Khác</h4>
            {otherNonCombatStats.map(stat => renderStat(stat))}
          </>
      )}
    </div>
  );
});

interface InventoryPanelProps {
  items: InventoryItem[];
  equippedItems: Partial<Record<EquipmentSlot, InventoryItem['id']>>;
  onUseItem: (item: InventoryItem) => void;
  onEquipItem: (item: InventoryItem) => void;
  isLoadingAI: boolean;
}
const InventoryPanel: React.FC<InventoryPanelProps> = React.memo(({ items, equippedItems, onUseItem, onEquipItem, isLoadingAI }) => {
  const importantItems = items.filter(item => item.category === 'quan trọng');
  const otherItems = items.filter(item => item.category !== 'quan trọng');

  const renderItemList = useCallback((itemList: InventoryItem[], title?: string) => {
    if (itemList.length === 0 && !title) return null; 
    if (itemList.length === 0 && title) return <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-md text-center">{title}: Trống.</p>;

    return (
        <div className="space-y-3.5">
            {title && <h4 className="text-lg font-semibold mt-4 pt-3 text-slate-700 dark:text-slate-300">{title}</h4>}
            {itemList.map(item => {
              const isEquipped = Object.values(equippedItems).includes(item.id);
              return (
                <div key={item.id} className={`p-3.5 border rounded-xl bg-white dark:bg-slate-800/80 shadow-interactive dark:shadow-interactive-dark hover:shadow-lg transition-all duration-200 ease-in-out ${isEquipped ? 'border-primary dark:border-primary-dark ring-2 ring-primary/60 dark:ring-primary-dark/60' : 'border-border-light dark:border-border-dark'}`}>
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-grow flex items-start gap-3.5">
                       <div className={`w-14 h-14 flex-shrink-0 rounded-lg ${item.category === 'quan trọng' ? 'bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-700 dark:to-amber-800' : 'bg-gradient-to-br from-slate-100 to-gray-200 dark:from-slate-700 dark:to-gray-800'} flex items-center justify-center shadow-inner`}>
                         <i className={`${item.icon || (item.category === 'quan trọng' ? 'fas fa-star' : 'fas fa-box-open')} ${item.category === 'quan trọng' ? 'text-yellow-500 dark:text-yellow-300' : 'text-secondary dark:text-secondary-light'} text-3xl opacity-80`}></i>
                       </div>
                        <div className="flex-grow">
                            <span className="font-semibold text-md text-slate-800 dark:text-slate-100 flex items-center flex-wrap">
                            {item.name} <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 mr-2">(SL: {item.quantity})</span>
                            {isEquipped && <span className="text-xs px-2.5 py-1 bg-primary text-white dark:bg-primary-dark dark:text-black rounded-full font-medium shadow-sm">Đang Trang Bị</span>}
                            </span>
                            {item.description && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{item.description}</p>}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 items-center mt-1">
                        {item.equippable && !isEquipped && (
                             <Button size="sm" variant="outline" onClick={() => onEquipItem(item)} className="px-3 py-1.5 text-xs font-semibold min-w-[75px] border-green-500 text-green-600 hover:bg-green-500 hover:text-white dark:border-green-400 dark:text-green-300 dark:hover:bg-green-500 dark:hover:text-white" title={`Trang bị ${item.name}`}>
                                <i className="fas fa-shield-alt sm:mr-1.5"></i><span className="hidden sm:inline">Trang Bị</span>
                            </Button>
                        )}
                        {item.usable && (
                        <Button size="sm" variant="primary" onClick={() => onUseItem(item)} className="px-3 py-1.5 text-xs font-semibold min-w-[75px]" disabled={isLoadingAI} title={`Sử dụng ${item.name}`}>
                            <i className="fas fa-hand-sparkles sm:mr-1.5"></i><span className="hidden sm:inline">Dùng</span>
                        </Button>
                        )}
                    </div>
                </div>
                {item.effects && item.effects.length > 0 && (
                    <ul className="text-xs mt-2.5 list-disc list-inside pl-4 text-sky-700 dark:text-sky-300 space-y-1">
                        {item.effects.map((eff, i) => (
                            <li key={i} className="italic">{eff.statId}: {eff.changeValue > 0 ? '+' : ''}{eff.changeValue}{eff.duration ? ` (trong ${eff.duration} lượt)`: ''}</li>
                        ))}
                    </ul>
                 )}
                 {item.statBonuses && item.statBonuses.length > 0 && (
                     <div className="text-xs mt-2.5 pl-1 text-purple-700 dark:text-purple-300 space-y-0.5">
                         <strong className="font-medium block mb-0.5">Bonus Trang Bị: </strong> 
                         {item.statBonuses.map((bonus, i) => (
                            <span key={i} className="italic mr-3 inline-flex items-center">
                                <i className="fas fa-arrow-up text-[10px] mr-1 opacity-70"></i>
                                {bonus.statId}: {bonus.value > 0 ? '+' : ''}{bonus.value}{bonus.isPercentage ? '%' : ''}{bonus.appliesToMax ? ' (Tối đa)' : ''}
                            </span>
                         ))}
                     </div>
                 )}
                </div>
              );
            })}
        </div>
    );
  }, [equippedItems, isLoadingAI, onEquipItem, onUseItem]);

  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 p-4 text-center">Ba lô của bạn hiện đang trống rỗng.</p>;
  }

  return (
    <div className="space-y-4 text-sm">
       <h3 className="text-2xl font-bold mb-4 text-center text-primary dark:text-primary-light tracking-wide">Ba Lô Vật Phẩm</h3>
       {renderItemList(importantItems, "Vật Phẩm Quan Trọng")}
       {renderItemList(otherItems, otherItems.length > 0 && importantItems.length > 0 ? "Vật Phẩm Khác" : undefined)}
    </div>
  );
});

interface EquipmentPanelProps {
    equippedItems: Partial<Record<EquipmentSlot, InventoryItem['id']>>;
    inventory: InventoryItem[];
    onUnequipItem: (slot: EquipmentSlot) => void;
}
const EquipmentPanel: React.FC<EquipmentPanelProps> = React.memo(({ equippedItems, inventory, onUnequipItem }) => {
    const slotsInOrder: EquipmentSlot[] = [
        EquipmentSlot.Weapon, EquipmentSlot.OffHand,
        EquipmentSlot.Helmet, EquipmentSlot.Armor, EquipmentSlot.Boots,
        EquipmentSlot.Amulet, EquipmentSlot.Ring1, EquipmentSlot.Ring2
    ];

    const getSlotIcon = (slot: EquipmentSlot) => {
        switch(slot) {
            case EquipmentSlot.Weapon: return "fas fa-gavel"; 
            case EquipmentSlot.OffHand: return "fas fa-shield-halved"; 
            case EquipmentSlot.Helmet: return "fas fa-hard-hat";
            case EquipmentSlot.Armor: return "fas fa-shirt"; 
            case EquipmentSlot.Boots: return "fas fa-shoe-prints";
            case EquipmentSlot.Amulet: return "fas fa-gem";
            case EquipmentSlot.Ring1: return "fas fa-ring";
            case EquipmentSlot.Ring2: return "fas fa-ring";
            default: return "fas fa-question-circle";
        }
    }

    return (
        <div className="space-y-3.5 text-sm">
            <h3 className="text-2xl font-bold mb-4 text-center text-orange-600 dark:text-orange-400 tracking-wide">
                <i className="fas fa-user-shield mr-2.5"></i>Trang Bị Nhân Vật
            </h3>
            {slotsInOrder.map(slot => {
                const itemId = equippedItems[slot];
                const item = itemId ? inventory.find(i => i.id === itemId) : null;
                return (
                    <div key={slot} className={`p-3.5 bg-white dark:bg-orange-900/40 rounded-xl shadow-interactive dark:shadow-interactive-dark border border-orange-200 dark:border-orange-700/70 transition-all duration-200 hover:shadow-md`}>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-md flex items-center text-orange-700 dark:text-orange-200">
                                <i className={`${getSlotIcon(slot)} mr-3 w-5 text-center text-xl opacity-80`}></i>
                                {slot}:
                            </span>
                            {item ? (
                                <div className="flex items-center gap-2.5">
                                     <span className="font-medium text-orange-800 dark:text-orange-100 flex items-center">
                                         <i className={`${item.icon || getSlotIcon(slot)} mr-2 opacity-70`}></i>
                                         {item.name}
                                     </span>
                                    <Button size="xs" variant="outline" onClick={() => onUnequipItem(slot)} className="px-2.5 py-1 text-xs border-red-500 text-red-500 hover:bg-red-500 hover:text-white dark:border-red-400 dark:text-red-300 dark:hover:bg-red-500 dark:hover:text-white">
                                        <i className="fas fa-times sm:mr-1"></i><span className="hidden sm:inline">Tháo</span>
                                    </Button>
                                </div>
                            ) : (
                                <span className="text-sm italic text-orange-500 dark:text-orange-400">-- Trống --</span>
                            )}
                        </div>
                        {item && item.statBonuses && item.statBonuses.length > 0 && (
                             <div className="text-xs mt-2.5 pl-1 text-purple-700 dark:text-purple-300 space-y-0.5">
                                 <strong className="font-medium block mb-0.5">Bonus: </strong>
                                 {item.statBonuses.map((bonus, i) => (
                                    <span key={i} className="italic mr-3 inline-flex items-center">
                                        <i className="fas fa-arrow-up text-[10px] mr-1 opacity-70"></i>
                                        {bonus.statId}: {bonus.value > 0 ? '+' : ''}{bonus.value}{bonus.isPercentage ? '%' : ''}{bonus.appliesToMax ? ' (Tối đa)' : ''}
                                    </span>
                                 ))}
                             </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});


interface CharacterSkillsPanelProps {
  skills: Skill[];
  isLoadingAI: boolean;
}
const CharacterSkillsPanel: React.FC<CharacterSkillsPanelProps> = React.memo(({ skills, isLoadingAI }) => {
  if (skills.length === 0) {
    return <p className="text-sm text-center p-4 text-slate-500 dark:text-slate-400">Chưa học được kỹ năng nào.</p>;
  }

 const proficiencyStyles: Record<SkillProficiency, { text: string; bg: string; border: string; shadow?: string }> = {
    "Sơ Nhập Môn": { text: "text-sky-700 dark:text-sky-200", bg: "bg-sky-100 dark:bg-sky-800", border: "border-sky-300 dark:border-sky-600" },
    "Tiểu Thành": { text: "text-lime-700 dark:text-lime-200", bg: "bg-lime-100 dark:bg-lime-800", border: "border-lime-300 dark:border-lime-600" },
    "Đại Thành": { text: "text-green-700 dark:text-green-200", bg: "bg-green-100 dark:bg-green-800", border: "border-green-300 dark:border-green-600" },
    "Viên Mãn": { text: "text-yellow-700 dark:text-yellow-200", bg: "bg-yellow-100 dark:bg-yellow-700", border: "border-yellow-400 dark:border-yellow-500" },
    "Lô Hoả Thuần Thanh": { text: "text-orange-700 dark:text-orange-200", bg: "bg-orange-100 dark:bg-orange-700", border: "border-orange-400 dark:border-orange-500" },
    "Đăng Phong Tạo Cực": { text: "text-red-700 dark:text-red-100", bg: "bg-gradient-to-r from-red-400 to-rose-500 dark:from-red-600 dark:to-rose-700", border: "border-red-500 dark:border-rose-500", shadow: "shadow-lg" },
  };


  return (
    <div className="space-y-4 text-sm">
      <h3 className="text-2xl font-bold mb-4 text-center text-purple-600 dark:text-purple-400 tracking-wide">Kỹ Năng Đã Học</h3>
      {skills.sort((a,b) => b.xp - a.xp).map(skill => {
        const currentProfStyle = proficiencyStyles[skill.proficiency] || proficiencyStyles["Sơ Nhập Môn"];
        return (
        <div key={skill.id} className={`p-4 bg-white dark:bg-purple-900/50 rounded-xl shadow-interactive dark:shadow-interactive-dark border border-purple-200 dark:border-purple-700/70 transition-all duration-200 hover:shadow-lg`}>
          <div className="flex justify-between items-start mb-2">
             <div className="flex items-start gap-3.5 flex-grow">
                <div className={`w-14 h-14 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-700 dark:to-pink-800 flex items-center justify-center shadow-inner`}>
                    <i className={`${skill.icon || 'fas fa-book-sparkles'} text-purple-500 dark:text-purple-300 text-3xl opacity-80`}></i>
                </div>
                <div className="flex-grow">
                    <span className="font-semibold text-lg text-purple-700 dark:text-purple-200">
                        {skill.name}
                    </span>
                    <span className={`ml-2 text-xs px-3 py-1 rounded-full font-bold shadow ${currentProfStyle.bg} ${currentProfStyle.text} ${currentProfStyle.border} ${currentProfStyle.shadow || ''}`}>
                        {skill.proficiency}
                    </span>
                </div>
             </div>
          </div>
          {skill.description && <p className="text-sm text-purple-600 dark:text-purple-300 mt-1.5 mb-2.5 whitespace-pre-line leading-relaxed">{skill.description}</p>}
          {skill.xpToNextLevel > 0 && (
             <div title={`${skill.xp} / ${skill.xpToNextLevel} XP`} className={`w-full bg-purple-200 dark:bg-purple-800/80 rounded-full h-4 overflow-hidden text-xs font-medium text-white flex items-center justify-center relative shadow-inner`}>
                <div
                    className="bg-gradient-to-r from-purple-400 via-pink-500 to-rose-500 dark:from-purple-500 dark:via-pink-600 dark:to-rose-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-center shadow"
                    style={{ width: `${Math.max(0, Math.min(100, (skill.xp / skill.xpToNextLevel) * 100))}%` }}
                >
                </div>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] text-white font-bold tracking-tight" style={{textShadow: '0 0 3px rgba(0,0,0,0.6)'}}>
                    {skill.xp} / {skill.xpToNextLevel} XP
                </span>
             </div>
          )}
          {skill.effects && skill.effects.length > 0 && (
            <div className="mt-3 text-xs">
                <strong className="text-purple-600 dark:text-purple-400 font-medium">Hiệu ứng:</strong>
                <ul className="list-disc list-inside pl-4 text-purple-500 dark:text-purple-300 italic space-y-1 mt-1">
                    {skill.effects.map((effect, idx) => <li key={idx}>{effect.description}</li>)}
                </ul>
            </div>
          )}
        </div>
      )})}
    </div>
  );
});


interface AchievementsPanelProps {
  achievements: Achievement[];
}
const AchievementsPanel: React.FC<AchievementsPanelProps> = React.memo(({ achievements }) => {
  if (achievements.length === 0) {
    return <p className="text-sm text-center p-4 text-slate-500 dark:text-slate-400">Chưa mở khóa thành tựu nào.</p>;
  }
  return (
    <div className="space-y-3.5 text-sm">
      <h3 className="text-2xl font-bold mb-4 text-center text-yellow-500 dark:text-yellow-400 tracking-wide">Thành Tựu ({achievements.length})</h3>
      {achievements.slice().reverse().map(ach => (
        <div key={ach.id} className={`p-4 border rounded-xl shadow-interactive dark:shadow-interactive-dark flex items-start gap-4 ${ach.isSecret ? 'bg-indigo-50 dark:bg-indigo-900/60 border-indigo-300 dark:border-indigo-600/70' : 'bg-yellow-50 dark:bg-yellow-800/60 border-yellow-300 dark:border-yellow-600/70'}`}>
          <i className={`${ach.icon || 'fas fa-trophy'} ${ach.isSecret ? 'text-indigo-500 dark:text-indigo-300' : 'text-yellow-500 dark:text-yellow-300'} text-4xl w-10 text-center mt-1 opacity-80`}></i>
          <div className="flex-grow">
            <span className={`font-semibold text-lg ${ach.isSecret ? 'text-indigo-700 dark:text-indigo-200' : 'text-yellow-700 dark:text-yellow-200'}`}>{ach.name} {ach.isSecret && <span className="text-xs font-normal opacity-80">(Bí Mật)</span>}</span>
            <p className={`text-sm ${ach.isSecret ? 'text-indigo-600 dark:text-indigo-400' : 'text-yellow-600 dark:text-yellow-400'} mt-1 leading-relaxed`}>{ach.description}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Mở khóa: {new Date(ach.unlockedAt).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

interface RelationshipsPanelProps {
  relationships: Record<string, NPCProfile>;
}
const RelationshipsPanel: React.FC<RelationshipsPanelProps> = React.memo(({ relationships }) => {
  const knownNpcs = Object.values(relationships).filter(npc => npc.known);
  if (knownNpcs.length === 0) {
    return <p className="text-sm text-center p-4 text-slate-500 dark:text-slate-400">Chưa có mối quan hệ nào đáng chú ý.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      <h3 className="text-2xl font-bold mb-4 text-center text-pink-600 dark:text-pink-400 tracking-wide">
        <i className="fas fa-users mr-2.5"></i>Mối Quan Hệ NPC
      </h3>
      {knownNpcs.sort((a,b) => b.score - a.score).map(npc => {
        let statusColorClass = 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100';
        let borderColorClass = 'border-slate-300 dark:border-slate-500';
        if (npc.status === RelationshipStatus.Adored || npc.status === RelationshipStatus.Loyal) { statusColorClass = 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'; borderColorClass = 'border-red-300 dark:border-red-500';}
        else if (npc.status === RelationshipStatus.Friendly) { statusColorClass = 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100'; borderColorClass = 'border-green-300 dark:border-green-500';}
        else if (npc.status === RelationshipStatus.Amicable) { statusColorClass = 'bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-100'; borderColorClass = 'border-sky-300 dark:border-sky-500';}
        else if (npc.status === RelationshipStatus.Hostile) { statusColorClass = 'bg-rose-700 text-white dark:bg-rose-500 dark:text-white'; borderColorClass = 'border-rose-500 dark:border-rose-300';}
        else if (npc.status === RelationshipStatus.Mistrustful) { statusColorClass = 'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-100'; borderColorClass = 'border-amber-300 dark:border-amber-500';}
        
        return (
        <div key={npc.id} className={`p-4 bg-white dark:bg-pink-900/50 rounded-xl shadow-interactive dark:shadow-interactive-dark border border-pink-200 dark:border-pink-700/70 transition-all duration-200 hover:shadow-lg`}>
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-lg flex items-center text-pink-700 dark:text-pink-200">
              <i className="fas fa-user-friends mr-3 w-5 text-center text-xl opacity-80"></i>{npc.name}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold shadow-sm ${statusColorClass} border ${borderColorClass}`}>
              {npc.status} ({npc.score})
            </span>
          </div>
          {npc.description && <p className="text-sm text-pink-600 dark:text-pink-300 mt-1 italic whitespace-pre-line leading-relaxed">{npc.description}</p>}
        </div>
      )})}
    </div>
  );
});

interface ObjectivesPanelProps { 
  objectives: Objective[];
  characterGoal: string;
}
const ObjectivesPanel: React.FC<ObjectivesPanelProps> = React.memo(({ objectives, characterGoal }) => {
  const activeObjectives = objectives.filter(obj => obj.status === 'active');
  const completedObjectives = objectives.filter(obj => obj.status === 'completed');
  const failedObjectives = objectives.filter(obj => obj.status === 'failed');
  
  const mainGoal = objectives.find(obj => obj.isPlayerGoal && obj.status === 'active') || 
                   { title: characterGoal || "Chưa xác định", description: "Mục tiêu chính của nhân vật.", status: 'active', isPlayerGoal: true, id: 'main-player-goal' };


  const renderObjectiveList = (list: Objective[], title: string, iconClass: string, baseColorClass: string, isCompleted: boolean = false, isFailed: boolean = false) => {
    if (list.length === 0) return null;
    let textColor = isFailed ? 'text-red-700 dark:text-red-200' : isCompleted ? 'text-green-700 dark:text-green-200' : baseColorClass;
    let bgColor = isFailed ? 'bg-red-50 dark:bg-red-900/60 border-red-200 dark:border-red-700/70' 
                : isCompleted ? 'bg-green-50 dark:bg-green-900/60 border-green-200 dark:border-green-700/70 opacity-90' 
                : 'bg-teal-50 dark:bg-teal-900/60 border-teal-200 dark:border-teal-700/70';

    return (
      <div className="mb-4">
        <h4 className={`text-lg font-semibold mb-2.5 ${textColor}`}>
          <i className={`${iconClass} mr-2`}></i>{title} ({list.length})
        </h4>
        <div className="space-y-3">
          {list.map(obj => (
            <div key={obj.id} className={`p-3.5 rounded-xl shadow-sm border ${bgColor} ${isCompleted ? 'line-through decoration-green-500/70 dark:decoration-green-400/70' : ''} ${isFailed ? 'opacity-80' : ''}`}>
              <p className={`font-semibold text-md ${textColor}`}>
                {obj.isPlayerGoal && !isCompleted && !isFailed && <i className="fas fa-bullseye text-error-DEFAULT mr-2" title="Mục tiêu chính"></i>}
                {obj.title}
              </p>
              <p className={`text-sm mt-1 ${textColor} opacity-90 whitespace-pre-line leading-relaxed`}>{obj.description}</p>
              {obj.subObjectives && obj.subObjectives.length > 0 && (
                <ul className="list-disc list-inside text-sm pl-3 mt-2 text-slate-500 dark:text-slate-400 space-y-1">
                  {obj.subObjectives.map((sub, i) => <li key={i}>{sub}</li>)}
                </ul>
              )}
              {obj.rewardPreview && <p className="text-xs mt-2 italic text-amber-600 dark:text-amber-400">Phần thưởng (dự kiến): {obj.rewardPreview}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4 text-sm">
      <h3 className="text-2xl font-bold mb-4 text-center text-teal-600 dark:text-teal-400 tracking-wide">
        <i className="fas fa-tasks mr-2.5"></i>Mục Tiêu Hành Trình
      </h3>

      <div className="p-4 bg-gradient-to-r from-teal-400 via-cyan-500 to-sky-500 dark:from-teal-600 dark:via-cyan-600 dark:to-sky-700 rounded-xl shadow-xl text-white">
          <h4 className="font-bold text-xl mb-1 flex items-center">
            <i className="fas fa-bullseye mr-3 text-2xl opacity-90"></i>Mục Tiêu Chính:
          </h4>
          <p className="text-lg font-semibold">{mainGoal.title}</p>
          <p className="text-xs mt-1 opacity-90">{mainGoal.description}</p>
      </div>

      {renderObjectiveList(activeObjectives.filter(obj => !obj.isPlayerGoal), "Nhiệm Vụ Phụ Đang Thực Hiện", "fas fa-spinner fa-spin", "text-teal-600 dark:text-teal-300")}
      {renderObjectiveList(completedObjectives, "Đã Hoàn Thành", "fas fa-check-circle", "text-green-600 dark:text-green-300", true)}
      {renderObjectiveList(failedObjectives, "Đã Thất Bại", "fas fa-times-circle", "text-red-600 dark:text-red-300", false, true)}
      
      {activeObjectives.length === 0 && completedObjectives.length === 0 && failedObjectives.length === 0 && !characterGoal &&
         <p className="text-sm text-center p-4 text-slate-500 dark:text-slate-400">Không có mục tiêu nào được AI tạo.</p>
      }
    </div>
  );
});

interface CultivationPanelProps {
  progressionStat: CharacterAttribute | undefined;
  qiStat: CharacterAttribute | undefined;
  onAdvance: () => void;
  onCultivate: () => void;
  isLoadingAI: boolean;
}
const CultivationPanel: React.FC<CultivationPanelProps> = React.memo(({ progressionStat, qiStat, onAdvance, onCultivate, isLoadingAI }) => {
  if (!progressionStat || !qiStat) {
    return <p className="text-sm text-center p-4 text-slate-500 dark:text-slate-400">Hệ thống tu luyện chưa được khởi tạo. Vui lòng đảm bảo AI đã cung cấp chỉ số "Cấp Độ" (ID: "progression_level") và "Điểm Kinh Nghiệm" (ID: "spiritual_qi").</p>;
  }
  const canAdvance = typeof qiStat.value === 'number' && typeof qiStat.maxValue === 'number' && qiStat.value >= qiStat.maxValue && qiStat.maxValue > 0;

  return (
    <div className="space-y-5 text-sm">
      <h3 className="text-2xl font-bold mb-4 text-center text-indigo-600 dark:text-indigo-400 tracking-wide">
        <i className="fas fa-hat-wizard mr-2.5"></i>Tiến Triển Tu Luyện
      </h3>

      <div className="p-4 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-800/70 dark:to-purple-800/70 rounded-xl shadow-xl border border-indigo-200 dark:border-indigo-700">
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-bold text-xl flex items-center text-indigo-700 dark:text-indigo-200">
            {progressionStat.icon && <i className={`${progressionStat.icon} mr-3 w-6 text-center text-2xl opacity-90`}></i>}
            {progressionStat.name}:
          </span>
          <span className="font-extrabold text-xl text-indigo-800 dark:text-indigo-100 tracking-tight">{String(progressionStat.value)}</span>
        </div>
        {progressionStat.description && <p className="text-sm text-indigo-600 dark:text-indigo-300 mt-1.5 opacity-90 leading-relaxed">{progressionStat.description}</p>}
      </div>

      <div className="p-4 bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-800/70 dark:to-cyan-800/70 rounded-xl shadow-xl border border-sky-200 dark:border-sky-700">
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-semibold text-lg flex items-center text-sky-700 dark:text-sky-200">
            {qiStat.icon && <i className={`${qiStat.icon} mr-3 w-5 text-center text-xl opacity-90`}></i>}
            {qiStat.name}:
          </span>
          <span className="font-bold text-lg text-sky-800 dark:text-sky-100">
            {typeof qiStat.value === 'number' && qiStat.maxValue ? `${parseFloat(qiStat.value.toFixed(1))} / ${parseFloat(qiStat.maxValue.toFixed(1))}` : String(qiStat.value)}
          </span>
        </div>
        {typeof qiStat.value === 'number' && typeof qiStat.maxValue === 'number' && qiStat.maxValue > 0 && (
          <div className="w-full bg-sky-200 dark:bg-sky-800/80 rounded-full h-4 mt-2 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-sky-400 to-cyan-500 dark:from-sky-500 to-cyan-600 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${Math.max(0,Math.min(100,(qiStat.value / qiStat.maxValue) * 100))}%` }}
            ></div>
          </div>
        )}
        {qiStat.description && <p className="text-sm text-sky-600 dark:text-sky-300 mt-2 opacity-90 leading-relaxed">{qiStat.description}</p>}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
        <Button 
          onClick={onCultivate} 
          isLoading={isLoadingAI} 
          disabled={isLoadingAI}
          fullWidth
          variant="outline"
          className="border-sky-500 text-sky-600 hover:bg-sky-500 hover:text-white dark:border-sky-400 dark:text-sky-300 dark:hover:bg-sky-500 dark:hover:text-white !py-3 !text-base"
        >
          <i className="fas fa-praying-hands mr-2"></i>Tập Trung Nâng Cấp
        </Button>
        <Button 
          onClick={onAdvance} 
          isLoading={isLoadingAI} 
          disabled={!canAdvance || isLoadingAI}
          fullWidth
          variant="primary"
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 !py-3 !text-base"
        >
          <i className="fas fa-level-up-alt mr-2"></i>Thử Thách Thăng Tiến
        </Button>
      </div>
       <p className={`text-sm text-center mt-2 ${canAdvance ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
         {canAdvance ? `Đã đủ ${qiStat.name} để thăng tiến!` : `Cần thêm ${typeof qiStat.value === 'number' && typeof qiStat.maxValue === 'number' && qiStat.maxValue > qiStat.value ? (qiStat.maxValue - qiStat.value).toFixed(1) : '?'} ${qiStat.name} để thăng tiến.`}
       </p>
    </div>
  );
});

interface ActionPanelContentProps {
  choices: PlayerChoice[];
  onChooseAction: (action: string) => void;
  isLoadingAI: boolean;
  isRoleplayModeActive: boolean;
}
const ActionPanelContent: React.FC<ActionPanelContentProps> = React.memo(({ choices, onChooseAction, isLoadingAI, isRoleplayModeActive }) => {
  const [customAction, setCustomAction] = useState('');

  const handleCustomActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAction.trim() && !isLoadingAI) {
      onChooseAction(customAction.trim());
      setCustomAction('');
    }
  };

  return (
    <div className="space-y-3">
      {!isRoleplayModeActive && choices.length > 0 && (
        <div className="space-y-2.5 max-h-40 sm:max-h-60 overflow-y-auto custom-scrollbar pr-2">
          {choices.map((choice, index) => (
            <Button
              key={choice.id}
              onClick={() => onChooseAction(choice.text)}
              fullWidth
              className="bg-gray-700 dark:bg-gray-800 border-2 border-primary dark:border-primary-light text-slate-100 dark:text-slate-50 hover:bg-gray-600 dark:hover:bg-gray-700 hover:border-primary-light dark:hover:border-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary dark:focus-visible:ring-primary-light text-left px-3 py-2.5 !text-sm !font-normal !rounded-xl transition-all duration-150 ease-in-out transform hover:scale-[1.01] active:scale-[0.99] w-full flex items-center"
              disabled={isLoadingAI}
              title={choice.tooltip || choice.text} 
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start min-w-0"> {/* Changed to items-start */}
                  <span 
                    className="bg-primary text-white dark:bg-primary-dark dark:text-gray-900 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-bold mr-2 sm:mr-3 flex-shrink-0"
                  >
                    {index + 1}
                  </span>
                  <span className="whitespace-normal break-words">{choice.text}</span> {/* Removed truncate, added wrapping classes */}
                </div>
                <i className="fas fa-chevron-right text-slate-400 dark:text-slate-500 text-xs ml-2 flex-shrink-0"></i>
              </div>
            </Button>
          ))}
        </div>
      )}
      {(isRoleplayModeActive || choices.length === 0) && !isLoadingAI && (
         <p className="text-sm text-slate-500 dark:text-slate-400 italic p-3 bg-slate-100 dark:bg-slate-800/60 rounded-md text-center">
            {isRoleplayModeActive ? "Chế độ Nhập Vai đang bật. Hãy tự do nhập hành động của bạn." : "AI không đưa ra lựa chọn nào. Hãy tự quyết định hành động tiếp theo."}
        </p>
      )}

      <form onSubmit={handleCustomActionSubmit} className="space-y-3 pt-1">
        <Textarea
          value={customAction}
          onChange={(e) => setCustomAction(e.target.value)}
          placeholder={isRoleplayModeActive ? "Nhập lời nói, hành động, suy nghĩ của bạn..." : "Hoặc nhập hành động tùy chỉnh của bạn..."}
          rows={2}
          className="text-sm bg-white dark:bg-slate-700/60 !rounded-lg focus:ring-primary-dark dark:focus:ring-primary-light sm:rows-3" // sm:rows-3 added via className for potential Tailwind JIT
          disabled={isLoadingAI}
          aria-label="Custom action input"
        />
        <Button type="submit" isLoading={isLoadingAI} disabled={isLoadingAI || !customAction.trim()} fullWidth variant="success" className="!text-base !py-3 !rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
           <i className="fas fa-paper-plane mr-2"></i>Gửi Hành Động
        </Button>
      </form>
    </div>
  );
});

const generateStableId = (text: string, prefix: string = "id"): string => {
  if (!text) return `${prefix}_unknown_${Date.now().toString(36)}${Math.random().toString(36).substring(2,5)}`;
  return `${prefix}-${text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}${Math.random().toString(36).substring(2,5)}`;
};

const updateInventory = (
    currentInventory: InventoryItem[],
    gained?: InventoryItem[],
    lost?: Array<{ id: string; quantity: number } | { name: string; quantity: number }>
): {updatedInventory: InventoryItem[], lostItemIds: string[]} => {
    let newInventory = [...currentInventory];
    const fullyLostItemIds: string[] = [];

    if (gained) {
        gained.forEach(newItem => {
            if (!newItem.name || typeof newItem.quantity !== 'number' || newItem.quantity <=0) return; // Skip invalid items
            const existingItemIndex = newInventory.findIndex(item => item.name === newItem.name); 
            if (existingItemIndex > -1) {
                newInventory[existingItemIndex].quantity += newItem.quantity;
            } else {
                newInventory.push({ ...newItem, id: newItem.id || generateStableId(newItem.name, 'item') });
            }
        });
    }

    if (lost) {
        lost.forEach(itemToRemove => {
             if (typeof itemToRemove.quantity !== 'number' || itemToRemove.quantity <=0) return; // Skip invalid
            let itemIndex = -1;
            if ('id' in itemToRemove && itemToRemove.id) {
                itemIndex = newInventory.findIndex(item => item.id === itemToRemove.id);
            } else if ('name' in itemToRemove && itemToRemove.name) { 
                itemIndex = newInventory.findIndex(item => item.name === itemToRemove.name);
            }

            if (itemIndex > -1) {
                const currentItem = newInventory[itemIndex];
                newInventory[itemIndex].quantity -= itemToRemove.quantity;
                if (newInventory[itemIndex].quantity <= 0) {
                    fullyLostItemIds.push(currentItem.id); 
                    newInventory.splice(itemIndex, 1);
                }
            }
        });
    }
    return { updatedInventory: newInventory, lostItemIds: fullyLostItemIds };
};


export const GamePage: React.FC<GamePageProps> = ({
  gameState,
  setGameState,
  openModal,
  quitGame,
  nsfwSettings,
}) => {
  const { settings } = useSettings();
  const { addToast } = usePublicToast();
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const storyLogRef = useRef<HTMLDivElement>(null);
  
  const [activeSidePanel, setActiveSidePanel] = useState<Exclude<ActiveSidebarTab, 'actions'> | null>(null);
  const [numMessagesToShow, setNumMessagesToShow] = useState(INITIAL_MESSAGES_TO_SHOW);


  const [tooltip, setTooltip] = useState<{ content: React.ReactNode; x: number; y: number; width: number } | null>(null);
  const hideTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipElementRef = useRef<HTMLDivElement>(null);

  const effectiveCharacterStats = useMemo(() => {
    return calculateEffectiveStats(gameState.characterStats, gameState.equippedItems, gameState.inventory);
  }, [gameState.characterStats, gameState.equippedItems, gameState.inventory]);

 useEffect(() => {
    // If a panel was previously stored as active in gameState, open it.
    // This helps resume panel state on load or after certain actions.
    if (gameState.activeSidebarTab && gameState.activeSidebarTab !== 'actions' && !activeSidePanel) {
        // setActiveSidePanel(gameState.activeSidebarTab); // This might cause loop if not careful
    }
  }, [gameState.activeSidebarTab, activeSidePanel]);


  const handlePanelToggle = (panelId: Exclude<ActiveSidebarTab, 'actions'>) => {
    setActiveSidePanel(prevPanel => {
      const newPanel = prevPanel === panelId ? null : panelId;
      setGameState(prevGS => {
        if (prevGS) {
          // Store the new panel state or 'stats' if closing to a non-panel state
          const nextSidebarTab = newPanel || (prevGS.activeSidebarTab !== 'actions' ? prevGS.activeSidebarTab : 'stats');
          if (prevGS.activeSidebarTab !== nextSidebarTab) {
            return { ...prevGS, activeSidebarTab: nextSidebarTab as ActiveSidebarTab };
          }
        }
        return prevGS;
      });
      return newPanel;
    });
  };

  useEffect(() => {
    setNumMessagesToShow(INITIAL_MESSAGES_TO_SHOW);
  }, [gameState.setup.id]);


  useEffect(() => {
    if (storyLogRef.current && gameState.storyLog.length > 0) {
      const lastMessage = gameState.storyLog[gameState.storyLog.length - 1];
      const secondLastMessage = gameState.storyLog.length > 1 ? gameState.storyLog[gameState.storyLog.length - 2] : null;

      // Determine if the last message is a new AI-generated narration or event
      const isNewAIMessage = 
        (lastMessage.type === 'narration' || lastMessage.type === 'event') &&
        (
          (secondLastMessage && secondLastMessage.type === 'system' && secondLastMessage.content.includes("quyết định:")) || // Player action was just before
          (gameState.storyLog.length === 1 && lastMessage.type === 'narration') // Very first AI narration
        );

      if (isNewAIMessage) {
        const newMessageElement = document.getElementById(lastMessage.id);
        if (newMessageElement) {
          // Scroll to the top of the new AI message
          newMessageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return; // Prioritize this scrolling behavior
        }
      }

      // Fallback: original logic to scroll to bottom if user is already near bottom or few messages shown
      const { scrollTop, scrollHeight, clientHeight } = storyLogRef.current;
      // User is considered "near the bottom" if the scrollable content not visible is less than 150px
      const isScrolledToBottom = scrollHeight - scrollTop <= clientHeight + 150; 
      
      if (isScrolledToBottom || gameState.storyLog.length <= numMessagesToShow) {
        storyLogRef.current.scrollTop = storyLogRef.current.scrollHeight;
      }
    }
  }, [gameState.storyLog, numMessagesToShow]);
  
   useEffect(() => {
    const hpStat = effectiveCharacterStats.hp;
    if (hpStat && typeof hpStat.value === 'number' && hpStat.value <= 0) {
      const isAlreadyDeadOrModalOpen = gameState.storyLog.some(msg => msg.type === 'system' && msg.content.includes("qua đời")) ||
                                     gameState.currentChoices.length === 0 && gameState.isInitialStoryGenerated && gameState.storyLog.length > 1; 
      if (!isAlreadyDeadOrModalOpen) {
          addToast({message: `${gameState.setup.character.name} đã trút hơi thở cuối cùng...`, type: 'error', icon: 'fas fa-skull-crossbones', duration: 10000});
          setActiveSidePanel(null); // Close any open panel on death
          setGameState(prev => {
              if (!prev) return null;
              const deathMessage: StoryMessage = {
                  id: `system-death-${Date.now()}`,
                  type: 'system',
                  content: `${prev.setup.character.name} đã tử vong. Số mệnh đã định, không thể xoay chuyển.`,
                  timestamp: new Date().toISOString()
              };
              return { ...prev, storyLog: [...prev.storyLog, deathMessage], currentChoices: [] };
          });
          openModal(ModalType.DeathConfirmation);
      }
    }
  }, [effectiveCharacterStats.hp, gameState.setup.character.name, gameState.storyLog, gameState.currentChoices.length, gameState.isInitialStoryGenerated, openModal, setGameState, addToast]);

  const processAndAddNewEntries = useCallback((
        currentEntries: Entity[],
        newEntriesRaw?: Partial<Entity>[]
    ): Entity[] => {
        if (!newEntriesRaw || newEntriesRaw.length === 0) return currentEntries;
        let updatedEntries = [...currentEntries];
        newEntriesRaw.forEach(newEntryRaw => {
            if (!newEntryRaw.name || !newEntryRaw.type) return;
            const existingIndex = updatedEntries.findIndex(e => e.name === newEntryRaw.name && e.type === newEntryRaw.type);
            if (existingIndex > -1) {
                if (newEntryRaw.description && newEntryRaw.description !== updatedEntries[existingIndex].description) {
                     addToast({ message: `Bách khoa cập nhật: ${newEntryRaw.name}`, type: 'info', icon: 'fas fa-book-medical' });
                    updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], description: newEntryRaw.description };
                }
            } else {
                 addToast({ message: `Khám phá mới: ${newEntryRaw.name} (${newEntryRaw.type})`, type: 'info', icon: 'fas fa-map-marked-alt' });
                updatedEntries.push({
                    id: newEntryRaw.id || generateStableId(newEntryRaw.name, `encyclopedia-${newEntryRaw.type}`),
                    name: newEntryRaw.name,
                    type: newEntryRaw.type,
                    description: newEntryRaw.description || "Chưa có mô tả chi tiết."
                });
            }
        });
        return updatedEntries;
  }, [addToast]);

  const handleAction = useCallback(async (actionText: string) => {
    if (isLoadingAI) return;
    setIsLoadingAI(true);
    if(activeSidePanel) setActiveSidePanel(null); 

    const playerActionMessage: StoryMessage = {
      id: `msg-action-${Date.now()}`,
      type: 'system',
      content: `${gameState.setup.character.name} quyết định: "${actionText}"`,
      timestamp: new Date().toISOString()
    };
    
    const currentStateSnapshot = {
        storyLog: gameState.storyLog, 
        currentChoices: gameState.currentChoices,
        currentSummary: gameState.currentSummary,
        currentWorldEvent: gameState.currentWorldEvent,
        encyclopedia: gameState.encyclopedia,
        characterStats: gameState.characterStats,
        inventory: gameState.inventory,
        equippedItems: gameState.equippedItems,
        unlockedAchievements: gameState.unlockedAchievements,
        characterSkills: gameState.characterSkills,
        isRoleplayModeActive: gameState.isRoleplayModeActive,
        activeSidebarTab: activeSidePanel || gameState.activeSidebarTab,
        npcRelationships: gameState.npcRelationships,
        objectives: gameState.objectives,
    };

    setGameState(prev => {
      if (!prev) return null;
      const limitedHistory = prev.history.slice(-9); 
      return { 
        ...prev, 
        storyLog: [...prev.storyLog, playerActionMessage],
        history: [...limitedHistory, currentStateSnapshot] 
      };
    });

    const apiKey = settings.useDefaultAPI ? (process.env.API_KEY || '') : (localStorage.getItem(LOCAL_STORAGE_API_KEY) || '');
    
    try {
      const stateForAI = { ...gameState, storyLog: [...gameState.storyLog, playerActionMessage] };
      const nextSegmentData: NextStorySegmentResult = await generateNextStorySegment(
        apiKey,
        settings.useDefaultAPI,
        stateForAI, 
        actionText,
        nsfwSettings
      );

      setGameState(prev => {
        if (!prev) return null;
        const newMessages: StoryMessage[] = [...prev.storyLog, nextSegmentData.story];
        
        const updatedEncyclopedia = processAndAddNewEntries(prev.encyclopedia, nextSegmentData.newEntries);
        
        let updatedStats = { ...prev.characterStats };
        if (nextSegmentData.statChanges) {
          nextSegmentData.statChanges.forEach(change => {
            const statToUpdate = updatedStats[change.attribute_id];
            if (statToUpdate) {
                let changeDescription = "";
                const originalValue = statToUpdate.value;
                if (change.new_value !== undefined) {
                    statToUpdate.value = change.new_value;
                    changeDescription = `${statToUpdate.name}: ${originalValue} -> ${change.new_value}`;
                } else if (change.change_value !== undefined && typeof statToUpdate.value === 'number') {
                    statToUpdate.value += change.change_value;
                    changeDescription = `${statToUpdate.name}: ${originalValue} ${change.change_value >= 0 ? '+' : ''}${change.change_value} -> ${statToUpdate.value}`;
                }
                
                if (change.new_max_value !== undefined && typeof statToUpdate.maxValue === 'number') {
                    statToUpdate.maxValue = change.new_max_value;
                     changeDescription += ` (Max: ${statToUpdate.maxValue})`;
                }
                 if(change.reason) changeDescription += ` (Lý do: ${change.reason})`;
                if (changeDescription) addToast({message: changeDescription, type: 'info', icon: 'fas fa-chart-line'});
            }
          });
        }
        
        const { updatedInventory, lostItemIds } = updateInventory(prev.inventory, nextSegmentData.itemChanges?.gained, nextSegmentData.itemChanges?.lost);
        let updatedEquippedItems = { ...prev.equippedItems };

        if (lostItemIds.length > 0) {
            for (const slot in updatedEquippedItems) {
                const typedSlot = slot as EquipmentSlot;
                if (updatedEquippedItems[typedSlot] && lostItemIds.includes(updatedEquippedItems[typedSlot]!)) {
                    const lostItemName = prev.inventory.find(i => i.id === updatedEquippedItems[typedSlot])?.name || "Một vật phẩm";
                    delete updatedEquippedItems[typedSlot];
                    addToast({ message: `${lostItemName} đã bị mất và tự động tháo ra.`, type: 'warning', icon: 'fas fa-box-tissue' });
                }
            }
        }

        if (nextSegmentData.itemChanges?.gained) {
            nextSegmentData.itemChanges.gained.forEach(item => addToast({ message: `Nhận được: ${item.name} (x${item.quantity})`, type: 'success', icon: item.icon || 'fas fa-gift' }));
        }
        if (nextSegmentData.itemChanges?.lost) {
            nextSegmentData.itemChanges.lost.forEach(itemLost => {
                const name = 'name' in itemLost ? itemLost.name : prev.inventory.find(i => i.id === itemLost.id)?.name || 'Một vật phẩm';
                addToast({ message: `Mất: ${name} (x${itemLost.quantity})`, type: 'warning', icon: 'fas fa-minus-circle' });
            });
        }

        let updatedSkills = [...prev.characterSkills];
        if (nextSegmentData.newSkillsUnlocked) {
            nextSegmentData.newSkillsUnlocked.forEach(newSkill => {
                if (!updatedSkills.find(s => s.id === newSkill.id || s.name === newSkill.name)) {
                    const skillToAdd: Skill = {
                        id: newSkill.id || generateStableId(newSkill.name, 'skill'),
                        name: newSkill.name, description: newSkill.description || "Chưa có mô tả.", icon: newSkill.icon || 'fas fa-book-sparkles',
                        category: newSkill.category || 'khác', proficiency: newSkill.proficiency || 'Sơ Nhập Môn',
                        xp: newSkill.xp || 0, xpToNextLevel: newSkill.xpToNextLevel || 100, effects: newSkill.effects || []
                    };
                    updatedSkills.push(skillToAdd);
                    addToast({ message: `Học được kỹ năng mới: ${skillToAdd.name}!`, type: 'success', icon: skillToAdd.icon || 'fas fa-brain' });
                }
            });
        }
        if (nextSegmentData.skillChanges) {
            nextSegmentData.skillChanges.forEach(change => {
                const skillIndex = updatedSkills.findIndex(s => s.id === change.skill_id || s.name === change.skill_id); // Allow matching by name for robustness
                if (skillIndex > -1) {
                    const skillToUpdate = {...updatedSkills[skillIndex]}; 
                    let toastMessage = `Kỹ năng ${skillToUpdate.name}: `;
                    let changesMade = false;
                    if (change.xp_gained !== undefined) {
                        skillToUpdate.xp += change.xp_gained;
                        toastMessage += `+${change.xp_gained} XP. `; changesMade = true;
                    }
                    if (change.new_proficiency) {
                        toastMessage += `Thành thạo -> ${change.new_proficiency}. `;
                        skillToUpdate.proficiency = change.new_proficiency; skillToUpdate.xp = 0; changesMade = true;
                    }
                    if (change.new_xp_to_next_level !== undefined) skillToUpdate.xpToNextLevel = change.new_xp_to_next_level;
                    if (change.new_description) {
                        skillToUpdate.description = change.new_description;
                        if(!changesMade) toastMessage += `Mô tả cập nhật. `; changesMade = true;
                    }
                    if(change.reason) toastMessage += `(Lý do: ${change.reason})`;

                    if (changesMade) addToast({ message: toastMessage, type: 'info', icon: skillToUpdate.icon || 'fas fa-graduation-cap' });
                    
                    if (skillToUpdate.xp >= skillToUpdate.xpToNextLevel && skillToUpdate.xpToNextLevel > 0) {
                        const proficiencies: Skill['proficiency'][] = ["Sơ Nhập Môn", "Tiểu Thành", "Đại Thành", "Viên Mãn", "Lô Hoả Thuần Thanh", "Đăng Phong Tạo Cực"];
                        const currentProfIndex = proficiencies.indexOf(skillToUpdate.proficiency);
                        if (currentProfIndex < proficiencies.length - 1) {
                            skillToUpdate.proficiency = proficiencies[currentProfIndex + 1];
                            skillToUpdate.xp -= skillToUpdate.xpToNextLevel; 
                            skillToUpdate.xpToNextLevel = Math.floor(skillToUpdate.xpToNextLevel * (1.5 + Math.random()*0.5)); 
                            addToast({ message: `Kỹ năng ${skillToUpdate.name} đã thăng cấp thành thạo lên ${skillToUpdate.proficiency}!`, type: 'success', icon: 'fas fa-angle-double-up' });
                        } else if (skillToUpdate.proficiency === "Đăng Phong Tạo Cực") {
                             skillToUpdate.xp = skillToUpdate.xpToNextLevel; // Cap XP at max level
                        }
                    }
                     updatedSkills[skillIndex] = skillToUpdate;
                }
            });
        }
        
        let updatedAchievements = prev.unlockedAchievements;
        if (nextSegmentData.newlyUnlockedAchievements) {
            nextSegmentData.newlyUnlockedAchievements.forEach(ach => {
                 if (!updatedAchievements.find(ua => ua.name === ach.name)) {
                    const newAch = { ...ach, id: generateStableId(ach.name, 'ach'), unlockedAt: new Date().toISOString() };
                    updatedAchievements = [ ...updatedAchievements, newAch ];
                    addToast({ message: `Thành tựu mới: ${newAch.name}!`, type: 'success', icon: newAch.icon || 'fas fa-trophy' });
                }
            });
        }
        
        let updatedRelationships = { ...prev.npcRelationships };
        if (nextSegmentData.relationshipChanges) {
            nextSegmentData.relationshipChanges.forEach(change => {
                let npcProfile = Object.values(updatedRelationships).find(p => p.name === change.npc_name);
                if (!npcProfile && updatedEncyclopedia.find(e => e.name === change.npc_name && e.type === EntityType.NPC)) {
                    const newNpcEntry = updatedEncyclopedia.find(e => e.name === change.npc_name && e.type === EntityType.NPC);
                    if (newNpcEntry) {
                        const newNpcId = newNpcEntry.id;
                         updatedRelationships[newNpcId] = {
                            id: newNpcId, name: newNpcEntry.name, status: RelationshipStatus.Neutral, score: 0,
                            description: newNpcEntry.description, known: true,
                        };
                        npcProfile = updatedRelationships[newNpcId];
                        addToast({message: `Gặp gỡ ${newNpcEntry.name}.`, type: 'info', icon: 'fas fa-user-plus'});
                    }
                }

                if (npcProfile) {
                    let oldStatus = npcProfile.status; let oldScore = npcProfile.score;
                    if (change.score_change !== undefined) npcProfile.score = Math.max(-100, Math.min(100, npcProfile.score + change.score_change));
                    if (change.new_status) npcProfile.status = change.new_status;
                    else { 
                        if (npcProfile.score <= -80) npcProfile.status = RelationshipStatus.Hostile;
                        else if (npcProfile.score <= -30) npcProfile.status = RelationshipStatus.Mistrustful;
                        else if (npcProfile.score < 30) npcProfile.status = RelationshipStatus.Neutral;
                        else if (npcProfile.score < 60) npcProfile.status = RelationshipStatus.Amicable;
                        else if (npcProfile.score < 80) npcProfile.status = RelationshipStatus.Friendly;
                        else if (npcProfile.score < 100) npcProfile.status = RelationshipStatus.Loyal;
                        else npcProfile.status = RelationshipStatus.Adored;
                    }
                    if (change.reason) npcProfile.description = change.reason; // Update description with reason for change

                    if (oldStatus !== npcProfile.status || oldScore !== npcProfile.score) {
                         addToast({ message: `Quan hệ với ${npcProfile.name}: ${oldStatus} (${oldScore}) -> ${npcProfile.status} (${npcProfile.score}). ${change.reason ? `Lý do: ${change.reason}` : ''}`.trim(), type: 'info', icon: 'fas fa-heartbeat', duration: 7000 });
                    }
                    updatedRelationships[npcProfile.id] = npcProfile;
                }
            });
        }
        
        let updatedObjectives = [...prev.objectives];
        if (nextSegmentData.newObjectivesSuggested) {
            nextSegmentData.newObjectivesSuggested.forEach(objSugg => {
                if (!updatedObjectives.find(o => o.title === objSugg.title && o.status === 'active')) {
                     const newObjective: Objective = { ...objSugg, id: generateStableId(objSugg.title, 'obj'), status: 'active', isPlayerGoal: false, };
                     updatedObjectives.push(newObjective);
                     addToast({ message: `Mục tiêu mới được gợi ý: ${newObjective.title}`, type: 'info', icon: 'fas fa-lightbulb' });
                }
            });
        }
        if (nextSegmentData.objectiveUpdates) {
            nextSegmentData.objectiveUpdates.forEach(update => {
                const objIndex = updatedObjectives.findIndex(o => (o.id === update.objective_id_or_title || o.title === update.objective_id_or_title) && o.status === 'active');
                if (objIndex > -1) {
                    updatedObjectives[objIndex].status = update.new_status;
                    let toastIcon = update.new_status === 'completed' ? 'fas fa-flag-checkered' : 'fas fa-times-circle';
                    let toastTypeVal: ToastType = update.new_status === 'completed' ? 'success' : 'error';
                    addToast({ message: `Mục tiêu "${updatedObjectives[objIndex].title}" đã ${update.new_status === 'completed' ? 'hoàn thành' : 'thất bại'}! ${update.reason ? `Lý do: ${update.reason}` : ''}`, type: toastTypeVal, icon: toastIcon, duration: 8000 });
                }
            });
        }

        return {
          ...prev, storyLog: newMessages, currentChoices: nextSegmentData.choices, currentSummary: nextSegmentData.updatedSummary || prev.currentSummary,
          encyclopedia: updatedEncyclopedia, characterStats: updatedStats, inventory: updatedInventory, equippedItems: updatedEquippedItems,
          characterSkills: updatedSkills, unlockedAchievements: updatedAchievements, npcRelationships: updatedRelationships, objectives: updatedObjectives,
        };
      });
    } catch (error) {
      console.error("Error generating next story segment:", error);
      addToast({ message: `Lỗi AI: ${error.message}. Hãy thử lại.`, type: 'error' });
    } finally {
      setIsLoadingAI(false);
    }
  }, [gameState, setGameState, nsfwSettings, settings.useDefaultAPI, isLoadingAI, addToast, processAndAddNewEntries, activeSidePanel]);

  useEffect(() => {
    if (
      gameState && 
      !gameState.isRoleplayModeActive &&
      gameState.currentChoices.length === 0 &&
      gameState.isInitialStoryGenerated &&
      !isLoadingAI &&
      gameState.history.length > 0 && // Only if some action has been taken, not for the very initial story
      !gameState.storyLog.some(msg => msg.type === 'system' && msg.content.includes("tử vong")) 
    ) {
      handleAction("Nhân vật chính quan sát xung quanh và cân nhắc bước tiếp theo.");
    }
  }, [
    gameState?.isRoleplayModeActive, 
    gameState?.currentChoices?.length, 
    gameState?.isInitialStoryGenerated, 
    gameState?.history?.length,
    isLoadingAI,
    gameState?.storyLog, 
    handleAction 
  ]);


  const handleUseItem = useCallback((itemToUse: InventoryItem) => {
    if (!itemToUse.usable || itemToUse.quantity <= 0) {
      addToast({ message: "Không thể sử dụng vật phẩm này.", type: 'warning' });
      return;
    }
    let tempInventory = [...gameState.inventory];
    if (itemToUse.consumable) {
        const itemIndex = tempInventory.findIndex(i => i.id === itemToUse.id);
        if (itemIndex > -1) {
            tempInventory[itemIndex].quantity -= 1;
            if (tempInventory[itemIndex].quantity <= 0) {
                tempInventory.splice(itemIndex, 1);
                let tempEquipped = {...gameState.equippedItems}; let unequipped = false;
                for(const slot in tempEquipped){
                    if(tempEquipped[slot as EquipmentSlot] === itemToUse.id){ delete tempEquipped[slot as EquipmentSlot]; unequipped = true; break;}
                }
                if(unequipped) setGameState(prev => prev ? ({...prev, equippedItems: tempEquipped}) : null);
            }
        }
        setGameState(prev => prev ? ({...prev, inventory: tempInventory}) : null);
    }
    let newCharacterStats = {...gameState.characterStats}; // Use base stats for applying effects
    if (itemToUse.effects) {
        itemToUse.effects.forEach(effect => {
            const stat = newCharacterStats[effect.statId];
            if (stat && typeof stat.value === 'number') {
                const oldValue = stat.value; stat.value += effect.changeValue;
                if (stat.maxValue !== undefined) stat.value = Math.min(stat.value, stat.maxValue);
                if (stat.id === 'hp') stat.value = Math.max(0, stat.value); // Prevent negative HP
                 addToast({ message: `${itemToUse.name} đã sử dụng. ${stat.name}: ${parseFloat(oldValue.toFixed(1))} -> ${parseFloat(stat.value.toFixed(1))}.`, type: 'success', icon: itemToUse.icon || 'fas fa-magic-wand-sparkles' });
            }
        });
        setGameState(prev => prev ? ({...prev, characterStats: newCharacterStats}) : null);
    }
    handleAction(`Sử dụng vật phẩm ${itemToUse.name}.`);
  }, [gameState.inventory, gameState.characterStats, gameState.equippedItems, setGameState, handleAction, addToast]);

  const handleEquipItem = useCallback((itemToEquip: InventoryItem) => {
    if (!itemToEquip.equippable || !itemToEquip.slot) {
        addToast({message: "Vật phẩm này không thể trang bị.", type: 'warning'}); return;
    }
    setGameState(prev => {
        if (!prev) return null;
        const newEquippedItems = { ...prev.equippedItems };
        newEquippedItems[itemToEquip.slot!] = itemToEquip.id;
        addToast({ message: `Đã trang bị: ${itemToEquip.name} vào ô ${itemToEquip.slot}.`, type: 'success', icon: itemToEquip.icon || 'fas fa-user-shield'});
        // No AI call for equip/unequip, client handles stat changes
        return { ...prev, equippedItems: newEquippedItems };
    });
  }, [setGameState, addToast]);

  const handleUnequipItem = useCallback((slot: EquipmentSlot) => {
      setGameState(prev => {
          if (!prev) return null;
          const itemId = prev.equippedItems[slot]; if (!itemId) return prev;
          const item = prev.inventory.find(i => i.id === itemId);
          const newEquippedItems = { ...prev.equippedItems }; delete newEquippedItems[slot];
          addToast({message: `Đã tháo: ${item?.name || 'Vật phẩm'} từ ô ${slot}.`, type: 'info', icon: item?.icon || 'fas fa-hand-paper'});
          // No AI call for equip/unequip
          return { ...prev, equippedItems: newEquippedItems };
      });
  }, [setGameState, addToast]);

  const handleCultivate = useCallback(() => handleAction("Tập Trung Nâng Cấp"), [handleAction]);
  const handleAdvance = useCallback(() => {
    const qiStat = effectiveCharacterStats.spiritual_qi;
     if (qiStat && typeof qiStat.value === 'number' && typeof qiStat.maxValue === 'number' && qiStat.value >= qiStat.maxValue && qiStat.maxValue > 0) {
        handleAction("Thử Thách Thăng Tiến");
    } else {
        addToast({message: "Chưa đủ điểm kinh nghiệm để đột phá.", type: 'warning'});
    }
  }, [handleAction, effectiveCharacterStats.spiritual_qi, addToast]);

  const toggleRoleplayMode = useCallback(() => {
    setGameState(prev => {
        if (!prev) return null;
        const newMode = !prev.isRoleplayModeActive;
        addToast({message: `Chế độ ${newMode ? "Nhập Vai (Tự do)" : "AI Hỗ Trợ (Gợi ý)"} đã ${newMode ? "BẬT" : "TẮT"}.`, type: 'info', icon: newMode ? 'fas fa-theater-masks' : 'fas fa-brain'});
        return {...prev, isRoleplayModeActive: newMode, currentChoices: newMode ? [] : prev.currentChoices };
    });
  }, [setGameState, addToast]);
  
  const handleSaveGame = useCallback(() => {
    try {
        const gameJson = JSON.stringify(gameState, null, 2);
        const blob = new Blob([gameJson], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const setupNameNormalized = gameState.setup.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'aisim_save';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        a.href = url;
        a.download = `${setupNameNormalized}_${timestamp}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        addToast({message: "Đã lưu game thành công!", type: 'success', icon: 'fas fa-save'});
    } catch (error) {
        console.error("Error saving game:", error);
        addToast({message: "Lỗi khi lưu game.", type: 'error'});
    }
  }, [gameState, addToast]);
  
  const handleUndoLastAction = useCallback(() => {
    setGameState(prev => {
        if (!prev || prev.history.length === 0) {
            addToast({ message: "Không có hành động nào để hoàn tác.", type: 'warning' }); return prev;
        }
        const previousState = prev.history[prev.history.length - 1];
        const newHistory = prev.history.slice(0, -1);
        addToast({ message: "Đã hoàn tác hành động trước đó.", type: 'info', icon: 'fas fa-undo' });
        return {
            ...prev, storyLog: previousState.storyLog, currentChoices: previousState.currentChoices,
            currentSummary: previousState.currentSummary, currentWorldEvent: previousState.currentWorldEvent,
            encyclopedia: previousState.encyclopedia, characterStats: previousState.characterStats,
            inventory: previousState.inventory, equippedItems: previousState.equippedItems,
            unlockedAchievements: previousState.unlockedAchievements, characterSkills: previousState.characterSkills,
            isRoleplayModeActive: previousState.isRoleplayModeActive, activeSidebarTab: previousState.activeSidebarTab,
            npcRelationships: previousState.npcRelationships, objectives: previousState.objectives,
            history: newHistory,
        };
    });
  }, [setGameState, addToast]);


  const handleKeywordMouseEnter = useCallback((event: React.MouseEvent<HTMLSpanElement> | React.FocusEvent<HTMLSpanElement>, entryId: string, entryType: EntityType | "STAT" | "SKILL" | "ACH" | "TRAIT") => {
    if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current);
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    
    let contentNode: React.ReactNode = null; 
    let baseStatForComparison: CharacterAttribute | undefined;

    if (entryType === "STAT") {
        const stat = effectiveCharacterStats[entryId];
        baseStatForComparison = gameState.characterStats[entryId];
        if (stat) {
            let valueDisplay = typeof stat.value === 'number' && stat.maxValue && !stat.isProgressionStat && !['crit_chance', 'crit_damage_bonus', 'evasion_chance'].includes(stat.id)
                ? `${parseFloat(stat.value.toFixed(1))}/${parseFloat(stat.maxValue.toFixed(1))}` 
                : (typeof stat.value === 'number' && ['crit_chance', 'crit_damage_bonus', 'evasion_chance'].includes(stat.id) ? `${parseFloat(stat.value.toFixed(1))}%` : String(stat.value));
            
            let baseDisplay = "";
            if (baseStatForComparison && typeof baseStatForComparison.value === 'number' && typeof stat.value === 'number' && Math.abs(baseStatForComparison.value - stat.value) > 0.01) {
                 baseDisplay += ` (Gốc: ${parseFloat(baseStatForComparison.value.toFixed(1))}`;
                 if (baseStatForComparison.maxValue && stat.maxValue && Math.abs(baseStatForComparison.maxValue - stat.maxValue) > 0.01) {
                    baseDisplay += `/${parseFloat(baseStatForComparison.maxValue.toFixed(1))}`;
                 }
                 baseDisplay += ")";
            } else if (baseStatForComparison && baseStatForComparison.maxValue && stat.maxValue && Math.abs(baseStatForComparison.maxValue - stat.maxValue) > 0.01 && !baseDisplay.includes("Gốc")) {
                 baseDisplay += ` (Gốc Max: ${parseFloat(baseStatForComparison.maxValue.toFixed(1))})`;
            }


            contentNode = (
              <div>
                <strong className="text-primary-light dark:text-primary-dark">[CHỈ SỐ] {stat.name}: {valueDisplay}</strong>
                {baseDisplay && <em className="text-xs block opacity-80">{baseDisplay}</em>}
                {stat.description && <p className="text-xs mt-1 opacity-90">{stat.description}</p>}
              </div>
            );
        }
    } else if (entryType === "SKILL") {
        const skill = gameState.characterSkills.find(s => s.id === entryId);
        if (skill) contentNode = (
            <div>
                <strong className="text-purple-400 dark:text-purple-300">[KỸ NĂNG] {skill.name} ({skill.proficiency})</strong>
                <p className="text-xs mt-1 opacity-90">{skill.description}</p>
                <p className="text-xs mt-0.5 opacity-80">XP: {skill.xp}/{skill.xpToNextLevel}</p>
            </div>
        );
    } else if (entryType === "ACH") {
        const ach = gameState.unlockedAchievements.find(a => a.id === entryId);
        if (ach) contentNode = (
            <div>
                <strong className="text-yellow-400 dark:text-yellow-300">[THÀNH TỰU] {ach.name}</strong>
                <p className="text-xs mt-1 opacity-90">{ach.description}</p>
                <p className="text-xs mt-0.5 opacity-70">Mở khóa: {new Date(ach.unlockedAt).toLocaleDateString()}</p>
            </div>
        );
    } else if (entryType === "TRAIT") {
        const trait = gameState.setup.character.traits.find(t => t.id === entryId);
        if (trait) contentNode = (
            <div>
                <strong className="text-indigo-400 dark:text-indigo-300">[ĐẶC ĐIỂM] {trait.name}</strong>
                <p className="text-xs mt-1 opacity-90">{trait.description}</p>
            </div>
        );
    }
    else { // Encyclopedia types
        const entry = gameState.encyclopedia.find(e => e.id === entryId && e.type === entryType);
        let typeColor = "text-pink-400 dark:text-pink-300";
        if (entryType === EntityType.Item) typeColor = "text-orange-400 dark:text-orange-300";
        else if (entryType === EntityType.NPC) typeColor = "text-teal-400 dark:text-teal-300";
        else if (entryType === EntityType.Location) typeColor = "text-lime-400 dark:text-lime-300";
        else if (entryType === EntityType.Organization) typeColor = "text-cyan-400 dark:text-cyan-300";

        if (entry) contentNode = (
             <div>
                <strong className={typeColor}>[{entry.type.toUpperCase()}] {entry.name}</strong>
                <p className="text-xs mt-1 opacity-90">{entry.description}</p>
            </div>
        );
    }

    if (contentNode) {
        setTooltip({ content: contentNode, x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 8, width: rect.width });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCharacterStats, gameState.characterSkills, gameState.unlockedAchievements, gameState.setup.character.traits, gameState.encyclopedia, gameState.characterStats]);


  const handleKeywordMouseLeave = () => {
    hideTooltipTimeoutRef.current = setTimeout(() => {
        setTooltip(null);
    }, 150); 
  };

  useEffect(() => {
    const tooltipElem = tooltipElementRef.current;
    if (tooltipElem) {
        const enterListener = () => { if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current); };
        const leaveListener = () => setTooltip(null);
        tooltipElem.addEventListener('mouseenter', enterListener);
        tooltipElem.addEventListener('mouseleave', leaveListener);
        return () => {
            tooltipElem.removeEventListener('mouseenter', enterListener);
            tooltipElem.removeEventListener('mouseleave', leaveListener);
        };
    }
  }, [tooltip]);

  const allKeywordsForHighlighting = useMemo(() => {
    const keywords: {term: string, type: EntityType | "STAT" | "SKILL" | "ACH" | "TRAIT", id: string}[] = [];
    Object.values(gameState.characterStats).forEach(stat => keywords.push({ term: stat.name, type: "STAT", id: stat.id }));
    gameState.characterSkills.forEach(skill => keywords.push({ term: skill.name, type: "SKILL", id: skill.id }));
    gameState.unlockedAchievements.forEach(ach => keywords.push({ term: ach.name, type: "ACH", id: ach.id }));
    gameState.setup.character.traits.forEach(trait => keywords.push({ term: trait.name, type: "TRAIT", id: trait.id }));
    gameState.encyclopedia.forEach(entity => keywords.push({ term: entity.name, type: entity.type, id: entity.id }));
    gameState.inventory.forEach(item => {
        if (!keywords.some(k => k.term.toLowerCase() === item.name.toLowerCase() && k.type === EntityType.Item)) { // Avoid duplicates if item name in encyclopedia
            keywords.push({ term: item.name, type: EntityType.Item, id: item.id });
        }
    });
    return keywords.filter(kw => kw.term.length > 2) // Only highlight terms longer than 2 chars
                   .sort((a, b) => b.term.length - a.term.length); // Longer terms first for better matching
  }, [gameState.characterStats, gameState.characterSkills, gameState.unlockedAchievements, gameState.setup.character.traits, gameState.encyclopedia, gameState.inventory]);

  const parseAndRenderStory = useCallback((content: string): React.ReactNode[] => {
    if (!allKeywordsForHighlighting.length || content.length === 0) return [content];

    const uniqueTerms = Array.from(new Set(allKeywordsForHighlighting.map(kw => kw.term.toLowerCase())));
    if (!uniqueTerms.length) return [content];
    
    // Build a regex that matches any of the unique terms as whole words, case-insensitively
    const regex = new RegExp(`\\b(${uniqueTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push(content.substring(lastIndex, match.index));
        }
        const matchedTermOriginalCase = match[0];
        const matchedTermLowerCase = matchedTermOriginalCase.toLowerCase();
        
        const keywordInfo = allKeywordsForHighlighting.find(kw => kw.term.toLowerCase() === matchedTermLowerCase);

        if (keywordInfo) {
            let colorClass = "font-semibold hover:underline cursor-pointer transition-all duration-150 ease-in-out";
            let titleText = keywordInfo.term;
            let mappedTypeForHandler: EntityType | "STAT" | "SKILL" | "ACH" | "TRAIT" = keywordInfo.type;

            switch(keywordInfo.type) {
                case "STAT": colorClass += " text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"; titleText=`Chỉ số: ${keywordInfo.term}`; break;
                case "SKILL": colorClass += " text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"; titleText=`Kỹ năng: ${keywordInfo.term}`; break;
                case EntityType.Item: colorClass += " text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300"; titleText=`Vật phẩm: ${keywordInfo.term}`; break;
                case EntityType.NPC: colorClass += " text-teal-500 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300"; titleText=`NPC: ${keywordInfo.term}`; break;
                case EntityType.Location: colorClass += " text-lime-500 dark:text-lime-400 hover:text-lime-600 dark:hover:text-lime-300"; titleText=`Địa điểm: ${keywordInfo.term}`; break;
                case EntityType.Organization: colorClass += " text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300"; titleText=`Tổ chức: ${keywordInfo.term}`; break;
                case "TRAIT": colorClass += " text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"; titleText = `Đặc điểm: ${keywordInfo.term}`; break;
                case "ACH": colorClass += " text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300"; titleText=`Thành tựu: ${keywordInfo.term}`; break;
                case EntityType.Other: colorClass += " text-pink-500 dark:text-pink-400 hover:text-pink-600 dark:hover:text-pink-300"; titleText=`Khác: ${keywordInfo.term}`; break;
                default: colorClass += " text-text-light dark:text-text-dark font-medium";
            }
            parts.push(
                <span key={`${keywordInfo.id}-${match.index}`} className={colorClass} title={titleText}
                    onMouseEnter={(e) => handleKeywordMouseEnter(e, keywordInfo.id, mappedTypeForHandler)}
                    onMouseLeave={handleKeywordMouseLeave} role="button" tabIndex={0}
                    onFocus={(e) => handleKeywordMouseEnter(e, keywordInfo.id, mappedTypeForHandler)} 
                    onBlur={handleKeywordMouseLeave}
                    onClick={(e) => { if(window.innerWidth < 1024) handleKeywordMouseEnter(e, keywordInfo.id, mappedTypeForHandler); }} 
                >
                    {matchedTermOriginalCase}
                </span>
            );
        } else { 
            parts.push(matchedTermOriginalCase);
        }
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
    }
    return parts;
  }, [allKeywordsForHighlighting, handleKeywordMouseEnter, handleKeywordMouseLeave]);


  const menuButtonClass = "px-3 py-2 text-xs sm:text-sm rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background-light dark:focus-visible:ring-offset-background-dark whitespace-nowrap shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95";

  const renderPanelContent = (panelId: Exclude<ActiveSidebarTab, 'actions'> | null) => {
    if (!panelId) return null;
    switch(panelId) {
      case 'stats': return <CharacterStatsPanel baseStats={gameState.characterStats} equippedItems={gameState.equippedItems} inventory={gameState.inventory} characterName={gameState.setup.character.name} />;
      case 'equipment': return <EquipmentPanel equippedItems={gameState.equippedItems} inventory={gameState.inventory} onUnequipItem={handleUnequipItem} />;
      case 'inventory': return <InventoryPanel items={gameState.inventory} equippedItems={gameState.equippedItems} onUseItem={handleUseItem} onEquipItem={handleEquipItem} isLoadingAI={isLoadingAI} />;
      case 'cultivation': return <CultivationPanel progressionStat={effectiveCharacterStats.progression_level} qiStat={effectiveCharacterStats.spiritual_qi} onAdvance={handleAdvance} onCultivate={handleCultivate} isLoadingAI={isLoadingAI}/>;
      case 'skills': return <CharacterSkillsPanel skills={gameState.characterSkills} isLoadingAI={isLoadingAI} />;
      case 'achievements': return <AchievementsPanel achievements={gameState.unlockedAchievements} />;
      case 'relationships': return <RelationshipsPanel relationships={gameState.npcRelationships} />;
      default: return <p className="text-center p-4">Chọn một tab để xem.</p>;
    }
  };
  
  type PanelTabId = Exclude<ActiveSidebarTab, 'actions'>;
  const panelTabConfig: {id: PanelTabId; label: string; icon: string; color: string}[] = [
      {id: 'stats', label: 'Chỉ Số', icon: 'fas fa-chart-line', color: 'blue'},
      {id: 'equipment', label: 'Trang Bị', icon: 'fas fa-shield-halved', color: 'orange'},
      {id: 'inventory', label: 'Ba Lô', icon: 'fas fa-briefcase', color: 'sky'},
      {id: 'cultivation', label: 'Tu Luyện', icon: 'fas fa-hat-wizard', color: 'indigo'},
      {id: 'skills', label: 'Kỹ Năng', icon: 'fas fa-book-sparkles', color: 'purple'},
      {id: 'achievements', label: 'Thành Tựu', icon: 'fas fa-trophy', color: 'yellow'},
      {id: 'relationships', label: 'Quan Hệ', icon: 'fas fa-users', color: 'pink'},
  ];

  const handleRerollInitialStory = useCallback(async () => {
    if (isLoadingAI || !gameState || gameState.history.length > 0) return; 

    setIsLoadingAI(true);
    addToast({ message: "Đang yêu cầu AI tạo lại mở đầu mới...", type: 'info', icon: 'fas fa-dice-d6 fa-spin' });
    setNumMessagesToShow(INITIAL_MESSAGES_TO_SHOW); // Reset loaded messages count for new story

    const apiKey = settings.useDefaultAPI ? (process.env.API_KEY || '') : (localStorage.getItem(LOCAL_STORAGE_API_KEY) || '');

    try {
        const data = await generateInitialStory(
            apiKey,
            settings.useDefaultAPI,
            gameState.setup.world,
            gameState.setup.character,
            gameState.setup.entities, 
            nsfwSettings
        );

        setGameState(prev => {
            if (!prev) return null;

            const newMessages: StoryMessage[] = [data.story]; 

            let updatedEncyclopedia = [...prev.setup.entities]; 
            const setupEntityKeys = new Set(prev.setup.entities.map(e => `${e.name}_${e.type}`));

            if (data.newEntries) {
                data.newEntries.forEach(newEntry => {
                    if (!newEntry.name || !newEntry.type) return;
                    const entryKey = `${newEntry.name}_${newEntry.type}`;
                    if (!setupEntityKeys.has(entryKey)) { 
                        const existingDynamicIndex = updatedEncyclopedia.findIndex(e => e.name === newEntry.name && e.type === newEntry.type);
                        if (existingDynamicIndex > -1) { 
                            updatedEncyclopedia[existingDynamicIndex] = { ...updatedEncyclopedia[existingDynamicIndex], ...newEntry, id: updatedEncyclopedia[existingDynamicIndex].id };
                        } else {
                            updatedEncyclopedia.push({ ...newEntry, id: newEntry.id || generateStableId(newEntry.name, `encyclopedia-${newEntry.type}`) });
                        }
                    }
                });
            }

            let updatedStats = data.initialStats || prev.characterStats; 
            let updatedInventory = data.initialInventory || []; 
            let updatedSkills = data.initialSkills || []; 
            
            let updatedAchievements: Achievement[] = []; 
            if (data.newlyUnlockedAchievements) {
                updatedAchievements = data.newlyUnlockedAchievements.map(ach => ({
                    ...ach,
                    id: generateStableId(ach.name, 'ach'),
                    unlockedAt: new Date().toISOString()
                }));
                data.newlyUnlockedAchievements.forEach(ach => addToast({ message: `Thành tựu mới: ${ach.name}!`, type: 'success', icon: ach.icon || 'fas fa-trophy' }));
            }
            
            let updatedRelationships: Record<string, NPCProfile> = {}; 
            if (data.initialRelationships) {
                data.initialRelationships.forEach(rel => {
                    if (rel.name) {
                        const npcId = rel.id || generateStableId(rel.name, 'npc');
                        updatedRelationships[npcId] = {
                            id: npcId, name: rel.name,
                            status: rel.status || RelationshipStatus.Neutral,
                            score: rel.score || 0,
                            description: rel.description,
                            known: rel.known !== undefined ? rel.known : true,
                        };
                    }
                });
            }
            
            let updatedObjectives: Objective[] = []; 
            if (data.initialObjectives) {
                updatedObjectives = data.initialObjectives.map(obj => ({
                    ...obj,
                    id: generateStableId(obj.title, 'obj'),
                    status: 'active' as 'active',
                    isPlayerGoal: obj.isPlayerGoal !== undefined ? obj.isPlayerGoal : (obj.title.toLowerCase().includes(prev.setup.character.goal.toLowerCase()) && prev.setup.character.goal.length > 5)
                }));
                data.initialObjectives.forEach(obj => addToast({ message: `Mục tiêu mới: ${obj.title}`, type: 'info', icon: 'fas fa-flag-checkered' }));
            }

            addToast({ message: "Đã tạo lại mở đầu câu chuyện!", type: 'success', icon: 'fas fa-dice-d6' });

            return {
                ...prev,
                storyLog: newMessages,
                currentChoices: data.choices,
                encyclopedia: updatedEncyclopedia,
                isInitialStoryGenerated: true, 
                characterStats: updatedStats,
                inventory: updatedInventory,
                equippedItems: {}, 
                characterSkills: updatedSkills,
                unlockedAchievements: updatedAchievements,
                npcRelationships: updatedRelationships,
                objectives: updatedObjectives,
                history: [], 
                currentSummary: "", 
                currentWorldEvent: null, 
            };
        });
    } catch (error: any) {
        console.error("Error rerolling initial story:", error);
        addToast({ message: `Lỗi AI khi tạo lại mở đầu: ${error.message}.`, type: 'error', duration: 10000 });
    } finally {
        setIsLoadingAI(false);
    }
  }, [isLoadingAI, gameState, nsfwSettings, settings.useDefaultAPI, setGameState, addToast]);


  if (!gameState.isInitialStoryGenerated && isLoadingAI) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-text-light dark:text-text-dark bg-background-light dark:bg-background-dark">
        <i className="fas fa-spinner fa-spin fa-4x text-primary dark:text-primary-light mb-6"></i>
        <p className="text-2xl font-semibold mb-2">AI đang khởi tạo thế giới hùng vĩ...</p>
        <p className="text-md text-slate-600 dark:text-slate-400">Đây là lúc ma pháp thực sự bắt đầu. Xin chờ trong chốc lát.</p>
      </div>
    );
  }

  const messagesToDisplay = gameState.storyLog.slice(Math.max(0, gameState.storyLog.length - numMessagesToShow));
  const olderMessagesCount = gameState.storyLog.length - messagesToDisplay.length;


  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark overflow-hidden antialiased">
      {/* Header for Global Actions */}
      <header className="flex-shrink-0 bg-card-light dark:bg-card-dark shadow-lg p-2 sm:p-2.5 z-50">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
           <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <Button onClick={toggleRoleplayMode} className={`${menuButtonClass} ${gameState.isRoleplayModeActive ? 'bg-purple-500 hover:bg-purple-600 text-white focus-visible:ring-purple-400' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 focus-visible:ring-slate-400'}`} title={gameState.isRoleplayModeActive ? "Chế độ Nhập Vai (Tự do hành động)" : "Chế độ AI Hỗ Trợ (AI gợi ý)"} size="sm">
                    <i className={`fas ${gameState.isRoleplayModeActive ? 'fa-theater-masks' : 'fa-brain'} mr-1 sm:mr-1.5`}></i><span className="hidden sm:inline">{gameState.isRoleplayModeActive ? "Nhập Vai" : "AI Hỗ Trợ"}</span>
                </Button>
                <Button onClick={handleSaveGame} className={`${menuButtonClass} bg-sky-500 hover:bg-sky-600 text-white focus-visible:ring-sky-300`} title="Lưu game" size="sm">
                    <i className="fas fa-save mr-1 sm:mr-1.5"></i><span className="hidden sm:inline">Lưu</span>
                </Button>
                 <Button onClick={() => openModal(ModalType.Encyclopedia)} className={`${menuButtonClass} bg-green-500 hover:bg-green-600 text-white focus-visible:ring-green-300`} title="Bách Khoa Toàn Thư" size="sm">
                    <i className="fas fa-book-open mr-1 sm:mr-1.5"></i><span className="hidden sm:inline">B.Khoa</span>
                </Button>
                <Button onClick={() => openModal(ModalType.StorySummary)} className={`${menuButtonClass} bg-orange-500 hover:bg-orange-600 text-white focus-visible:ring-orange-300`} title="Tóm Tắt Cốt Truyện" size="sm">
                    <i className="fas fa-scroll mr-1 sm:mr-1.5"></i><span className="hidden sm:inline">T.Tắt</span>
                </Button>
                 <Button onClick={() => openModal(ModalType.WorldEventCreator)} className={`${menuButtonClass} bg-teal-500 hover:bg-teal-600 text-white focus-visible:ring-teal-300`} title="Tạo Sự Kiện Thế Giới" size="sm">
                    <i className="fas fa-meteor mr-1 sm:mr-1.5"></i><span className="hidden sm:inline">S.Kiện</span>
                </Button>
                <Button onClick={handleUndoLastAction} disabled={gameState.history.length === 0} className={`${menuButtonClass} bg-yellow-500 hover:bg-yellow-600 text-white focus-visible:ring-yellow-300 disabled:opacity-50 disabled:hover:bg-yellow-500`} title="Hoàn tác hành động cuối" size="sm">
                    <i className="fas fa-undo mr-1 sm:mr-1.5"></i><span className="hidden sm:inline">H.Tác</span>
                </Button>
            </div>
            
            <div className="flex items-center">
                 <Button onClick={quitGame} variant="danger" className={`${menuButtonClass}`} title="Thoát game" size="sm">
                    <i className="fas fa-door-open mr-1 sm:mr-1.5"></i><span className="hidden sm:inline">Thoát</span>
                </Button>
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col overflow-hidden">
          {/* Story Log */}
          <div 
            ref={storyLogRef} 
            className="flex-grow overflow-y-auto p-3 md:p-4 space-y-3.5 custom-scrollbar bg-slate-100 dark:bg-slate-800/70 leading-relaxed scroll-smooth shadow-inner"
          >
           {olderMessagesCount > 0 && (
              <div className="text-center my-3 sticky top-2 z-10">
                <Button
                  onClick={() => setNumMessagesToShow(prev => prev + MESSAGES_TO_LOAD_PER_CLICK)}
                  variant="outline"
                  size="sm"
                  className="bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm hover:shadow-md"
                >
                  <i className="fas fa-chevron-up mr-2"></i>
                  Tải thêm tin nhắn cũ ({olderMessagesCount} tin)
                </Button>
              </div>
            )}
          {messagesToDisplay.map((msg, index) => (
              <div 
                key={msg.id} 
                id={msg.id} // Added ID here for targeting
                className={`relative p-3 rounded-lg shadow-sm text-sm break-words ${
              msg.type === 'narration' ? 'bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600/50' :
              msg.type === 'dialogue' ? `ml-2 md:ml-3 border-l-4 ${msg.characterName === gameState.setup.character.name ? 'border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/20' : 'border-secondary dark:border-secondary-dark bg-secondary/10 dark:bg-secondary-dark/20'}` :
              msg.type === 'event' ? 'bg-yellow-100 dark:bg-yellow-500/30 border-l-4 border-yellow-400 dark:border-yellow-500 italic font-medium' :
              msg.type === 'loading' ? 'text-center text-slate-500 dark:text-slate-400 animate-pulse' :
              'text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-900/60 p-2 italic rounded-md'
              }`}>
              {index === 0 && messagesToDisplay.length === gameState.storyLog.length && gameState.storyLog.length > 0 && gameState.isInitialStoryGenerated && gameState.history.length === 0 && !isLoadingAI && msg.type === 'narration' && (
                <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleRerollInitialStory}
                    className="absolute top-1 right-1 !p-1.5 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-light z-10 opacity-70 hover:opacity-100"
                    title="Tạo lại mở đầu câu chuyện"
                    aria-label="Tạo lại mở đầu câu chuyện"
                >
                    <i className="fas fa-dice-d6 fa-lg"></i>
                </Button>
              )}
              {msg.type === 'dialogue' && msg.characterName && (
                  <p className={`font-semibold mb-0.5 ${msg.characterName === gameState.setup.character.name ? 'text-primary dark:text-primary-light' : 'text-secondary dark:text-secondary-dark'}`}>
                  {msg.characterName}:
                  </p>
              )}
              <div className="whitespace-pre-wrap selection:bg-primary/30 dark:selection:bg-primary-dark/40">{parseAndRenderStory(msg.content)}</div>
              <p className="text-xs text-right opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
          ))}
          {isLoadingAI && (
              <div className="flex items-center justify-center p-4 text-slate-500 dark:text-slate-400">
                  <i className="fas fa-spinner fa-spin fa-lg mr-2.5"></i>AI đang kiến tạo tình tiết mới...
              </div>
          )}
          </div>
          
          {/* Action Input Area */}
          {(!isLoadingAI && (gameState.currentChoices.length > 0 || gameState.isRoleplayModeActive)) && (
            <div className="flex-shrink-0 p-2 sm:p-3.5 border-t border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-top">
                <ActionPanelContent 
                  choices={gameState.currentChoices}
                  onChooseAction={handleAction}
                  isLoadingAI={isLoadingAI}
                  isRoleplayModeActive={gameState.isRoleplayModeActive}
                />
            </div>
          )}
      </main>

      {/* Bottom Navigation Bar */}
       <nav className="flex-shrink-0 bg-slate-800 dark:bg-slate-900 shadow-top-strong p-1 z-40 h-[50px] sm:h-[72px] border-t border-slate-700 dark:border-slate-600">
        <div className="flex justify-around items-stretch h-full">
          {panelTabConfig.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => handlePanelToggle(tab.id)} 
              title={tab.label}
              aria-pressed={activeSidePanel === tab.id}
              className={`flex-1 p-1 rounded-lg transition-all duration-200 ease-in-out flex flex-col items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 
                ${activeSidePanel === tab.id 
                  ? `bg-${tab.color}-500 dark:bg-${tab.color}-600 text-white shadow-inner focus-visible:ring-${tab.color}-400` 
                  : `text-slate-400 hover:bg-slate-700 dark:hover:bg-slate-700/70 hover:text-${tab.color}-300 dark:hover:text-${tab.color}-200 focus-visible:ring-${tab.color}-500/70`
                }`
              }
            >
              <i className={`${tab.icon} text-lg sm:text-xl mb-0 sm:mb-0.5`}></i>
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight leading-tight">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Side Panel for Content (slides from right) */}
      <div 
        className={`
          fixed inset-y-0 right-0 z-30 bg-card-light dark:bg-card-dark shadow-2xl 
          border-l-2 border-primary dark:border-primary-dark
          transition-transform duration-300 ease-in-out transform
          ${activeSidePanel ? 'translate-x-0' : 'translate-x-full'}
          w-full md:w-[400px] lg:w-[450px]
          flex flex-col
        `}
        style={{ top: '60px', bottom: '50px' }} // Positioned between header and bottomNav (header ~60px, bottomNav 50px mobile)
      >
        <div className="flex-shrink-0 p-3 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-slate-50 dark:bg-slate-800 sticky top-0">
          <h3 className="text-lg font-semibold text-primary dark:text-primary-light flex items-center">
            <i className={`${panelTabConfig.find(t => t.id === activeSidePanel)?.icon || ''} mr-2.5`}></i>
            {panelTabConfig.find(t => t.id === activeSidePanel)?.label || 'Bảng Điều Khiển'}
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setActiveSidePanel(null)} aria-label="Đóng bảng điều khiển" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 !p-1.5">
            <i className="fas fa-times fa-lg"></i>
          </Button>
        </div>
        <div className="flex-grow p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          {activeSidePanel && renderPanelContent(activeSidePanel)}
        </div>
      </div>
      
      {tooltip && (
        <div
          ref={tooltipElementRef}
          className="fixed z-[200] p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl max-w-xs sm:max-w-sm whitespace-pre-line animate-tooltipFadeIn pointer-events-auto ring-1 ring-slate-700"
          style={{ top: tooltip.y, left: Math.max(5, Math.min(tooltip.x, window.innerWidth - (tooltipElementRef.current?.offsetWidth || 320) - 5 )) }}
          onMouseEnter={() => { if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current); }} 
          onMouseLeave={() => setTooltip(null)} 
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};
