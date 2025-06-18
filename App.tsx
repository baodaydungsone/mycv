
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModalType, GameState, StorySetupData, Settings, NSFWPreferences, Entity, CharacterStats, InventoryItem, Achievement, Skill, NPCProfile, Objective, EquipmentSlot } from './types'; // Added NPCProfile, Objective, EquipmentSlot
import { APP_TITLE, LOCAL_STORAGE_API_KEY } from './constants';
import HomePage from './pages/HomePage';
import { GamePage } from './pages/GamePage'; // Changed to named import
import ApiSettingsModal from './components/modals/ApiSettingsModal';
import NsfwSettingsModal from './components/modals/NsfwSettingsModal';
import GeneralSettingsModal from './components/modals/GeneralSettingsModal';
import GuideModal from './components/modals/GuideModal';
import NewStorySetupModal from './components/modals/NewStorySetupModal';
import LoadStoryModal from './components/modals/LoadStoryModal';
import { useSettings } from './contexts/SettingsContext';
import { usePublicToast } from './contexts/ToastContext';
import WorldEventCreatorModal from './components/modals/WorldEventCreatorModal';
import StorySummaryModal from './components/modals/StorySummaryModal';
import EncyclopediaModal from './components/modals/EncyclopediaModal';
import ToastContainer from './components/ToastContainer';
import DeathConfirmationModal from './components/modals/DeathConfirmationModal';

const App: React.FC = () => {
  const { settings, nsfwSettings, userApiKey } = useSettings(); // Destructure userApiKey
  const { addToast } = usePublicToast();
  const [activeModal, setActiveModal] = useState<ModalType>(ModalType.None);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getDefaultStats = useCallback((): CharacterStats => ({
    hp: { id: 'hp', name: 'HP', value: 100, maxValue: 100, description: 'Sinh lực của bạn. Khi về 0, bạn sẽ tử vong.', icon: 'fas fa-heartbeat' },
    mp: { id: 'mp', name: 'MP', value: 50, maxValue: 50, description: 'Năng lượng/Linh lực/Nội năng để sử dụng kỹ năng.', icon: 'fas fa-bolt' },
    progression_level: { id: 'progression_level', name: 'Cấp Độ/Cảnh Giới', value: "Tân Thủ", isProgressionStat: true, description: "Cấp bậc hiện tại của bạn trong hệ thống tu luyện/phát triển.", icon: "fas fa-star"},
    spiritual_qi: { id: 'spiritual_qi', name: 'Điểm Kinh Nghiệm/Linh Khí', value: 0, maxValue: 100, description: "Tài nguyên cần để thăng cấp hoặc nâng cao cảnh giới.", icon: "fas fa-arrow-up" },
    intelligence: { id: 'intelligence', name: 'Trí Lực', value: 10, description: "Ảnh hưởng đến khả năng học hỏi, tốc độ lĩnh ngộ, và sức mạnh của một số kỹ năng phép thuật.", icon: "fas fa-brain"},
    constitution: { id: 'constitution', name: 'Thể Chất', value: 7, description: "Ảnh hưởng đến HP tối đa, khả năng chịu đựng, và kháng các hiệu ứng tiêu cực.", icon: "fas fa-heart-circle-bolt" },
    agility: { id: 'agility', name: 'Nhanh Nhẹn', value: 7, description: "Ảnh hưởng đến tốc độ hành động, khả năng né tránh, và thứ tự ra đòn trong chiến đấu.", icon: "fas fa-shoe-prints" },
    luck: { id: 'luck', name: 'May Mắn', value: 5, description: "Ảnh hưởng đến tỉ lệ rơi vật phẩm quý hiếm, xác suất thành công của một số hành động, và tần suất gặp kỳ ngộ.", icon: "fas fa-dice-five" },
    // Combat stats below
    damage_output: { id: 'damage_output', name: 'Sát Thương Cơ Bản', value: 10, description: 'Sức mạnh đòn đánh vật lý/phép thuật cơ bản của bạn.', icon: 'fas fa-fist-raised' },
    attack_speed: { id: 'attack_speed', name: 'Tốc Độ Đánh', value: 1.0, description: 'Tần suất ra đòn hoặc số hành động có thể thực hiện trong một lượt/khoảng thời gian.', icon: 'fas fa-wind' },
    crit_chance: { id: 'crit_chance', name: 'Tỷ Lệ Chí Mạng', value: 5, maxValue: 100, description: '% cơ hội gây sát thương chí mạng (gấp bội).', icon: 'fas fa-bullseye' },
    crit_damage_bonus: { id: 'crit_damage_bonus', name: 'Thưởng Sát Thương Chí Mạng', value: 50, description: '% sát thương được cộng thêm khi gây chí mạng (VD: 50% nghĩa là ST x1.5).', icon: 'fas fa-percentage' },
    defense_value: { id: 'defense_value', name: 'Phòng Thủ', value: 5, description: 'Giảm sát thương nhận vào từ các đòn tấn công.', icon: 'fas fa-shield-alt' },
    evasion_chance: { id: 'evasion_chance', name: 'Tỷ Lệ Né Tránh', value: 5, maxValue: 100, description: '% cơ hội né hoàn toàn một đòn tấn công của đối thủ.', icon: 'fas fa-running' },
  }), []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    document.body.style.fontSize = `${settings.fontSize}px`;
  }, [settings.theme, settings.fontSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); 
    return () => clearTimeout(timer);
  }, []);


  const handleStartNewStory = useCallback((setupData: StorySetupData) => {
    const initialStats = setupData.initialCharacterStats || getDefaultStats();
    if (!initialStats.progression_level) initialStats.progression_level = getDefaultStats().progression_level;
    if (!initialStats.spiritual_qi) initialStats.spiritual_qi = getDefaultStats().spiritual_qi;
    if (!initialStats.intelligence) initialStats.intelligence = getDefaultStats().intelligence;
    if (!initialStats.constitution) initialStats.constitution = getDefaultStats().constitution;
    if (!initialStats.agility) initialStats.agility = getDefaultStats().agility;
    if (!initialStats.luck) initialStats.luck = getDefaultStats().luck;

    const defaultCombatStats = getDefaultStats();
    for (const key in defaultCombatStats) {
        if (['hp', 'mp', 'progression_level', 'spiritual_qi', 'intelligence', 'constitution', 'agility', 'luck'].includes(key)) continue;
        if (!initialStats[key]) initialStats[key] = defaultCombatStats[key];
    }

    const initialInventory = setupData.initialInventory || [];
    const newEquippedItems: Partial<Record<EquipmentSlot, InventoryItem['id']>> = {};
    if (initialInventory) {
      for (const item of initialInventory) {
        if (item.equippable && item.slot) {
          // Check if the slot is valid (exists in EquipmentSlot enum) and not already filled
          if (Object.values(EquipmentSlot).includes(item.slot as EquipmentSlot) && !newEquippedItems[item.slot as EquipmentSlot]) {
            newEquippedItems[item.slot as EquipmentSlot] = item.id;
          }
        }
      }
    }

    const newGameState: GameState = {
      setup: setupData,
      storyLog: [],
      currentChoices: [],
      currentSummary: "",
      currentWorldEvent: null,
      history: [],
      encyclopedia: [...setupData.entities],
      characterStats: initialStats, 
      inventory: initialInventory,
      equippedItems: newEquippedItems, 
      unlockedAchievements: [],
      characterSkills: setupData.initialSkills || [],
      isInitialStoryGenerated: false,
      isRoleplayModeActive: false,
      npcRelationships: {}, 
      objectives: [], 
      activeSidebarTab: 'stats', 
    };
    setGameState(newGameState);
    setActiveModal(ModalType.None);
    addToast({ message: `Bắt đầu cuộc phiêu lưu mới: "${setupData.name || 'Không tên'}"!`, type: 'success', icon: 'fas fa-play-circle' });
  }, [addToast, getDefaultStats]);

  const handleLoadStory = useCallback((loadedGameState: GameState) => {
     const defaultBaseStats = getDefaultStats();
     const completeGameToLoad: GameState = {
        ...loadedGameState,
        setup: loadedGameState.setup || {
            id: `loaded-${Date.now()}`,
            world: { theme: 'Unknown', context: 'Unknown', tone: 'Unknown' },
            character: { name: 'Unknown', gender: 'Unknown', summary: '', traits: [], goal: '' },
            entities: [],
            createdAt: new Date().toISOString(),
        },
        storyLog: loadedGameState.storyLog || [],
        currentChoices: loadedGameState.currentChoices || [],
        currentSummary: loadedGameState.currentSummary || "",
        currentWorldEvent: loadedGameState.currentWorldEvent || null,
        history: loadedGameState.history || [],
        encyclopedia: loadedGameState.encyclopedia || loadedGameState.setup?.entities || [],
        characterStats: loadedGameState.characterStats || defaultBaseStats, 
        inventory: loadedGameState.inventory || [],
        equippedItems: loadedGameState.equippedItems || {}, 
        unlockedAchievements: loadedGameState.unlockedAchievements || [],
        characterSkills: loadedGameState.characterSkills || [],
        isInitialStoryGenerated: loadedGameState.isInitialStoryGenerated !== undefined ? loadedGameState.isInitialStoryGenerated : (loadedGameState.storyLog && loadedGameState.storyLog.length > 0),
        isRoleplayModeActive: loadedGameState.isRoleplayModeActive || false,
        npcRelationships: loadedGameState.npcRelationships || {}, 
        objectives: loadedGameState.objectives || [], 
        activeSidebarTab: loadedGameState.activeSidebarTab && loadedGameState.activeSidebarTab !== 'actions' ? loadedGameState.activeSidebarTab : 'stats',
    };

    if (!completeGameToLoad.characterStats.progression_level) {
        completeGameToLoad.characterStats.progression_level = defaultBaseStats.progression_level;
    }
    if (!completeGameToLoad.characterStats.spiritual_qi) {
        completeGameToLoad.characterStats.spiritual_qi = defaultBaseStats.spiritual_qi;
    }
    if (!completeGameToLoad.characterStats.intelligence) {
        completeGameToLoad.characterStats.intelligence = defaultBaseStats.intelligence;
    }
    if (!completeGameToLoad.characterStats.constitution) {
        completeGameToLoad.characterStats.constitution = defaultBaseStats.constitution;
    }
    if (!completeGameToLoad.characterStats.agility) {
        completeGameToLoad.characterStats.agility = defaultBaseStats.agility;
    }
    if (!completeGameToLoad.characterStats.luck) {
        completeGameToLoad.characterStats.luck = defaultBaseStats.luck;
    }

    const combatStatKeys: (keyof CharacterStats)[] = ['damage_output', 'attack_speed', 'crit_chance', 'crit_damage_bonus', 'defense_value', 'evasion_chance'];
    combatStatKeys.forEach(key => {
        if (!completeGameToLoad.characterStats[key]) {
            const defaultStat = defaultBaseStats[key];
            if (defaultStat) {
                completeGameToLoad.characterStats[key] = defaultStat;
            }
        }
    });

    setGameState(completeGameToLoad);
    setActiveModal(ModalType.None);
    addToast({ message: `Đã tải game: "${completeGameToLoad.setup.name || 'Game đã lưu'}"!`, type: 'success', icon: 'fas fa-upload' });
  }, [addToast, getDefaultStats]);

  const quitGame = useCallback(() => {
    setGameState(null);
    setActiveModal(ModalType.None);
    addToast({message: "Đã thoát game. Hẹn gặp lại trong một kiếp khác!", type: 'info', icon: 'fas fa-door-open'});
  }, [addToast]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-xl text-primary dark:text-primary-light bg-background-light dark:bg-background-dark p-4">
        <svg className="animate-spin h-12 w-12 text-primary dark:text-primary-light mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="font-semibold">Đang tải ứng dụng...</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Chuẩn bị bước vào thế giới huyền ảo!</p>
      </div>
    );
  }

  const renderModal = () => {
    switch (activeModal) {
      case ModalType.APISettings:
        return <ApiSettingsModal onClose={() => setActiveModal(ModalType.None)} />;
      case ModalType.NSFWSettings:
        return <NsfwSettingsModal onClose={() => setActiveModal(ModalType.None)} />;
      case ModalType.GeneralSettings:
        return <GeneralSettingsModal onClose={() => setActiveModal(ModalType.None)} />;
      case ModalType.Guide:
        return <GuideModal onClose={() => setActiveModal(ModalType.None)} />;
      case ModalType.NewStorySetup:
        return <NewStorySetupModal
                  onClose={() => setActiveModal(ModalType.None)}
                  onStartStory={handleStartNewStory}
                />;
      case ModalType.LoadStory:
        return <LoadStoryModal
                  onClose={() => setActiveModal(ModalType.None)}
                  onLoadStoryFromFile={handleLoadStory}
                />;
      case ModalType.WorldEventCreator:
        return gameState ? <WorldEventCreatorModal
                              onClose={() => setActiveModal(ModalType.None)}
                              gameState={gameState}
                              setGameState={setGameState}
                            /> : null;
      case ModalType.StorySummary:
        return gameState ? <StorySummaryModal
                              onClose={() => setActiveModal(ModalType.None)}
                              storyLog={gameState.storyLog}
                              currentSummary={gameState.currentSummary}
                              setGameState={setGameState}
                              apiKey={userApiKey} // Pass userApiKey from context
                              useDefaultAPI={settings.useDefaultAPI}
                            /> : null;
      case ModalType.Encyclopedia:
        return gameState ? <EncyclopediaModal
                              onClose={() => setActiveModal(ModalType.None)}
                              entries={gameState.encyclopedia}
                            /> : null;
      case ModalType.DeathConfirmation:
        return <DeathConfirmationModal
                  onClose={() => setActiveModal(ModalType.None)}
                  onReincarnate={quitGame}
                />;
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ease-in-out ${settings.theme === 'dark' ? 'dark bg-background-dark text-text-dark' : 'bg-background-light text-text-light'}`}>
      <ToastContainer />
      {renderModal()}
      {gameState ? (
        <GamePage
          gameState={gameState}
          setGameState={setGameState}
          openModal={setActiveModal}
          quitGame={quitGame}
          nsfwSettings={nsfwSettings}
        />
      ) : (
        <HomePage openModal={setActiveModal} />
      )}
    </div>
  );
};

export default App;
