
import React, { useState } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Dropdown from '../Dropdown';
import { useSettings } from '../../contexts/SettingsContext';
import { Theme } from '../../types'; 

interface GeneralSettingsModalProps {
  onClose: () => void;
}

const GeneralSettingsModal: React.FC<GeneralSettingsModalProps> = ({ onClose }) => {
  const { settings, setSettings } = useSettings();
  const [tempSettings, setTempSettings] = useState(settings);

  const handleSave = () => {
    setSettings(tempSettings);
    onClose();
  };

  const themeOptions = [
    { value: Theme.Light, label: 'Sáng (Light Mode)' },
    { value: Theme.Dark, label: 'Tối (Dark Mode)' },
  ];

  const languageOptions = [
    { value: 'vi', label: 'Tiếng Việt (Mặc định)' },
    // { value: 'en', label: 'English (Coming Soon)' }, // Keep disabled for now
  ];

  const fontSizeOptions = [
    { value: 12, label: 'Nhỏ (12px)' },
    { value: 14, label: 'Vừa (14px)' },
    { value: 16, label: 'Mặc định (16px)' },
    { value: 18, label: 'Lớn (18px)' },
    { value: 20, label: 'Rất Lớn (20px)' },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title="Cài Đặt Chung">
      <div className="space-y-6 pt-2">
        <Dropdown
          label="Chủ đề giao diện (Theme):"
          options={themeOptions}
          value={tempSettings.theme}
          onChange={(e) => setTempSettings(prev => ({ ...prev, theme: e.target.value as Theme }))}
          wrapperClass="mb-5"
        />
        <Dropdown
          label="Ngôn ngữ (Language):"
          options={languageOptions}
          value={tempSettings.language}
          onChange={(e) => setTempSettings(prev => ({ ...prev, language: e.target.value }))}
          disabled // Language change might require more complex i18n setup
          wrapperClass="mb-5 opacity-70"
        />
        <Dropdown
          label="Kích thước font chữ mặc định:"
          options={fontSizeOptions}
          value={tempSettings.fontSize.toString()}
          onChange={(e) => setTempSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value, 10) }))}
          wrapperClass="mb-2"
        />
         <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
            Thay đổi kích thước font sẽ ảnh hưởng đến toàn bộ ứng dụng. Một số thay đổi có thể cần tải lại trang để áp dụng hoàn toàn.
          </p>
      </div>
      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} size="lg">Hủy</Button>
        <Button onClick={handleSave} size="lg" variant="primary">Lưu Cài Đặt</Button>
      </div>
    </Modal>
  );
};

export default GeneralSettingsModal;
