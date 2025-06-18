
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { StoryMessage, GameState } from '../../types';
import { generateStorySummary } from '../../services/GeminiService';

interface StorySummaryModalProps {
  onClose: () => void;
  storyLog: StoryMessage[];
  currentSummary: string;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  apiKey: string;
  useDefaultAPI: boolean;
}

const StorySummaryModal: React.FC<StorySummaryModalProps> = ({ onClose, storyLog, currentSummary, setGameState, apiKey, useDefaultAPI }) => {
  const [summaryText, setSummaryText] = useState(currentSummary);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (storyLog.length < 5) { // Arbitrary threshold for meaningful summary
        setSummaryText("Câu chuyện còn quá ngắn để AI tóm tắt hiệu quả. Hãy tiếp tục phiêu lưu!");
        return;
    }
    setIsLoading(true);
    try {
      const newSummary = await generateStorySummary(apiKey, useDefaultAPI, storyLog);
      setSummaryText(newSummary);
      setGameState(prev => prev ? ({ ...prev, currentSummary: newSummary }) : null);
    } catch (error) {
      console.error("Error generating summary:", error);
      setSummaryText(`Lỗi khi tạo tóm tắt: ${error instanceof Error ? error.message : "Không thể kết nối với AI."}`);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, useDefaultAPI, storyLog]); // Dependencies: storyLog might be too much if it's very long. Consider summarizing less frequently or based on length.

  useEffect(() => {
    if (!currentSummary && storyLog.length > 0) { // Fetch if no summary and there's content
      fetchSummary();
    } else {
        setSummaryText(currentSummary || "Chưa có tóm tắt nào được tạo.");
    }
  }, [currentSummary, storyLog, fetchSummary]);

  // Option to divide summary by chapters/events (not implemented here, requires more complex logic)

  return (
    <Modal isOpen={true} onClose={onClose} title="Tóm Tắt Cốt Truyện" size="lg">
      <div className="max-h-[60vh] overflow-y-auto p-1 mb-4 prose prose-sm sm:prose dark:prose-invert max-w-none text-text-light dark:text-text-dark">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            AI đang tóm tắt...
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{summaryText}</p>
        )}
      </div>
      <div className="mt-6 flex justify-between items-center">
        <Button onClick={fetchSummary} isLoading={isLoading} variant="outline">
          {isLoading ? 'Đang Tải Lại...' : 'Tạo/Làm Mới Tóm Tắt'}
        </Button>
        <Button onClick={onClose}>Đóng</Button>
      </div>
    </Modal>
  );
};

export default StorySummaryModal;
    