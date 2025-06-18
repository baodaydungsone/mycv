
import React, { useState, ChangeEvent } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input'; // For styling file input if needed, or directly use <input type="file">
import { GameState } from '../../types';
import { usePublicToast } from '../../contexts/ToastContext';


interface LoadStoryModalProps {
  onClose: () => void;
  onLoadStoryFromFile: (gameState: GameState) => void;
}

const LoadStoryModal: React.FC<LoadStoryModalProps> = ({ onClose, onLoadStoryFromFile }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const { addToast } = usePublicToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "application/json") {
        setSelectedFile(file);
      } else {
        addToast({ message: "Vui lòng chọn một file .json hợp lệ.", type: 'error' });
        setSelectedFile(null);
        event.target.value = ""; // Reset file input
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleLoadFile = () => {
    if (!selectedFile) {
      addToast({ message: "Vui lòng chọn một file để tải.", type: 'warning' });
      return;
    }

    setIsLoadingFile(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const parsedGameState: GameState = JSON.parse(text);
          // Basic validation of the parsed object
          if (parsedGameState && parsedGameState.setup && parsedGameState.storyLog) {
            onLoadStoryFromFile(parsedGameState);
            // Toast for success will be handled in App.tsx's handleLoadStory
          } else {
            throw new Error("Cấu trúc file save không hợp lệ.");
          }
        } else {
            throw new Error("Không thể đọc nội dung file.");
        }
      } catch (error) {
        console.error("Error loading or parsing game file:", error);
        addToast({ message: `Lỗi khi tải file: ${error instanceof Error ? error.message : "Nội dung file không hợp lệ."}`, type: 'error', duration: 7000 });
      } finally {
        setIsLoadingFile(false);
      }
    };
    reader.onerror = () => {
        addToast({ message: "Lỗi khi đọc file.", type: 'error'});
        setIsLoadingFile(false);
    }
    reader.readAsText(selectedFile);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Tải Game Từ File" size="md">
      <div className="space-y-4">
        <p className="text-text-light dark:text-text-dark">
          Chọn file JSON (.json) đã lưu trước đó để tiếp tục cuộc phiêu lưu của bạn.
        </p>
        
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
            Chọn file save game:
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 dark:text-slate-400
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-md file:border-0
                       file:text-sm file:font-semibold
                       file:bg-primary-light/20 file:text-primary dark:file:bg-primary-dark/30 dark:file:text-primary-light
                       hover:file:bg-primary-light/30 dark:hover:file:bg-primary-dark/40
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-primary-dark"
          />
        </div>

        {selectedFile && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Đã chọn: <span className="font-medium">{selectedFile.name}</span>
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} disabled={isLoadingFile}>
          Hủy
        </Button>
        <Button 
          onClick={handleLoadFile} 
          disabled={!selectedFile || isLoadingFile}
          isLoading={isLoadingFile}
        >
          {isLoadingFile ? "Đang Tải..." : "Tải Game"}
        </Button>
      </div>
    </Modal>
  );
};

export default LoadStoryModal;
