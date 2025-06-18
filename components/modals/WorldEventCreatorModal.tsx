
import React, { useState, useCallback } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Dropdown from '../Dropdown';
import Input from '../Input';
import { GameState, WorldEvent, WorldEventType, WorldEventScope, StoryMessage } from '../../types';
import { generateRandomWithAI } from '../../services/GeminiService';
import { useSettings } from '../../contexts/SettingsContext';
import { LOCAL_STORAGE_API_KEY } from '../../constants';

interface WorldEventCreatorModalProps {
  onClose: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
}

const WorldEventCreatorModal: React.FC<WorldEventCreatorModalProps> = ({ onClose, gameState, setGameState }) => {
  const { settings } = useSettings();
  const [eventType, setEventType] = useState<WorldEventType>(WorldEventType.Random);
  const [eventScope, setEventScope] = useState<WorldEventScope>(WorldEventScope.Regional);
  const [keywords, setKeywords] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [generatedEventPreview, setGeneratedEventPreview] = useState<Partial<WorldEvent> | null>(null);

  const getApiKey = useCallback(() => {
    return settings.useDefaultAPI ? (process.env.API_KEY || '') : (localStorage.getItem(LOCAL_STORAGE_API_KEY) || '');
  }, [settings.useDefaultAPI]);

  const handleGenerateEvent = async () => {
    setIsLoadingAI(true);
    setGeneratedEventPreview(null);
    try {
      const apiKey = getApiKey();
      const storyContext = {
        worldTheme: gameState.setup.world.theme,
        characterName: gameState.setup.character.name,
        recentStory: gameState.storyLog.slice(-5).map(msg => msg.content).join(' '),
      };
      const result = await generateRandomWithAI(apiKey, settings.useDefaultAPI, 'worldEvent', {
        storyContext,
        eventType,
        eventScope,
        keywords,
      });
      if (typeof result === 'string') {
        const parsedEvent = JSON.parse(result);
        setGeneratedEventPreview({
            name: parsedEvent.name,
            description: parsedEvent.description,
            keyElements: parsedEvent.keyElements,
            type: eventType, // ensure type/scope from selection are used
            scope: eventScope,
            status: "active"
        });
      }
    } catch (error) {
      console.error("Error generating world event:", error);
      alert(`Lỗi tạo sự kiện: ${error instanceof Error ? error.message : "Không thể tạo sự kiện"}`);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleAcceptEvent = () => {
    if (!generatedEventPreview || !generatedEventPreview.name || !generatedEventPreview.description) {
        alert("Sự kiện không hợp lệ để thêm vào truyện.");
        return;
    }
    const newWorldEvent: WorldEvent = {
        id: `event-${Date.now()}`,
        name: generatedEventPreview.name,
        type: generatedEventPreview.type || eventType,
        scope: generatedEventPreview.scope || eventScope,
        description: generatedEventPreview.description,
        keyElements: generatedEventPreview.keyElements || [],
        status: 'active',
        timestamp: new Date().toISOString(),
    };

    const eventMessage: StoryMessage = {
        id: `msg-event-${Date.now()}`,
        type: 'event',
        content: `SỰ KIỆN THẾ GIỚI MỚI: ${newWorldEvent.name}\n${newWorldEvent.description}`,
        timestamp: new Date().toISOString(),
    };

    setGameState(prev => {
        if (!prev) return null;
        return {
            ...prev,
            currentWorldEvent: newWorldEvent,
            storyLog: [...prev.storyLog, eventMessage],
        };
    });
    onClose();
  };

  const eventTypeOptions = Object.values(WorldEventType).map(et => ({ value: et, label: et }));
  const eventScopeOptions = Object.values(WorldEventScope).map(es => ({ value: es, label: es }));

  return (
    <Modal isOpen={true} onClose={onClose} title="Tạo Sự Kiện Thế Giới" size="lg">
      <div className="space-y-4">
        <Dropdown
          label="Loại Sự Kiện:"
          options={eventTypeOptions}
          value={eventType}
          onChange={e => setEventType(e.target.value as WorldEventType)}
        />
        <Dropdown
          label="Phạm Vi Ảnh Hưởng:"
          options={eventScopeOptions}
          value={eventScope}
          onChange={e => setEventScope(e.target.value as WorldEventScope)}
        />
        <Input
          label="Từ Khóa Gợi Ý (Tùy chọn):"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="Ví dụ: ma tộc, cổ kiếm, huyết thù..."
        />
        <Button onClick={handleGenerateEvent} isLoading={isLoadingAI} className="w-full">
          {isLoadingAI ? 'AI Đang Tạo...' : 'Khởi Tạo Sự Kiện Bằng AI'}
        </Button>

        {generatedEventPreview && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-700">
            <h4 className="font-semibold text-lg mb-2">Xem Trước Sự Kiện:</h4>
            <p><strong>Tên:</strong> {generatedEventPreview.name}</p>
            <p><strong>Mô tả:</strong> {generatedEventPreview.description}</p>
            {generatedEventPreview.keyElements && generatedEventPreview.keyElements.length > 0 && (
              <p><strong>Yếu tố chính:</strong> {generatedEventPreview.keyElements.join(', ')}</p>
            )}
            <p><strong>Loại:</strong> {generatedEventPreview.type}, <strong>Phạm vi:</strong> {generatedEventPreview.scope}</p>
            <div className="mt-3 flex gap-2">
                <Button onClick={handleAcceptEvent} variant="primary">Chấp Nhận và Đưa Vào Truyện</Button>
                <Button onClick={handleGenerateEvent} variant="outline" isLoading={isLoadingAI}>Tạo Lại</Button>
            </div>
          </div>
        )}
      </div>
       <div className="mt-6 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Đóng</Button>
      </div>
    </Modal>
  );
};

export default WorldEventCreatorModal;
    