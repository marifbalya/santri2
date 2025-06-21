
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { 
  AIProvider, 
  ApiSettings, 
  ChatParams, 
  KangSantriPreset, 
  StoredApiSettings,
  StoredProviderSettings,
  ApiKeyEntry,
  CodeProject, 
  OldStoredApiConfigs,
  OldStoredApiConfig, 
  Message,
  Conversation
} from '../types';
import { 
  INITIAL_API_SETTINGS, 
  DEFAULT_CHAT_PARAMS, 
  PRESET_SYSTEM_PROMPTS, 
  LOCAL_STORAGE_API_SETTINGS_KEY, 
  OLD_LOCAL_STORAGE_API_CONFIGS_KEY, 
  LOCAL_STORAGE_THEME_KEY, 
  LOCAL_STORAGE_ACTIVE_PROVIDER_KEY, 
  LOCAL_STORAGE_CHAT_PARAMS_KEY, 
  LOCAL_STORAGE_KANGSANTRI_PRESET_KEY,
  LOCAL_STORAGE_SAVED_CODES_KEY, 
  LOCAL_STORAGE_CHAT_HISTORY_KEY, 
  LOCAL_STORAGE_CONVERSATIONS_KEY, 
  LOCAL_STORAGE_ACTIVE_CONVERSATION_ID_KEY, 
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  AVAILABLE_MODELS_TEXT 
} from '../constants';

export enum AppView {
  CHAT = 'Chat',
  IMAGE = 'Gambar',
  CODING = 'Coding', 
  TUTORIAL = 'Tutorial', 
  SAVED_CODES = 'Kode Tersimpan', 
  SETTINGS = 'Pengaturan',
}

type Theme = 'light' | 'dark';

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  apiSettings: ApiSettings;
  addApiKey: (provider: AIProvider, keyDetails: Omit<ApiKeyEntry, 'id' | 'isDefault'>) => void;
  updateApiKey: (provider: AIProvider, keyId: string, updates: Partial<Omit<ApiKeyEntry, 'id' | 'isDefault'>>) => void;
  deleteApiKey: (provider: AIProvider, keyId: string) => void;
  setActiveApiKey: (provider: AIProvider, keyId: string) => void;
  updateProviderDefaultModel: (provider: AIProvider, model: string) => void;
  updateProviderEndpoint: (provider: AIProvider, endpoint?: string) => void;
  activeProvider: AIProvider;
  setActiveProvider: (provider: AIProvider) => void;
  chatParams: ChatParams;
  updateChatParams: (params: Partial<ChatParams>) => void;
  kangSantriPreset: KangSantriPreset;
  setKangSantriPreset: (preset: KangSantriPreset) => void;

  savedCodeProjects: CodeProject[];
  addCodeProject: (projectData: Pick<CodeProject, 'name' | 'code'>) => string; 
  updateCodeProject: (projectId: string, updates: Partial<Pick<CodeProject, 'name' | 'code'>>) => void;
  deleteCodeProject: (projectId: string) => void;
  activeEditingProjectId: string | null;
  loadCodeProjectForEditing: (projectId: string | null) => void;
  clearActiveEditingProject: () => void;

  conversations: Conversation[];
  activeConversationId: string | null;
  createConversation: (name?: string) => string; 
  selectConversation: (conversationId: string | null) => void;
  deleteConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, newName: string) => void;
  updateConversationMessages: (conversationId: string, messages: Message[]) => void;
  getActiveConversation: () => Conversation | null;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [currentView, setCurrentView] = useState<AppView>(AppView.CHAT);
  const [apiSettings, setApiSettingsState] = useState<ApiSettings>(INITIAL_API_SETTINGS);
  const [activeProvider, setActiveProviderState] = useState<AIProvider>(AIProvider.GEMINI);
  const [chatParams, setChatParamsState] = useState<ChatParams>(DEFAULT_CHAT_PARAMS);
  const [kangSantriPreset, setKangSantriPresetState] = useState<KangSantriPreset>(KangSantriPreset.DEFAULT);
  
  const [savedCodeProjects, setSavedCodeProjectsState] = useState<CodeProject[]>([]);
  const [activeEditingProjectId, setActiveEditingProjectIdState] = useState<string | null>(null);

  const [conversations, setConversationsState] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);

  // Initialization Effect
  useEffect(() => {
    const storedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as Theme | null;
    if (storedTheme) setTheme(storedTheme);
    else setTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    let loadedSettings = { ...INITIAL_API_SETTINGS };
    const newSettingsStr = localStorage.getItem(LOCAL_STORAGE_API_SETTINGS_KEY);
    if (newSettingsStr) {
      try {
        const parsedNewSettings = JSON.parse(newSettingsStr) as StoredApiSettings;
        (Object.keys(loadedSettings) as AIProvider[]).forEach(providerKey => {
          if (parsedNewSettings[providerKey]) {
            loadedSettings[providerKey] = {
              ...INITIAL_API_SETTINGS[providerKey],
              ...(parsedNewSettings[providerKey] as StoredProviderSettings),
              apiKeys: (parsedNewSettings[providerKey]?.apiKeys || []).map(k => ({...k, isDefault: k.isDefault || false})),
            };
          }
        });
      } catch (e) { 
        console.error("Gagal memuat pengaturan API baru dari localStorage. Data mungkin korup. Data yang bermasalah:", newSettingsStr, "Error:", e); 
        localStorage.removeItem(LOCAL_STORAGE_API_SETTINGS_KEY); 
      }
    } else {
      const oldSettingsStr = localStorage.getItem(OLD_LOCAL_STORAGE_API_CONFIGS_KEY);
      if (oldSettingsStr) {
        try {
          const parsedOldSettings = JSON.parse(oldSettingsStr) as OldStoredApiConfigs;
          (Object.keys(parsedOldSettings) as AIProvider[]).forEach(pKey => {
            const oldConfig = parsedOldSettings[pKey] as OldStoredApiConfig | undefined;
            if (oldConfig && oldConfig.apiKey) {
              loadedSettings[pKey] = {
                apiKeys: [{ id: `migrated-${pKey}-${Date.now()}`, label: `${pKey} (Migrasi)`, apiKey: oldConfig.apiKey, isDefault: true }],
                defaultModel: oldConfig.model || (pKey === AIProvider.GEMINI ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENROUTER_MODEL),
                endpoint: pKey === AIProvider.OPENROUTER ? oldConfig.endpoint : undefined,
              };
            }
          });
          console.log("Pengaturan API lama berhasil dimigrasi.");
          localStorage.removeItem(OLD_LOCAL_STORAGE_API_CONFIGS_KEY); // Hapus setelah migrasi
        } catch (e) { console.error("Gagal migrasi pengaturan API lama:", e); localStorage.removeItem(OLD_LOCAL_STORAGE_API_CONFIGS_KEY); }
      }
    }
    setApiSettingsState(loadedSettings);

    const storedProvider = localStorage.getItem(LOCAL_STORAGE_ACTIVE_PROVIDER_KEY) as AIProvider | null;
    const initialActiveProvider = storedProvider && Object.values(AIProvider).includes(storedProvider) ? storedProvider : AIProvider.GEMINI;
    setActiveProviderState(initialActiveProvider);

    const defaultModelForInitialProvider = loadedSettings[initialActiveProvider]?.defaultModel || 
                                           (initialActiveProvider === AIProvider.GEMINI ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENROUTER_MODEL);
    
    const storedChatParamsStr = localStorage.getItem(LOCAL_STORAGE_CHAT_PARAMS_KEY);
    let initialChatParams = { ...DEFAULT_CHAT_PARAMS, model: defaultModelForInitialProvider };
    if (storedChatParamsStr) {
        try {
            const parsedParams = JSON.parse(storedChatParamsStr);
            initialChatParams = {...initialChatParams, ...parsedParams, model: parsedParams.model || defaultModelForInitialProvider };
        } catch (e) { console.error("Gagal parse param chat tersimpan", e); localStorage.removeItem(LOCAL_STORAGE_CHAT_PARAMS_KEY); }
    }
    
    const storedPreset = localStorage.getItem(LOCAL_STORAGE_KANGSANTRI_PRESET_KEY) as KangSantriPreset | null;
    const initialPreset = storedPreset && Object.values(KangSantriPreset).includes(storedPreset) ? storedPreset : KangSantriPreset.DEFAULT;
    setKangSantriPresetState(initialPreset);
    initialChatParams.system_prompt = PRESET_SYSTEM_PROMPTS[initialPreset];
    setChatParamsState(initialChatParams);

    const storedSavedCodes = localStorage.getItem(LOCAL_STORAGE_SAVED_CODES_KEY);
    if (storedSavedCodes) {
        try { setSavedCodeProjectsState(JSON.parse(storedSavedCodes)); } 
        catch (e) { console.error("Gagal memuat kode tersimpan:", e); localStorage.removeItem(LOCAL_STORAGE_SAVED_CODES_KEY); }
    }
    
    // Conversation Initialization & Migration
    let loadedConversations: Conversation[] = [];
    const storedConversations = localStorage.getItem(LOCAL_STORAGE_CONVERSATIONS_KEY);
    if (storedConversations) {
        try {
            loadedConversations = JSON.parse(storedConversations).map((conv: Conversation) => ({
                ...conv,
                createdAt: conv.createdAt || new Date().toISOString(),
                updatedAt: conv.updatedAt || new Date().toISOString(),
                messages: (conv.messages || []).map(msg => ({...msg, timestamp: new Date(msg.timestamp)}))
            })).sort((a: Conversation, b: Conversation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); // Sort by most recent
        } catch (e) { console.error("Gagal memuat percakapan:", e); localStorage.removeItem(LOCAL_STORAGE_CONVERSATIONS_KEY); }
    }

    if (loadedConversations.length === 0) {
        const oldChatHistoryStr = localStorage.getItem(LOCAL_STORAGE_CHAT_HISTORY_KEY);
        if (oldChatHistoryStr) {
            try {
                const oldMessages: Message[] = JSON.parse(oldChatHistoryStr).map((msg: Message) => ({...msg, timestamp: new Date(msg.timestamp)}));
                if (oldMessages.length > 0) {
                    const migratedConversation: Conversation = {
                        id: `migrated-${Date.now()}`, name: 'Obrolan Lama (Migrasi)', messages: oldMessages,
                        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                    };
                    loadedConversations.push(migratedConversation);
                    localStorage.removeItem(LOCAL_STORAGE_CHAT_HISTORY_KEY); // Remove old history after migration
                    console.log("Riwayat chat lama berhasil dimigrasi ke sistem percakapan baru.");
                }
            } catch (e) { console.error("Gagal migrasi riwayat chat lama:", e); localStorage.removeItem(LOCAL_STORAGE_CHAT_HISTORY_KEY); }
        }
    }
    
    let currentActiveConvId: string | null = localStorage.getItem(LOCAL_STORAGE_ACTIVE_CONVERSATION_ID_KEY);
    if (loadedConversations.length > 0) {
        if (!currentActiveConvId || !loadedConversations.some(c => c.id === currentActiveConvId)) {
            currentActiveConvId = loadedConversations[0].id; // Default to the most recent one
        }
    } else { // No conversations loaded or migrated, create a fresh one
        const initialConvId = `conv-${Date.now()}`;
        const initialConversation: Conversation = {
            id: initialConvId, name: "Obrolan Pertama", messages: [],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        loadedConversations = [initialConversation];
        currentActiveConvId = initialConvId;
    }
    setConversationsState(loadedConversations);
    setActiveConversationIdState(currentActiveConvId);

  }, []);
  
  // Persistence Effect
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
    const settingsToStore: StoredApiSettings = {};
    (Object.keys(apiSettings) as AIProvider[]).forEach(pKey => {
        settingsToStore[pKey] = { ...apiSettings[pKey], lastUpdated: new Date().toISOString() };
    });
    localStorage.setItem(LOCAL_STORAGE_API_SETTINGS_KEY, JSON.stringify(settingsToStore));
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROVIDER_KEY, activeProvider);
    localStorage.setItem(LOCAL_STORAGE_CHAT_PARAMS_KEY, JSON.stringify(chatParams));
    localStorage.setItem(LOCAL_STORAGE_KANGSANTRI_PRESET_KEY, kangSantriPreset);
    localStorage.setItem(LOCAL_STORAGE_SAVED_CODES_KEY, JSON.stringify(savedCodeProjects));
    
    const sortedConversations = [...conversations].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    localStorage.setItem(LOCAL_STORAGE_CONVERSATIONS_KEY, JSON.stringify(sortedConversations));

    if (activeConversationId) localStorage.setItem(LOCAL_STORAGE_ACTIVE_CONVERSATION_ID_KEY, activeConversationId);
    else localStorage.removeItem(LOCAL_STORAGE_ACTIVE_CONVERSATION_ID_KEY);
  }, [theme, apiSettings, activeProvider, chatParams, kangSantriPreset, savedCodeProjects, conversations, activeConversationId]);

  const updateChatParams = useCallback((params: Partial<ChatParams>) => {
    setChatParamsState(prevParams => ({ ...prevParams, ...params }));
  }, []);

  const addApiKey = useCallback((provider: AIProvider, keyDetails: Omit<ApiKeyEntry, 'id' | 'isDefault'>) => {
    setApiSettingsState(prev => {
        const newKeyId = `key-${provider}-${Date.now()}`;
        const providerKeys = prev[provider].apiKeys || [];
        // Make new key default only if no other keys exist or no other key is default
        const isNewKeyDefault = providerKeys.length === 0 || !providerKeys.some(k => k.isDefault);
        const newKeys = [...providerKeys, { ...keyDetails, id: newKeyId, isDefault: isNewKeyDefault }];
        return { ...prev, [provider]: { ...prev[provider], apiKeys: newKeys } };
    });
  }, []);

  const updateApiKey = useCallback((provider: AIProvider, keyId: string, updates: Partial<Omit<ApiKeyEntry, 'id' | 'isDefault'>>) => {
    setApiSettingsState(prev => ({
        ...prev,
        [provider]: {
            ...prev[provider],
            apiKeys: prev[provider].apiKeys.map(k => k.id === keyId ? { ...k, ...updates } : k),
        },
    }));
  }, []);

  const deleteApiKey = useCallback((provider: AIProvider, keyId: string) => {
    setApiSettingsState(prev => {
        let remainingKeys = prev[provider].apiKeys.filter(k => k.id !== keyId);
        const deletedKeyWasDefault = prev[provider].apiKeys.find(k => k.id === keyId)?.isDefault;
        
        if (deletedKeyWasDefault && remainingKeys.length > 0 && !remainingKeys.some(k => k.isDefault)) {
            // If the deleted key was default, and no other key is default, make the first remaining key default
            remainingKeys = remainingKeys.map((k, index) => index === 0 ? { ...k, isDefault: true } : k);
        }
        
        const newSettings = { ...prev, [provider]: { ...prev[provider], apiKeys: remainingKeys } };
        
        if (provider === activeProvider) {
            const activeKeyNow = remainingKeys.find(k => k.isDefault);
            if (!activeKeyNow) { // No active key left for current provider
                updateChatParams({ model: AVAILABLE_MODELS_TEXT[provider]?.[0] || 
                                         (provider === AIProvider.GEMINI ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENROUTER_MODEL) });
            } else { // An active key still exists
                 updateChatParams({ model: newSettings[provider].defaultModel });
            }
        }
        return newSettings;
    });
  }, [activeProvider, updateChatParams]);

  const setActiveApiKey = useCallback((provider: AIProvider, keyId: string) => {
    setApiSettingsState(prev => {
        const newKeys = prev[provider].apiKeys.map(k => ({ ...k, isDefault: k.id === keyId }));
        const newSettings = { ...prev, [provider]: { ...prev[provider], apiKeys: newKeys } };
        if (provider === activeProvider) {
            updateChatParams({ model: newSettings[provider].defaultModel });
        }
        return newSettings;
    });
  }, [activeProvider, updateChatParams]);

  const updateProviderDefaultModel = useCallback((provider: AIProvider, model: string) => {
    setApiSettingsState(prev => {
        const newSettings = { ...prev, [provider]: { ...prev[provider], defaultModel: model } };
        if (provider === activeProvider) {
            const activeKeyForProvider = newSettings[provider].apiKeys.find(k => k.isDefault && k.apiKey);
            if(activeKeyForProvider){ 
                 updateChatParams({ model });
            }
        }
        return newSettings;
    });
  }, [activeProvider, updateChatParams]);

  const updateProviderEndpoint = useCallback((provider: AIProvider, endpoint?: string) => {
    if (provider !== AIProvider.OPENROUTER) return; 
    setApiSettingsState(prev => ({
        ...prev,
        [provider]: { ...prev[provider], endpoint: endpoint || '' },
    }));
  }, []);
  
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const setActiveProvider = useCallback((newProvider: AIProvider) => {
    setActiveProviderState(newProvider);
    const providerSettings = apiSettings[newProvider];
    const defaultModel = providerSettings?.defaultModel || 
                         (newProvider === AIProvider.GEMINI ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENROUTER_MODEL);
    updateChatParams({ model: defaultModel });
  }, [apiSettings, updateChatParams]);

  const setKangSantriPreset = useCallback((preset: KangSantriPreset) => {
    setKangSantriPresetState(preset);
    updateChatParams({ system_prompt: PRESET_SYSTEM_PROMPTS[preset] });
  }, [updateChatParams]);

  const addCodeProject = useCallback((projectData: Pick<CodeProject, 'name' | 'code'>): string => {
    const newProject: CodeProject = {
      ...projectData, id: `code-${Date.now()}`,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setSavedCodeProjectsState(prev => [...prev, newProject]);
    return newProject.id;
  }, []);

  const updateCodeProject = useCallback((projectId: string, updates: Partial<Pick<CodeProject, 'name' | 'code'>>) => {
    setSavedCodeProjectsState(prev =>
      prev.map(p => p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
    );
  }, []);

  const deleteCodeProject = useCallback((projectId: string) => {
    setSavedCodeProjectsState(prev => prev.filter(p => p.id !== projectId));
    if (activeEditingProjectId === projectId) {
      setActiveEditingProjectIdState(null);
    }
  }, [activeEditingProjectId]);

  const loadCodeProjectForEditing = useCallback((projectId: string | null) => {
    setActiveEditingProjectIdState(projectId);
    if(projectId) setCurrentView(AppView.CODING);
  }, []);
  
  const clearActiveEditingProject = useCallback(() => {
    setActiveEditingProjectIdState(null);
  }, []);

  const createConversation = useCallback((name?: string): string => {
    const newId = `conv-${Date.now()}`;
    const newConversation: Conversation = {
      id: newId,
      name: name || `Obrolan ${conversations.length + 1}`,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Add to state and then set active, then set view
    setConversationsState(prev => [newConversation, ...prev]
        .sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
    setActiveConversationIdState(newId);
    setCurrentView(AppView.CHAT);
    return newId;
  }, [conversations, setConversationsState, setActiveConversationIdState, setCurrentView]);

  const selectConversation = useCallback((conversationId: string | null) => {
    const sortedConvs = [...conversations].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (conversationId && sortedConvs.some(c => c.id === conversationId)) {
        setActiveConversationIdState(conversationId);
        setCurrentView(AppView.CHAT);
    } else if (sortedConvs.length > 0) {
        setActiveConversationIdState(sortedConvs[0].id);
        setCurrentView(AppView.CHAT);
    } else {
        // This case should be rare if initialization logic guarantees at least one conversation
        createConversation("Obrolan Pertama"); 
    }
  }, [conversations, createConversation, setActiveConversationIdState, setCurrentView]);
  
  const deleteConversation = useCallback((conversationId: string) => {
    let newActiveConvId: string | null = activeConversationId;
    let newConversationsList: Conversation[] = conversations.filter(c => c.id !== conversationId);

    if (activeConversationId === conversationId) { // If the active conversation is being deleted
        if (newConversationsList.length > 0) {
            // Sort remaining by updatedAt to select the most recent
            newConversationsList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            newActiveConvId = newConversationsList[0].id;
        } else {
            // No conversations left, create a new one. `createConversation` will set it active.
            // This is tricky inside `setConversationsState`. Better to handle by calling a dedicated function
            // or by ensuring createConversation sets the state and then we use its ID.
            // For now, let's prepare a new conversation but `createConversation` itself will handle adding it.
            newActiveConvId = null; // Will be set by createConversation if called
        }
    }

    setConversationsState(newConversationsList);

    if (newActiveConvId) {
        setActiveConversationIdState(newActiveConvId);
        setCurrentView(AppView.CHAT);
    } else if (newConversationsList.length === 0) { 
        // If list became empty and active was deleted, createConversation will handle setting active ID & view
        const createdId = createConversation("Obrolan Pertama"); // This already sets activeId and view
        // setActiveConversationIdState(createdId); // createConversation handles this
        // setCurrentView(AppView.CHAT); // createConversation handles this
    } else if (activeConversationId === conversationId && newConversationsList.length > 0) {
        // This case should be covered by `newActiveConvId` above. Redundant.
        // setActiveConversationIdState(newConversationsList[0].id);
        // setCurrentView(AppView.CHAT);
    }
    
  }, [activeConversationId, conversations, createConversation]);

  const renameConversation = useCallback((conversationId: string, newName: string) => {
    setConversationsState(prev =>
      prev.map(c => c.id === conversationId ? { ...c, name: newName, updatedAt: new Date().toISOString() } : c)
          .sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
  }, []);

  const updateConversationMessages = useCallback((conversationId: string, newMessages: Message[]) => {
    setConversationsState(prev =>
      prev.map(c => c.id === conversationId ? { ...c, messages: newMessages, updatedAt: new Date().toISOString() } : c)
          .sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
  }, []);

  const getActiveConversation = useCallback((): Conversation | null => {
    if (!activeConversationId) return null;
    // Ensure we are getting from the potentially re-sorted `conversations` state
    const currentConvs = conversations;
    return currentConvs.find(c => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);


  const value: AppContextType = {
    theme, toggleTheme,
    currentView, setCurrentView,
    apiSettings, addApiKey, updateApiKey, deleteApiKey, setActiveApiKey, updateProviderDefaultModel, updateProviderEndpoint,
    activeProvider, setActiveProvider,
    chatParams, updateChatParams,
    kangSantriPreset, setKangSantriPreset,
    savedCodeProjects, addCodeProject, updateCodeProject, deleteCodeProject, activeEditingProjectId, loadCodeProjectForEditing, clearActiveEditingProject,
    conversations, activeConversationId, createConversation, selectConversation, deleteConversation, renameConversation, updateConversationMessages, getActiveConversation,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
