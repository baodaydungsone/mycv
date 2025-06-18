
import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input';
import Checkbox from '../Checkbox';
import { useSettings } from '../../contexts/SettingsContext';
import { GEMINI_API_KEY_URL, DEFAULT_API_KEY_PLACEHOLDER } from '../../constants';
import { validateApiKey } from '../../services/GeminiService'; 

interface ApiSettingsModalProps {
  onClose: () => void;
}

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ onClose }) => {
  const { settings, setSettings, userApiKey, setUserApiKey, validateAndSaveApiKey } = useSettings();
  const [currentApiKey, setCurrentApiKey] = useState(userApiKey);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    setCurrentApiKey(userApiKey); 
  }, [userApiKey]);

  const handleTestAndSaveKey = async () => {
    if (settings.useDefaultAPI) {
        onClose();
        return;
    }
    if (!currentApiKey.trim()) {
      setTestStatus('error');
      setSettings(s => ({ ...s, apiKeyStatus: 'invalid' }));
      return;
    }
    setIsTestingKey(true);
    setTestStatus('idle');
    const isValid = await validateApiKey(currentApiKey); 
    if (isValid) {
      await validateAndSaveApiKey(currentApiKey); 
      setTestStatus('success');
       setTimeout(onClose, 1200); 
    } else {
      setTestStatus('error');
      setSettings(s => ({ ...s, apiKeyStatus: 'invalid'})); 
    }
    setIsTestingKey(false);
  };
  
  const handleUseDefaultToggle = (useDefault: boolean) => {
    setSettings(prev => ({ ...prev, useDefaultAPI: useDefault, apiKeyStatus: useDefault ? 'default' : (userApiKey ? prev.apiKeyStatus : 'unknown') }));
    if(useDefault) {
      setTestStatus('idle'); 
      setCurrentApiKey(''); // Clear custom key field if switching to default
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Thiết Lập API Key Gemini">
      <div className="space-y-5">
        <div className={`p-4 rounded-lg border transition-all duration-200 ease-in-out ${settings.useDefaultAPI ? 'bg-primary/10 border-primary/50 dark:bg-primary-dark/20 dark:border-primary-dark/60' : 'bg-slate-50 dark:bg-slate-800/30 border-border-light dark:border-border-dark'}`}>
          <Checkbox
            label="Sử dụng API Key mặc định của ứng dụng"
            description="Gemini Flash, không giới hạn. Khuyến nghị cho người mới."
            checked={settings.useDefaultAPI}
            onChange={(e) => handleUseDefaultToggle(e.target.checked)}
          />
        </div>
        
        <div className={`transition-all duration-300 ease-in-out ${settings.useDefaultAPI ? 'opacity-50 max-h-0 overflow-hidden pointer-events-none' : 'opacity-100 max-h-[500px]'}`}>
            <h4 className="text-sm font-medium text-text-light dark:text-text-dark mb-2">Hoặc sử dụng API Key Gemini của riêng bạn:</h4>
            <Input
              label="API Key Gemini:"
              type="password"
              value={currentApiKey}
              onChange={(e) => {
                setCurrentApiKey(e.target.value);
                setTestStatus('idle'); 
                if(settings.apiKeyStatus !== 'unknown' && settings.apiKeyStatus !== 'default') {
                    setSettings(s => ({...s, apiKeyStatus: 'unknown'}));
                }
              }}
              placeholder="Dán API Key của bạn tại đây (ví dụ: AIza...)"
              disabled={isTestingKey || settings.useDefaultAPI}
              leftIcon={<i className="fas fa-key text-gray-400"></i>}
            />
            {testStatus === 'success' && <p className="text-sm text-green-600 dark:text-green-400 mt-1"><i className="fas fa-check-circle mr-1"></i>Key hợp lệ và đã được lưu!</p>}
            {testStatus === 'error' && <p className="text-sm text-red-600 dark:text-red-400 mt-1"><i className="fas fa-times-circle mr-1"></i>Key không hợp lệ hoặc có lỗi. Vui lòng kiểm tra lại.</p>}
            {settings.apiKeyStatus === 'valid' && !currentApiKey && !settings.useDefaultAPI && testStatus === 'idle' && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1"><i className="fas fa-exclamation-triangle mr-1"></i>Bạn đã xóa API key đã lưu. Nhập key mới hoặc chọn sử dụng key mặc định.</p>
            )}
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Lấy API Key của bạn tại: <a href={GEMINI_API_KEY_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{GEMINI_API_KEY_URL}</a>
            </p>
        </div>

        {settings.useDefaultAPI && (
             <div className="p-3 bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700/60 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-200">
                    <i className="fas fa-info-circle mr-1.5"></i>API Key mặc định đang được sử dụng. Bạn không cần nhập key riêng.
                </p>
             </div>
        )}

      </div>
      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} size="md">Hủy</Button>
        <Button 
            onClick={handleTestAndSaveKey} 
            isLoading={isTestingKey}
            disabled={isTestingKey || (!settings.useDefaultAPI && !currentApiKey.trim())}
            size="md"
            variant="primary"
        >
          {settings.useDefaultAPI ? "Lưu & Đóng" : (isTestingKey ? "Đang kiểm tra..." : "Kiểm tra & Lưu Key")}
        </Button>
      </div>
    </Modal>
  );
};

export default ApiSettingsModal;
