
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input';
import Textarea from '../Textarea';
import Dropdown from '../Dropdown';
import { WorldSetup, CharacterSetup, Entity, StorySetupData, WorldTone, CharacterGender, EntityType, CharacterTrait, Skill, SkillProficiency, AIExtractedSetupData, AIRandomGenerationParams } from '../../types';
import { generateRandomWithAI, generateEntitiesFromText, extractFullStorySetupFromText, generateFullRandomStorySetup } from '../../services/GeminiService';
import { useSettings } from '../../contexts/SettingsContext';
import { LOCAL_STORAGE_API_KEY } from '../../constants';
import { usePublicToast } from '../../contexts/ToastContext';

interface NewStorySetupModalProps {
  onClose: () => void;
  onStartStory: (setup: StorySetupData) => void;
}

type SetupMode = 'manualTabs' | 'aiFullExtract' | 'aiRandomCreate';

// Helper to generate a somewhat unique ID for skills/traits if AI doesn't provide
const generateId = (prefix: string, name?: string): string => {
    const randomPart = Math.random().toString(36).substring(2, 7);
    if (name) {
        const namePart = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').substring(0, 15);
        return `${prefix}-${namePart}-${randomPart}`;
    }
    return `${prefix}-${Date.now()}-${randomPart}`;
};


const NewStorySetupModal: React.FC<NewStorySetupModalProps> = ({ onClose, onStartStory }) => {
  const { settings } = useSettings();
  const { addToast } = usePublicToast();
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  const [activeSetupMode, setActiveSetupMode] = useState<SetupMode>('manualTabs');
  const [currentManualStep, setCurrentManualStep] = useState(1); // 1: World, 2: Character, 3: Entities & Skills
  
  const [setupName, setSetupName] = useState(`Thiết lập ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
  const [world, setWorld] = useState<WorldSetup>({ theme: '', context: '', tone: WorldTone.Fantasy, advancedPrompt: '' });
  const [character, setCharacter] = useState<CharacterSetup>({ name: '', gender: CharacterGender.AIDecides, summary: '', traits: [], goal: '', initialSkills: [] });
  const [entities, setEntities] = useState<Entity[]>([]);
  const [newEntity, setNewEntity] = useState<Partial<Entity>>({ type: EntityType.NPC, name: '', description: '' });
  
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({ name: '', description: '', category: 'khác', proficiency: 'Sơ Nhập Môn', xp: 0, xpToNextLevel: 100 });


  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);
  
  const [bulkEntityText, setBulkEntityText] = useState('');
  const [selectedEntityForViewing, setSelectedEntityForViewing] = useState<Entity | null>(null);

  // For "AI Trích Xuất Từ Văn Bản" Tab
  const [fullSetupText, setFullSetupText] = useState('');

  // For "AI Khởi Tạo Ngẫu Nhiên" Tab
  const [aiRandomParams, setAiRandomParams] = useState<AIRandomGenerationParams>({
    userTheme: '',
    userDescription: '',
    numEntities: 5,
  });


  const getApiKey = useCallback(() => {
    return settings.useDefaultAPI ? (process.env.API_KEY || '') : (localStorage.getItem(LOCAL_STORAGE_API_KEY) || '');
  }, [settings.useDefaultAPI]);

  const handleAIGenerate = async (
    fieldType: "theme" | "context" | "tone" | "charName" | "charSummary" | "charGoal" | "traitSuggestion" | "entitySuggestion" | "skillSuggestion",
    currentContext?: any
  ) => {
    setIsLoadingAI(true);
    setActiveSuggestionField(fieldType);
    setAiSuggestions([]);
    try {
      const apiKey = getApiKey();
      const result = await generateRandomWithAI(apiKey, settings.useDefaultAPI, fieldType, currentContext);
      
      if (fieldType === 'traitSuggestion') {
          const traitObjects = result as Array<{name: string, description: string}>;
          if (Array.isArray(traitObjects)) {
            const suggestions = traitObjects.map((item: any) =>  (item.name ? `${item.name} - ${item.description}`: JSON.stringify(item)));
            setAiSuggestions(suggestions);
          }
      } else if (fieldType === 'skillSuggestion') {
          const skillObject = result as Partial<Skill>;
          if (skillObject && skillObject.name) {
              setNewSkill(prev => ({
                  ...prev,
                  name: skillObject.name || '',
                  description: skillObject.description || '',
                  category: skillObject.category || 'khác',
                  icon: skillObject.icon || prev.icon,
                  id: skillObject.id || prev.id || generateId('skill', skillObject.name),
              }));
              addToast({message: `AI gợi ý kỹ năng: ${skillObject.name}`, type: 'info'});
          }
      }
      else if (Array.isArray(result)) {
        setAiSuggestions(result as string[]);
      } else if (typeof result === 'string') {
        if (fieldType === 'charSummary') setCharacter(c => ({ ...c, summary: result }));
        else if (fieldType === 'entitySuggestion') {
            try {
                const parsedEntity = JSON.parse(result);
                setNewEntity(e => ({...e, name: parsedEntity.name, description: parsedEntity.description}));
            } catch (e) { 
                console.error("Error parsing entity suggestion", e); 
                addToast({ message: "Lỗi khi phân tích gợi ý thực thể từ AI.", type: 'error' });
            }
        }
        else setAiSuggestions([result]); 
      }
    } catch (error) {
      console.error(`Error generating ${fieldType}:`, error);
      addToast({ message: `Lỗi tạo gợi ý cho ${fieldType}: ${error instanceof Error ? error.message : "Không thể tạo gợi ý"}`, type: 'error' });
      setAiSuggestions([`Lỗi: ${error instanceof Error ? error.message : "Không thể tạo gợi ý"}`]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const applySuggestion = (suggestion: string, fieldType: string | null) => {
    if (!fieldType) return;
    switch (fieldType) {
      case 'theme': setWorld(w => ({ ...w, theme: suggestion })); break;
      case 'context': setWorld(w => ({ ...w, context: suggestion })); break;
      case 'tone': setWorld(w => ({ ...w, tone: suggestion as WorldTone })); break; 
      case 'charName': setCharacter(c => ({ ...c, name: suggestion })); break;
      case 'charGoal': setCharacter(c => ({...c, goal: suggestion})); break;
    }
    setAiSuggestions([]);
    setActiveSuggestionField(null);
  };
  
  const addTrait = () => {
    setCharacter(c => ({ ...c, traits: [...c.traits, { id: generateId('trait'), name: '', description: '' }] }));
  };
  const updateTrait = (index: number, field: keyof CharacterTrait, value: string) => {
    setCharacter(c => ({ ...c, traits: c.traits.map((t, i) => i === index ? { ...t, [field]: value } : t) }));
  };
  const removeTrait = (index: number) => {
    setCharacter(c => ({ ...c, traits: c.traits.filter((_, i) => i !== index) }));
  };
  
  const handleAIGenerateTrait = async () => {
    setIsLoadingAI(true);
    setActiveSuggestionField('traitSuggestion'); 
    try {
        const apiKey = getApiKey();
        const result = await generateRandomWithAI(apiKey, settings.useDefaultAPI, "traitSuggestion", { 
            charName: character.name, 
            charSummary: character.summary, 
            worldTheme: world.theme 
        });
        
        const suggestedTraits = result as Array<{name: string; description: string}>;
        if (Array.isArray(suggestedTraits) && suggestedTraits.length > 0) {
            const suggestedTrait = suggestedTraits[0]; 
            if(suggestedTrait && typeof suggestedTrait === 'object' && suggestedTrait.name && suggestedTrait.description){
                 setCharacter(c => ({ ...c, traits: [...c.traits, { id: generateId('trait', suggestedTrait.name), name: suggestedTrait.name, description: suggestedTrait.description }] }));
                 addToast({ message: `Đã thêm gợi ý đặc điểm: ${suggestedTrait.name}`, type: 'success' });
            } else {
                console.warn("Suggested trait format incorrect:", suggestedTrait);
                addToast({ message: "Định dạng đặc điểm gợi ý không đúng.", type: 'warning' });
            }
        } else {
            addToast({ message: "AI không tìm thấy gợi ý đặc điểm nào.", type: 'info' });
        }
    } catch (error) { 
        console.error("Error generating trait:", error); 
        addToast({ message: `Lỗi tạo đặc điểm: ${error instanceof Error ? error.message : "Lỗi không xác định"}`, type: 'error' });
    }
    finally { 
        setIsLoadingAI(false); 
        setActiveSuggestionField(null);
    }
  };


  const addEntity = () => {
    if (newEntity.name && newEntity.description && newEntity.type) {
      setEntities(es => [...es, { ...newEntity, id: generateId('entity', newEntity.name) } as Entity]);
      setNewEntity({ type: EntityType.NPC, name: '', description: '' });
      addToast({ message: `Đã thêm thực thể: ${newEntity.name}`, type: 'success' });
    } else {
      addToast({ message: "Vui lòng nhập đủ Tên, Mô tả và Loại cho thực thể.", type: 'warning' });
    }
  };
  const removeEntity = (id: string) => {
    const entityToRemove = entities.find(e => e.id === id);
    setEntities(es => es.filter(e => e.id !== id));
    if (selectedEntityForViewing?.id === id) {
        setSelectedEntityForViewing(null);
    }
    if (entityToRemove) {
      addToast({ message: `Đã xóa thực thể: ${entityToRemove.name}`, type: 'info' });
    }
  };

  const handleBulkAddEntities = async () => {
      if (!bulkEntityText.trim()) {
          addToast({ message: "Vui lòng nhập văn bản để AI phân tích.", type: 'warning'});
          return;
      }
      setIsLoadingAI(true);
      setActiveSuggestionField('bulkEntities');
      try {
        const apiKey = getApiKey();
        const extractedEntities = await generateEntitiesFromText(apiKey, settings.useDefaultAPI, bulkEntityText, world.theme);

        if (extractedEntities && extractedEntities.length > 0) {
          const newEntitiesToAdd = extractedEntities.map(e => ({
            ...e,
            id: generateId('entity', e.name)
          }));
          setEntities(prev => [...prev, ...newEntitiesToAdd]);
          setBulkEntityText(''); 
          addToast({ message: `${newEntitiesToAdd.length} thực thể đã được thêm từ văn bản.`, type: 'success' });
        } else {
          addToast({ message: "Không tìm thấy thực thể nào trong văn bản hoặc có lỗi xảy ra.", type: 'info' });
        }
      } catch (error) {
        console.error("Error processing bulk entities:", error);
        addToast({ message: `Lỗi khi xử lý thực thể từ văn bản: ${error instanceof Error ? error.message : "Lỗi không xác định"}`, type: 'error' });
      } finally {
        setIsLoadingAI(false);
        setActiveSuggestionField(null);
      }
    };

  const addSkill = () => {
    if (newSkill.name && newSkill.description) {
        const skillToAdd: Skill = {
            id: newSkill.id || generateId('skill', newSkill.name),
            name: newSkill.name,
            description: newSkill.description,
            icon: newSkill.icon || 'fas fa-star',
            category: newSkill.category || 'khác',
            proficiency: newSkill.proficiency || 'Sơ Nhập Môn',
            xp: newSkill.xp || 0,
            xpToNextLevel: newSkill.xpToNextLevel || 100,
            effects: newSkill.effects || [],
        };
        setCharacter(c => ({ ...c, initialSkills: [...(c.initialSkills || []), skillToAdd] }));
        setNewSkill({ name: '', description: '', category: 'khác', proficiency: 'Sơ Nhập Môn', xp: 0, xpToNextLevel: 100 }); // Reset
        addToast({ message: `Đã thêm kỹ năng: ${skillToAdd.name}`, type: 'success' });
    } else {
        addToast({ message: "Vui lòng nhập Tên và Mô tả cho kỹ năng.", type: 'warning' });
    }
  };
  const removeSkill = (id: string) => {
      const skillToRemove = character.initialSkills?.find(s => s.id === id);
      setCharacter(c => ({ ...c, initialSkills: (c.initialSkills || []).filter(s => s.id !== id) }));
      if (skillToRemove) {
          addToast({message: `Đã xóa kỹ năng: ${skillToRemove.name}`, type: 'info'});
      }
  };
  
  const parseRawTraits = (rawTraits?: string[]): CharacterTrait[] => {
    if (!rawTraits) return [];
    return rawTraits.map(rt => {
        const parts = rt.split(/: (.+)/s); // Split on the first colon followed by a space
        const name = parts[0]?.trim();
        const description = parts[1]?.trim();
        return { id: generateId('trait', name), name: name || "Đặc điểm không tên", description: description || "Chưa có mô tả" };
    }).filter(t => t.name !== "Đặc điểm không tên");
  };

  const parseRawSkills = (rawSkills?: string[]): Skill[] => {
    if (!rawSkills) return [];
    return rawSkills.map(rs => {
        const mainParts = rs.split(/: (.+)/s); // Split on the first colon followed by a space
        const name = mainParts[0]?.trim();
        let descriptionAndMeta = mainParts[1]?.trim() || "";
        
        let description = descriptionAndMeta;
        let category: Skill['category'] = 'khác';
        let icon: string | undefined = 'fas fa-book-sparkles';

        const metaMatch = descriptionAndMeta.match(/\(([^)]+)\)$/); // Matches content in trailing parentheses
        if (metaMatch && metaMatch[1]) {
            const metaContent = metaMatch[1];
            description = descriptionAndMeta.substring(0, metaMatch.index).trim(); // Text before parentheses

            const categoryMatch = metaContent.match(/Loại:\s*([^,)]+)/i);
            if (categoryMatch && categoryMatch[1]) {
                const parsedCategory = categoryMatch[1].trim().toLowerCase() as Skill['category'];
                if (['chiến đấu', 'chế tạo', 'sinh tồn', 'phép thuật', 'hỗ trợ', 'khác'].includes(parsedCategory)) {
                    category = parsedCategory;
                }
            }
            
            const iconMatch = metaContent.match(/Icon:\s*([^,)]+)/i);
            if (iconMatch && iconMatch[1]) {
                icon = iconMatch[1].trim();
            }
        }
        
        return { 
            id: generateId('skill', name), 
            name: name || "Kỹ năng không tên", 
            description: description || "Chưa có mô tả chi tiết.",
            category,
            icon,
            proficiency: 'Sơ Nhập Môn' as SkillProficiency,
            xp: 0,
            xpToNextLevel: 100,
            effects: []
        };
    }).filter(s => s.name !== "Kỹ năng không tên");
  };

  const parseRawEntities = (rawEntities?: Array<{ name?: string; type?: string; description?: string }>): Entity[] => {
    if (!rawEntities) return [];
    return rawEntities.map(re => {
        const typeString = re.type || EntityType.Other;
        const entityType = Object.values(EntityType).find(et => et.toLowerCase() === typeString.toLowerCase()) || EntityType.Other;
        return {
            id: generateId('entity', re.name),
            name: re.name || "Thực thể không tên",
            type: entityType,
            description: re.description || "Chưa có mô tả."
        };
    }).filter(e => e.name !== "Thực thể không tên");
  };
  
  const populateSetupFromAIExtraction = (extractedData: AIExtractedSetupData, sourceTextForAdvancedPrompt?: string) => {
      let extractionMessages: string[] = [];

      if (extractedData.story_setup_name) {
          setSetupName(extractedData.story_setup_name);
          extractionMessages.push("Tên thiết lập");
      }
      
      let worldAdvancedPromptUpdate = sourceTextForAdvancedPrompt ? sourceTextForAdvancedPrompt.trim() : world.advancedPrompt;

      if (extractedData.world_setup) {
          const ws = extractedData.world_setup;
          setWorld(prev => ({
              ...prev,
              theme: ws.theme || prev.theme,
              context: ws.context || prev.context,
              tone: Object.values(WorldTone).find(wt => wt.toLowerCase() === ws.tone?.toLowerCase()) || ws.tone || prev.tone,
              advancedPrompt: sourceTextForAdvancedPrompt ? worldAdvancedPromptUpdate : (ws.advanced_prompt || prev.advancedPrompt)
          }));
          extractionMessages.push("Thông tin thế giới");
      } else if (sourceTextForAdvancedPrompt && worldAdvancedPromptUpdate) {
          setWorld(prev => ({ ...prev, advancedPrompt: worldAdvancedPromptUpdate }));
           extractionMessages.push("Prompt nâng cao (từ mô tả)");
      }


      if (extractedData.character_setup) {
          const cs = extractedData.character_setup;
          const parsedTraits = parseRawTraits(cs.traits_raw);
          const parsedSkills = parseRawSkills(cs.initial_skills_raw);
          setCharacter(prev => ({
              ...prev,
              name: cs.name || prev.name,
              gender: Object.values(CharacterGender).find(cg => cg.toLowerCase() === cs.gender?.toLowerCase()) || cs.gender || prev.gender,
              summary: cs.summary || prev.summary,
              goal: cs.goal || prev.goal,
              traits: parsedTraits.length > 0 ? parsedTraits : prev.traits,
              initialSkills: parsedSkills.length > 0 ? parsedSkills : prev.initialSkills
          }));
          extractionMessages.push("Thông tin nhân vật" + (parsedTraits.length > 0 ? ", đặc điểm" : "") + (parsedSkills.length > 0 ? ", kỹ năng ban đầu" : ""));
      }
      if (extractedData.entities_raw) {
          const parsedEntities = parseRawEntities(extractedData.entities_raw);
          if (parsedEntities.length > 0) {
              setEntities(parsedEntities);
              extractionMessages.push(`${parsedEntities.length} thực thể ban đầu`);
          }
      }

      if (extractionMessages.length > 0) {
          addToast({ message: `AI đã trích xuất: ${extractionMessages.join(', ')}. Hãy kiểm tra và chỉnh sửa nếu cần.`, type: 'success', duration: 10000 });
          setActiveSetupMode('manualTabs'); // Switch to manual tabs for review
          setCurrentManualStep(1);
      } else {
          addToast({ message: "AI không trích xuất được nhiều thông tin từ mô tả. Vui lòng thử mô tả chi tiết hơn hoặc điền thủ công.", type: 'info', duration: 8000 });
      }
  };


  const handleExtractAllFromAI = async () => {
    if (!fullSetupText.trim()) {
        addToast({ message: "Vui lòng nhập mô tả vào ô bên trên để AI trích xuất.", type: 'warning' });
        return;
    }
    setIsLoadingAI(true);
    setActiveSuggestionField('extractAll');
    try {
        const apiKey = getApiKey();
        const extractedData = await extractFullStorySetupFromText(apiKey, settings.useDefaultAPI, fullSetupText);
        populateSetupFromAIExtraction(extractedData, fullSetupText);
    } catch (error) {
        console.error("Error extracting all settings from AI:", error);
        addToast({ message: `Lỗi khi AI trích xuất thiết lập: ${error instanceof Error ? error.message : "Lỗi không xác định"}`, type: 'error' });
    } finally {
        setIsLoadingAI(false);
        setActiveSuggestionField(null);
    }
  };

  const handleRandomCreateAllFromAI = async () => {
    if (!aiRandomParams.userTheme && !aiRandomParams.userDescription) {
        addToast({ message: "Vui lòng nhập ít nhất Chủ đề hoặc Mô tả ngắn để AI có cơ sở tạo ngẫu nhiên.", type: 'warning', duration: 7000});
        return;
    }
     if (aiRandomParams.numEntities <= 0 || aiRandomParams.numEntities > 500) { 
        addToast({ message: "Số lượng thực thể phải từ 1 đến 500.", type: 'warning'});
        return;
    }
    setIsLoadingAI(true);
    setActiveSuggestionField('randomCreateAll');
    try {
        const apiKey = getApiKey();
        const extractedData = await generateFullRandomStorySetup(apiKey, settings.useDefaultAPI, aiRandomParams);
        populateSetupFromAIExtraction(extractedData); // No source text needed as advanced prompt comes from AI
         addToast({ message: "AI đã hoàn tất khởi tạo ngẫu nhiên! Hãy chuyển qua tab 'Thiết Lập Thủ Công & Tinh Chỉnh' để xem và sửa đổi.", type: 'success', duration: 12000 });

    } catch (error) {
        console.error("Error with AI random full generation:", error);
        addToast({ message: `Lỗi khi AI khởi tạo ngẫu nhiên: ${error instanceof Error ? error.message : "Lỗi không xác định"}`, type: 'error' });
    } finally {
        setIsLoadingAI(false);
        setActiveSuggestionField(null);
    }
  };
  
  const handleStartAdventure = () => {
    if (!world.theme || !world.context || !character.name || !character.summary || !character.goal) {
        addToast({ message: "Vui lòng điền đầy đủ các trường thông tin bắt buộc cho Thế Giới và Nhân Vật trong tab 'Thiết Lập Thủ Công & Tinh Chỉnh'.", type: "warning", duration: 7000});
        setActiveSetupMode('manualTabs'); // Switch to manual tab if validation fails
        if (!world.theme || !world.context) setCurrentManualStep(1);
        else if (!character.name || !character.summary || !character.goal) setCurrentManualStep(2);
        return;
    }
    const finalSetup: StorySetupData = {
      id: generateId('setup'),
      name: setupName.trim() || `Cuộc phiêu lưu của ${character.name || 'Nhân vật không tên'}`,
      world,
      character, 
      entities,
      createdAt: new Date().toISOString(),
      initialSkills: character.initialSkills 
    };
    onStartStory(finalSetup);
  };


  const worldToneOptions = Object.values(WorldTone).map(tone => ({ value: tone, label: tone }));
  const genderOptions = Object.values(CharacterGender).map(gender => ({ value: gender, label: gender }));
  const entityTypeOptions = Object.values(EntityType).map(type => ({ value: type, label: type }));
  const skillCategoryOptions = ['chiến đấu', 'chế tạo', 'sinh tồn', 'phép thuật', 'hỗ trợ', 'khác'].map(c => ({value: c, label: c.charAt(0).toUpperCase() + c.slice(1)}));


  const renderSuggestions = () => {
    if (aiSuggestions.length === 0 || !activeSuggestionField) return null;
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow">
        <h4 className="text-sm font-semibold mb-1">Gợi ý từ AI cho "{activeSuggestionField}":</h4>
        <ul className="list-disc list-inside max-h-32 overflow-y-auto">
          {aiSuggestions.map((s, i) => (
            <li key={i} 
                className="text-xs p-1 hover:bg-primary-light hover:text-white dark:hover:bg-primary-dark rounded cursor-pointer"
                onClick={() => applySuggestion(s, activeSuggestionField)}>
              {s}
            </li>
          ))}
        </ul>
        <Button size="sm" variant="ghost" onClick={() => { setAiSuggestions([]); setActiveSuggestionField(null);}} className="mt-1 text-xs">Đóng gợi ý</Button>
      </div>
    );
  };
  
  const totalManualSteps = 3; 

  const getTabClass = (mode: SetupMode) => {
    return `px-4 py-2.5 text-sm font-medium rounded-t-md focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary dark:focus:ring-primary-light transition-colors duration-150
            ${activeSetupMode === mode 
                ? 'bg-card-light dark:bg-card-dark border-t border-x border-border-light dark:border-border-dark text-primary dark:text-primary-light shadow-sm' 
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-b border-border-light dark:border-border-dark'
            }`;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Khởi Tạo Mới - ${setupName || 'Chưa đặt tên'}`} size="xl">
      <div className="flex mb-0 -mx-6 px-2 border-b border-border-light dark:border-border-dark">
        <button className={getTabClass('aiRandomCreate')} onClick={() => setActiveSetupMode('aiRandomCreate')}>
          <i className="fas fa-random mr-2"></i>A.I Khởi Tạo Ngẫu Nhiên
        </button>
        <button className={getTabClass('aiFullExtract')} onClick={() => setActiveSetupMode('aiFullExtract')}>
          <i className="fas fa-magic-sparkles mr-2"></i>AI Trích Xuất Từ Văn Bản
        </button>
        <button className={getTabClass('manualTabs')} onClick={() => setActiveSetupMode('manualTabs')}>
          <i className="fas fa-tools mr-2"></i>Thiết Lập Thủ Công & Tinh Chỉnh {activeSetupMode === 'manualTabs' && `(${currentManualStep}/${totalManualSteps})`}
        </button>
      </div>
      
      <div className="pt-5"> {/* Content area for tabs */}
        {activeSetupMode === 'aiFullExtract' && (
             <div className="p-3 border-dashed border-primary/50 dark:border-primary-light/50 rounded-lg bg-primary/5 dark:bg-primary-dark/10">
                <h3 className="text-md font-semibold text-primary dark:text-primary-light mb-2">
                    <i className="fas fa-file-alt mr-2"></i>Trích Xuất Toàn Bộ Thiết Lập Từ Văn Bản
                </h3>
                <Textarea
                    label="Dán hoặc viết mô tả toàn bộ thiết lập mong muốn của bạn tại đây (thế giới, nhân vật, thực thể ban đầu, kỹ năng ban đầu...):"
                    value={fullSetupText}
                    onChange={e => setFullSetupText(e.target.value)}
                    rows={8}
                    placeholder="Ví dụ: Tạo một thế giới tiên hiệp tên 'Cửu Châu Lục'. Nhân vật chính tên Lý Phi Dương, nam, một thiếu niên bình thường tình cờ nhặt được bí kíp võ công 'Hỗn Nguyên Công'. Mục tiêu của cậu là trở thành cường giả mạnh nhất. Đặc điểm: 'Thiên Sinh Thần Lực: Sức mạnh hơn người thường'. Kỹ năng ban đầu: 'Hỗn Nguyên Công: Công pháp tu luyện nội lực cơ bản (Loại: Phép thuật, Icon: fas fa-fire)'. NPC ban đầu: 'Lão Ăn Mày: một người bí ẩn, hay giúp đỡ Lý Phi Dương (NPC)'. ..."
                    wrapperClass="mb-2"
                />
                <Button
                    onClick={handleExtractAllFromAI}
                    isLoading={isLoadingAI && activeSuggestionField === 'extractAll'}
                    disabled={isLoadingAI || !fullSetupText.trim()}
                    className="w-full"
                    variant="secondary"
                >
                    <i className="fas fa-wand-magic-sparkles mr-2"></i>Để AI Trích Xuất Thiết Lập Từ Mô Tả Trên
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">AI sẽ cố gắng điền các thông tin vào tab 'Thiết Lập Thủ Công & Tinh Chỉnh'. Bạn có thể kiểm tra và chỉnh sửa sau.</p>
            </div>
        )}

        {activeSetupMode === 'aiRandomCreate' && (
            <div className="p-3 border-dashed border-blue-500/50 dark:border-blue-400/50 rounded-lg bg-blue-500/5 dark:bg-blue-400/10 space-y-4">
                <h3 className="text-md font-semibold text-blue-600 dark:text-blue-300 mb-2">
                    <i className="fas fa-dice-d20 mr-2"></i>Để AI Sáng Tạo Toàn Bộ Thế Giới Ngẫu Nhiên
                </h3>
                <Input 
                    label="Chủ đề gợi ý cho AI (Tùy chọn):" 
                    value={aiRandomParams.userTheme} 
                    onChange={e => setAiRandomParams(p => ({...p, userTheme: e.target.value}))}
                    placeholder="Ví dụ: Tiên hiệp báo thù, Đô thị dị năng, Cổ đại cung đấu..."
                />
                <Textarea 
                    label="Mô tả ngắn gọn về ý tưởng chính (Tùy chọn):" 
                    value={aiRandomParams.userDescription}
                    onChange={e => setAiRandomParams(p => ({...p, userDescription: e.target.value}))}
                    rows={3}
                    placeholder="Ví dụ: Một thế giới tu tiên nơi kẻ yếu bị chà đạp, nhân vật chính từ đáy vực vươn lên. Hoặc một câu chuyện tình yêu vượt thời gian..."
                />
                <Input 
                    label="Số lượng thực thể AI cần tạo (NPC, địa điểm, vật phẩm...):" 
                    type="number"
                    value={aiRandomParams.numEntities.toString()}
                    min="1" max="500"
                    onChange={e => setAiRandomParams(p => ({...p, numEntities: parseInt(e.target.value, 10) || 5}))}
                />
                <Button
                    onClick={handleRandomCreateAllFromAI}
                    isLoading={isLoadingAI && activeSuggestionField === 'randomCreateAll'}
                    disabled={isLoadingAI || (!aiRandomParams.userTheme.trim() && !aiRandomParams.userDescription.trim())}
                    className="w-full"
                    variant="primary"
                >
                    <i className="fas fa-brain mr-2"></i>Để AI Khởi Tạo Toàn Bộ Thế Giới
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">AI sẽ tạo ra một thiết lập đồ sộ, chi tiết dựa trên gợi ý của bạn (nếu có). Sau đó, bạn có thể xem và tinh chỉnh trong tab 'Thiết Lập Thủ Công & Tinh Chỉnh'.</p>
            </div>
        )}

        {activeSetupMode === 'manualTabs' && (
          <>
          <Input label="Tên Cuộc Phiêu Lưu / Cấu Hình:" value={setupName} onChange={e => setSetupName(e.target.value)} placeholder="Ví dụ: Thế giới Tiên hiệp của tôi"/>
          <hr className="my-4"/>
          {currentManualStep === 1 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-2 text-primary dark:text-primary-light">1. Thiết Lập Thế Giới <span className="text-red-500">*</span></h3>
              <div className="flex items-end gap-2">
                <Input wrapperClass="flex-grow" label="Chủ đề (*):" value={world.theme} onChange={e => setWorld({ ...world, theme: e.target.value })} />
                <Button size="sm" onClick={() => handleAIGenerate('theme')} isLoading={isLoadingAI && activeSuggestionField === 'theme'}>AI</Button>
              </div>
              {activeSuggestionField === 'theme' && renderSuggestions()}

              <div className="flex items-end gap-2">
                <Textarea wrapperClass="flex-grow" label="Bối cảnh (*):" value={world.context} onChange={e => setWorld({ ...world, context: e.target.value })} />
                <Button size="sm" onClick={() => handleAIGenerate('context', {theme: world.theme})} isLoading={isLoadingAI && activeSuggestionField === 'context'}>AI</Button>
              </div>
              {activeSuggestionField === 'context' && renderSuggestions()}

              <div className="flex items-end gap-2">
                <Dropdown wrapperClass="flex-grow" label="Phong cách/Giọng văn (*):" options={worldToneOptions} value={world.tone} onChange={e => setWorld({ ...world, tone: e.target.value as WorldTone })} />
                <Button size="sm" onClick={() => handleAIGenerate('tone', {theme: world.theme})} isLoading={isLoadingAI && activeSuggestionField === 'tone'}>AI</Button>
              </div>
              {activeSuggestionField === 'tone' && renderSuggestions()}
              
              <Textarea label="Prompt Nâng Cao (Tùy chọn):" value={world.advancedPrompt || ''} onChange={e => setWorld({ ...world, advancedPrompt: e.target.value })} placeholder="Luật lệ thế giới, phe phái, lịch sử tóm tắt..." rows={4}/>
              <Button size="sm" variant="ghost" onClick={() => addToast({message: "Ví dụ Prompt nâng cao:\n- Thế giới này có 3 mặt trăng, mỗi mặt trăng mang một loại năng lượng khác nhau.\n- Các tu sĩ hấp thụ năng lượng mặt trăng để tu luyện, chia thành 3 trường phái chính.\n- Có một lời tiên tri cổ về ngày 3 mặt trăng thẳng hàng...", type: 'info', duration: 10000})}>Xem gợi ý prompt</Button>
            </div>
          )}

          {currentManualStep === 2 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-2 text-primary dark:text-primary-light">2. Thiết Lập Nhân Vật Chính <span className="text-red-500">*</span></h3>
              <div className="flex items-end gap-2">
                <Input wrapperClass="flex-grow" label="Tên nhân vật (*):" value={character.name} onChange={e => setCharacter({ ...character, name: e.target.value })} />
                <Button size="sm" onClick={() => handleAIGenerate('charName', {worldTheme: world.theme, worldContext: world.context})} isLoading={isLoadingAI && activeSuggestionField === 'charName'}>AI</Button>
              </div>
              {activeSuggestionField === 'charName' && renderSuggestions()}
              
              <Dropdown label="Giới tính (*):" options={genderOptions} value={character.gender} onChange={e => setCharacter({ ...character, gender: e.target.value as CharacterGender })} />
              
              <div className="flex items-end gap-2">
                <Textarea wrapperClass="flex-grow" label="Sơ lược (Ngoại hình, Tính cách, Nguồn gốc) (*):" value={character.summary} onChange={e => setCharacter({ ...character, summary: e.target.value })} />
                <Button size="sm" onClick={() => handleAIGenerate('charSummary', {charName: character.name, charGender: character.gender, worldTheme: world.theme})} isLoading={isLoadingAI && activeSuggestionField === 'charSummary'}>AI Tạo Sơ Lược</Button>
              </div>

              <div className="flex items-end gap-2">
                <Input wrapperClass="flex-grow" label="Mục tiêu/Động lực của nhân vật (*):" value={character.goal} onChange={e => setCharacter({ ...character, goal: e.target.value })} />
                <Button size="sm" onClick={() => handleAIGenerate('charGoal', {charName: character.name, charSummary: character.summary})} isLoading={isLoadingAI && activeSuggestionField === 'charGoal'}>AI</Button>
              </div>
              {activeSuggestionField === 'charGoal' && renderSuggestions()}

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Đặc điểm (Thiên phú/Kỹ năng đặc biệt/Vật phẩm khởi đầu...):</label>
                {character.traits.map((trait, index) => (
                  <div key={trait.id} className="flex gap-2 mb-2 items-center p-2 border rounded-md border-border-light dark:border-border-dark">
                    <Input wrapperClass="flex-grow !mb-0" placeholder="Tên đặc điểm" value={trait.name} onChange={e => updateTrait(index, 'name', e.target.value)} />
                    <Textarea wrapperClass="flex-grow !mb-0" placeholder="Mô tả ngắn" value={trait.description} rows={1} onChange={e => updateTrait(index, 'description', e.target.value)} />
                    <Button size="sm" variant="danger" onClick={() => removeTrait(index)}><i className="fas fa-trash"></i></Button>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                    <Button size="sm" variant="outline" onClick={addTrait}>Thêm Đặc Điểm</Button>
                    <Button size="sm" variant="outline" onClick={handleAIGenerateTrait} isLoading={isLoadingAI && activeSuggestionField === 'traitSuggestion'}>AI Gợi Ý Đặc Điểm</Button>
                </div>
              </div>
            </div>
          )}

          {currentManualStep === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                <h3 className="text-lg font-semibold mb-2 text-primary dark:text-primary-light">3a. Thêm Thực Thể/Đối Tượng (Tùy chọn)</h3>
                <div className="p-3 border rounded-md border-border-light dark:border-border-dark space-y-2">
                    <h4 className="text-md font-medium">Thêm mới thủ công:</h4>
                    <Dropdown label="Loại thực thể:" options={entityTypeOptions} value={newEntity.type || EntityType.NPC} onChange={e => setNewEntity({ ...newEntity, type: e.target.value as EntityType })} />
                    <div className="flex items-end gap-2">
                    <Input wrapperClass="flex-grow" label="Từ khóa/Tên thực thể:" value={newEntity.name || ''} onChange={e => setNewEntity({ ...newEntity, name: e.target.value })} />
                    <Button size="sm" onClick={() => handleAIGenerate('entitySuggestion', {worldTheme: world.theme, entityType: newEntity.type})} isLoading={isLoadingAI && activeSuggestionField === 'entitySuggestion'}>AI</Button>
                    </div>
                    <Textarea label="Mô tả chi tiết:" value={newEntity.description || ''} onChange={e => setNewEntity({ ...newEntity, description: e.target.value })} />
                    <Button onClick={addEntity} disabled={!newEntity.name || !newEntity.description}>Thêm Thực Thể Thủ Công</Button>
                </div>

                <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark">
                    <h4 className="text-md font-medium mb-2">Hoặc Thêm Nhiều Thực Thể Từ Văn Bản:</h4>
                    <Textarea
                    label="Nhập đoạn văn bản mô tả các thực thể:"
                    value={bulkEntityText}
                    onChange={e => setBulkEntityText(e.target.value)}
                    rows={4}
                    placeholder="Ví dụ: Lão Trương là một thợ rèn già ở làng Hoà Bình, ông ta giữ một thanh bảo kiếm tên là Hỏa Long. Ngọn núi phía bắc làng, Tử Vong Sơn, là nơi ở của Hắc Phong Hội..."
                    />
                    <Button
                    onClick={handleBulkAddEntities}
                    isLoading={isLoadingAI && activeSuggestionField === 'bulkEntities'}
                    disabled={isLoadingAI || !bulkEntityText.trim()}
                    className="w-full mt-2"
                    >
                    AI Trích Xuất Thực Thể Từ Văn Bản
                    </Button>
                </div>

                {entities.length > 0 && (
                    <div className="mt-4">
                    <h4 className="text-md font-medium mb-1">Danh sách thực thể đã thêm ({entities.length}):</h4>
                    <ul className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                        {entities.map(entity => (
                        <li
                            key={entity.id}
                            className={`p-2 border rounded-md cursor-pointer flex justify-between items-center ${selectedEntityForViewing?.id === entity.id ? 'bg-primary-light/20 dark:bg-primary-dark/30 ring-1 ring-primary' : 'bg-gray-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            onClick={() => setSelectedEntityForViewing(entity)}
                            title="Nhấn để xem chi tiết"
                        >
                            <div className="flex-grow">
                            <strong className="text-sm">{entity.name}</strong> <span className="text-xs text-gray-500 dark:text-gray-400">({entity.type})</span>
                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{entity.description}</p>
                            </div>
                            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); removeEntity(entity.id); }} className="ml-2 flex-shrink-0"><i className="fas fa-trash"></i></Button>
                        </li>
                        ))}
                    </ul>
                    {selectedEntityForViewing && (
                        <div className="mt-3 p-3 border rounded-md bg-white dark:bg-gray-900 shadow-lg">
                        <div className="flex justify-between items-start">
                            <h5 className="font-semibold text-primary dark:text-primary-light">{selectedEntityForViewing.name} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({selectedEntityForViewing.type})</span></h5>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedEntityForViewing(null)} className="text-xs -mt-1 -mr-1">&times; Đóng</Button>
                        </div>
                        <p className="text-sm whitespace-pre-wrap mt-1 max-h-24 overflow-y-auto">{selectedEntityForViewing.description}</p>
                        </div>
                    )}
                    </div>
                )}
                </div>
                
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold mb-2 text-primary dark:text-primary-light">3b. Kỹ Năng Khởi Đầu (Tùy chọn)</h3>
                    <div className="p-3 border rounded-md border-border-light dark:border-border-dark space-y-2">
                        <div className="flex items-end gap-2">
                            <Input wrapperClass="flex-grow" label="Tên Kỹ Năng:" value={newSkill.name || ''} onChange={e => setNewSkill({ ...newSkill, name: e.target.value })} />
                            <Button size="sm" onClick={() => handleAIGenerate('skillSuggestion', {worldTheme: world.theme, charName: character.name})} isLoading={isLoadingAI && activeSuggestionField === 'skillSuggestion'}>AI</Button>
                        </div>
                        <Textarea label="Mô Tả Kỹ Năng:" value={newSkill.description || ''} rows={2} onChange={e => setNewSkill({ ...newSkill, description: e.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                            <Dropdown label="Loại Kỹ Năng:" options={skillCategoryOptions} value={newSkill.category} onChange={e => setNewSkill({ ...newSkill, category: e.target.value as Skill['category'] })} />
                            <Input label="Icon (Font Awesome):" value={newSkill.icon || ''} onChange={e => setNewSkill({ ...newSkill, icon: e.target.value })} placeholder="fas fa-sword" />
                        </div>
                        <Button onClick={addSkill} disabled={!newSkill.name || !newSkill.description}>Thêm Kỹ Năng</Button>
                    </div>
                    
                    {(character.initialSkills && character.initialSkills.length > 0) && (
                        <div className="mt-4">
                        <h4 className="text-md font-medium mb-1">Kỹ năng đã thêm ({character.initialSkills.length}):</h4>
                        <ul className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                            {character.initialSkills.map(skill => (
                            <li key={skill.id} className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                                <div>
                                <strong className="text-sm">{skill.name}</strong> <span className="text-xs text-gray-500 dark:text-gray-400">({skill.category})</span>
                                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{skill.description}</p>
                                </div>
                                <Button size="sm" variant="danger" onClick={() => removeSkill(skill.id)} className="ml-2 flex-shrink-0"><i className="fas fa-trash"></i></Button>
                            </li>
                            ))}
                        </ul>
                        </div>
                    )}
                </div>
            </div>
          )}
          </>
        )}
      </div>


      <div className="mt-8 pt-4 border-t border-border-light dark:border-border-dark flex justify-between items-center">
        <div>
          {activeSetupMode === 'manualTabs' && currentManualStep > 1 && <Button variant="outline" onClick={() => setCurrentManualStep(s => s - 1)}>Quay Lại</Button>}
        </div>
        <div className="flex gap-3 items-center">
           {activeSetupMode === 'manualTabs' && currentManualStep < totalManualSteps && <Button onClick={() => setCurrentManualStep(s => s + 1)}>Tiếp Theo</Button>}
           <Button 
                variant="primary" 
                onClick={handleStartAdventure} 
                isLoading={isLoadingAI && activeSuggestionField !== 'bulkEntities' && activeSuggestionField !== 'skillSuggestion' && activeSuggestionField !== 'entitySuggestion' && activeSuggestionField !== 'extractAll' && activeSuggestionField !== 'randomCreateAll'}
            >
            <i className="fas fa-wand-sparkles mr-2"></i>Khởi Tạo Cuộc Phiêu Lưu
           </Button>
        </div>
      </div>
       <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Lưu ý: Để khởi tạo, các trường có dấu (*) trong tab "Thiết Lập Thủ Công" phải được điền đầy đủ.</p>
    </Modal>
  );
};

export default NewStorySetupModal;
