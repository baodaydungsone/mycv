
import React, { useState } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Checkbox from '../Checkbox';
import RadioGroup from '../RadioGroup';
import Textarea from '../Textarea'; 
import { useSettings } from '../../contexts/SettingsContext';
import { NSFWPreferences } from '../../types';

interface NsfwSettingsModalProps {
  onClose: () => void;
}

const NsfwSettingsModal: React.FC<NsfwSettingsModalProps> = ({ onClose }) => {
  const { nsfwSettings, setNsfwSettings } = useSettings();
  const [showWarning, setShowWarning] = useState(!nsfwSettings.enabled); 
  const [tempNsfwPrefs, setTempNsfwPrefs] = useState<NSFWPreferences>({
    ...nsfwSettings,
    customPrompt: nsfwSettings.customPrompt || '', 
  });

  const handleSave = () => {
    setNsfwSettings(tempNsfwPrefs);
    onClose();
  };

  const handleAgreeWarning = () => {
    setShowWarning(false);
    if (!tempNsfwPrefs.enabled) {
      setTempNsfwPrefs(prev => ({
        ...prev,
        enabled: true,
        eroticaLevel: prev.eroticaLevel === 'none' ? 'medium' : prev.eroticaLevel,
        violenceLevel: prev.violenceLevel === 'none' ? 'medium' : prev.violenceLevel,
        darkContentLevel: prev.darkContentLevel === 'none' ? 'medium' : prev.darkContentLevel,
        customPrompt: prev.customPrompt || '',
      }));
    }
  };
  
  const levelOptions: { value: NSFWPreferences['eroticaLevel'], label: string, description?: string }[] = [
    { value: 'none', label: 'Tắt Hoàn Toàn', description: 'Không có nội dung nhạy cảm.' },
    { value: 'medium', label: 'Trung Bình', description: 'Mô tả gợi ý, không đi sâu chi tiết.' },
    { value: 'high', label: 'Cao', description: 'Mô tả chi tiết hơn, có thể bao gồm hành động.' },
    { value: 'extreme', label: 'Cực Đoan', description: 'Mô tả rất chi tiết, không giới hạn (cẩn trọng khi sử dụng).' },
  ];


  if (showWarning && !nsfwSettings.enabled) { 
    return (
      <Modal isOpen={true} onClose={onClose} title="Cảnh Báo Nội Dung Nhạy Cảm" size="lg">
        <div className="text-center p-4">
            <i className="fas fa-exclamation-triangle text-5xl text-yellow-500 dark:text-yellow-400 mb-5"></i>
            <p className="text-lg font-semibold mb-3 text-text-light dark:text-text-dark">Nội dung bạn sắp tùy chỉnh có thể không phù hợp với mọi lứa tuổi hoặc chứa các yếu tố nhạy cảm, gây khó chịu.</p>
            <p className="mb-6 text-slate-600 dark:text-slate-300">Bạn có chắc chắn muốn tiếp tục và cấu hình các tùy chọn nội dung người lớn (NSFW) không? Hãy cân nhắc kỹ trước khi quyết định.</p>
        </div>
        <div className="mt-6 flex justify-center space-x-4">
          <Button variant="outline" onClick={onClose} size="lg">Hủy Bỏ</Button>
          <Button variant="danger" onClick={handleAgreeWarning} size="lg">Tôi Hiểu & Đồng Ý Tiếp Tục</Button>
        </div>
      </Modal>
    );
  }


  return (
    <Modal isOpen={true} onClose={onClose} title="Thiết Lập Chế Độ Nội Dung Người Lớn (NSFW)" size="xl">
      <div className="space-y-6">
        <div className={`p-4 rounded-lg border transition-all duration-200 ease-in-out ${tempNsfwPrefs.enabled ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600' : 'bg-slate-50 dark:bg-slate-800/30 border-border-light dark:border-border-dark'}`}>
            <Checkbox
            label="Bật Chế Độ NSFW Tổng Thể"
            description="Cho phép AI tạo ra nội dung nhạy cảm khi phù hợp với diễn biến truyện."
            checked={tempNsfwPrefs.enabled}
            onChange={(e) => setTempNsfwPrefs(prev => ({ ...prev, enabled: e.target.checked }))}
            />
        </div>

        {tempNsfwPrefs.enabled && (
          <div className="space-y-5 pl-2 border-l-2 border-red-300 dark:border-red-600 ml-2">
            <RadioGroup
                label="Mức độ Khiêu Dâm:"
                name="eroticaLevel"
                options={levelOptions}
                selectedValue={tempNsfwPrefs.eroticaLevel}
                onChange={(value) => setTempNsfwPrefs(prev => ({ ...prev, eroticaLevel: value as NSFWPreferences['eroticaLevel'] }))}
                wrapperClass="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md"
            />
            <RadioGroup
                label="Mức độ Bạo Lực:"
                name="violenceLevel"
                options={levelOptions}
                selectedValue={tempNsfwPrefs.violenceLevel}
                onChange={(value) => setTempNsfwPrefs(prev => ({ ...prev, violenceLevel: value as NSFWPreferences['violenceLevel'] }))}
                wrapperClass="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md"
            />
            <RadioGroup
                label="Mức độ Nội Dung Đen Tối (Chủ đề nhạy cảm, tâm lý nặng nề):"
                name="darkContentLevel"
                options={levelOptions}
                selectedValue={tempNsfwPrefs.darkContentLevel}
                onChange={(value) => setTempNsfwPrefs(prev => ({ ...prev, darkContentLevel: value as NSFWPreferences['darkContentLevel'] }))}
                wrapperClass="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md"
            />
            <Textarea
              label="Phong cách NSFW tùy chỉnh (Tùy chọn):"
              value={tempNsfwPrefs.customPrompt || ''}
              onChange={(e) => setTempNsfwPrefs(prev => ({ ...prev, customPrompt: e.target.value }))}
              placeholder="Ví dụ: Tập trung vào mô tả chi tiết cảm xúc và bầu không khí căng thẳng, sử dụng ngôn ngữ gợi hình nhưng không dung tục..."
              rows={3}
              wrapperClass="mt-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md"
            />
          </div>
        )}
        
        <div className="mt-5 p-3 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 rounded-lg text-yellow-700 dark:text-yellow-200">
          <p className="text-xs">
            <strong className="font-semibold"><i className="fas fa-exclamation-circle mr-1"></i>Lưu ý quan trọng:</strong> Việc bật các tùy chọn này cho phép AI tạo ra nội dung liên quan KHI PHÙ HỢP với diễn biến truyện. AI sẽ không cố tình lái truyện theo hướng NSFW một cách gượng ép. Chất lượng và sự phù hợp của nội dung NSFW phụ thuộc vào khả năng của mô hình AI và có thể không phải lúc nào cũng như mong đợi. Sử dụng có trách nhiệm.
          </p>
        </div>
      </div>
      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} size="lg">Hủy</Button>
        <Button onClick={handleSave} size="lg" variant="primary">Lưu Thiết Lập NSFW</Button>
      </div>
    </Modal>
  );
};

export default NsfwSettingsModal;
