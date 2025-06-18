
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings, Theme, NSFWPreferences } from '../types';
import { LOCAL_STORAGE_SETTINGS_KEY, LOCAL_STORAGE_NSFW_KEY, LOCAL_STORAGE_API_KEY } from '../constants';

interface SettingsContextProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  nsfwSettings: NSFWPreferences;
  setNsfwSettings: React.Dispatch<React.SetStateAction<NSFWPreferences>>;
  userApiKey: string;
  setUserApiKey: (key: string) => void;
  validateAndSaveApiKey: (key: string) => Promise<boolean>;
}

const defaultSettings: Settings = {
  theme: Theme.Dark,
  apiKeyStatus: 'unknown',
  language: 'vi',
  fontSize: 16,
  useDefaultAPI: true,
};

const defaultNSFWPrefs: NSFWPreferences = {
  enabled: false,
  eroticaLevel: 'none',
  violenceLevel: 'none',
  darkContentLevel: 'none',
  customPrompt: '', // Initialize customPrompt
};

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            // Ensure apiKeyStatus is valid, default to 'unknown' if not
            const validStatuses = ['unknown', 'valid', 'invalid', 'default'];
            if (!validStatuses.includes(parsed.apiKeyStatus)) {
                parsed.apiKeyStatus = 'unknown';
            }
            return { ...defaultSettings, ...parsed };
        } catch (e) {
            console.error("Failed to parse settings from localStorage", e);
            return defaultSettings;
        }
    }
    return defaultSettings;
  });

  const [nsfwSettings, setNsfwSettings] = useState<NSFWPreferences>(() => {
    const savedNSFW = localStorage.getItem(LOCAL_STORAGE_NSFW_KEY);
    if (savedNSFW) {
        const parsed = JSON.parse(savedNSFW);
        // Ensure customPrompt exists for older saves
        return { ...defaultNSFWPrefs, ...parsed };
    }
    return defaultNSFWPrefs;
  });

  const [userApiKey, setUserApiKeyInternal] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_API_KEY) || "";
  });


  useEffect(() => {
    // Effect for saving settings to localStorage whenever they change
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // Effect for saving NSFW preferences to localStorage
    localStorage.setItem(LOCAL_STORAGE_NSFW_KEY, JSON.stringify(nsfwSettings));
  }, [nsfwSettings]);

  useEffect(() => {
    // This effect manages apiKeyStatus based on useDefaultAPI and userApiKey changes.
    // It runs when useDefaultAPI or userApiKey changes.
    setSettings(currentSettings => {
      const { useDefaultAPI, apiKeyStatus } = currentSettings;
      let newCalculatedStatus = apiKeyStatus;

      if (useDefaultAPI) {
        newCalculatedStatus = 'default';
      } else {
        // Not using default API
        if (!userApiKey) { // No custom key provided/persisted
          newCalculatedStatus = 'unknown'; // Or 'invalid'. 'unknown' prompts user to check/set.
        } else {
          // Custom key IS present.
          // If status was 'default', it means we just switched from default to custom, so it's 'unknown'.
          // Otherwise, status is already 'unknown', 'valid', or 'invalid' (set by other functions like setUserApiKey or validateAndSaveApiKey)
          // and this effect should not override an existing 'valid' or 'invalid' status.
          if (apiKeyStatus === 'default') {
            newCalculatedStatus = 'unknown';
          }
        }
      }

      if (newCalculatedStatus !== apiKeyStatus) {
        return { ...currentSettings, apiKeyStatus: newCalculatedStatus };
      }
      return currentSettings; // No change needed, return the same object to prevent re-render
    });
  }, [settings.useDefaultAPI, userApiKey, setSettings]); // setSettings is stable

  const setUserApiKey = (key: string) => {
    localStorage.setItem(LOCAL_STORAGE_API_KEY, key);
    setUserApiKeyInternal(key);
    // When API key changes, its status is 'unknown' until validated (if not using default).
    // If key is cleared, it's 'invalid'.
    // This will also trigger the useEffect above to potentially re-evaluate.
    setSettings(s => {
        if (!s.useDefaultAPI) {
            const newStatus = key ? 'unknown' : 'invalid';
            if (s.apiKeyStatus !== newStatus) {
                return { ...s, apiKeyStatus: newStatus };
            }
        }
        return s;
    });
  };
  
  const validateAndSaveApiKey = async (key: string): Promise<boolean> => {
    if (!key.trim()) { // Added trim to handle empty or whitespace-only keys
        setSettings(s => ({ ...s, apiKeyStatus: 'invalid', useDefaultAPI: false }));
        setUserApiKey(""); // Clear invalid key from storage if it was just an empty attempt
        return false;
    }
    // This is a placeholder for actual API key validation
    // In a real scenario, you'd make a test call to Gemini API
    if (key && key.startsWith("AIza") && key.length > 30) { // Basic check
      localStorage.setItem(LOCAL_STORAGE_API_KEY, key); // Save validated key
      setUserApiKeyInternal(key);
      setSettings(s => ({ ...s, apiKeyStatus: 'valid', useDefaultAPI: false }));
      return true;
    } else {
      // Don't clear userApiKeyInternal here, let user see what they typed.
      // But do clear from localStorage if we are certain it's bad and they tried to save.
      // However, if they just typed something bad and didn't hit save, clearing it might be confusing.
      // Let's assume this function is called on an explicit "save" or "test & save".
      // If the key is truly invalid, don't persist it.
      // localStorage.setItem(LOCAL_STORAGE_API_KEY, ""); // Maybe not, depends on UX desired.
      // setUserApiKeyInternal(""); // User might want to correct it.

      setSettings(s => ({ ...s, apiKeyStatus: 'invalid', useDefaultAPI: false }));
      return false;
    }
  };


  return (
    <SettingsContext.Provider value={{ settings, setSettings, nsfwSettings, setNsfwSettings, userApiKey, setUserApiKey, validateAndSaveApiKey }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
