
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Message, AIProvider, KangSantriPreset, GroundingChunk } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ProviderSelector from './ProviderSelector';
import ConversationList from './ConversationList'; // New import
import { sendMessageToGemini } from '../../services/geminiService';
import { sendMessageToOpenRouter } from '../../services/openrouterService'; // Updated import
import { sendMessageToPlaceholder } from '../../services/placeholderService';
import { SettingsIcon, ChatBubbleLeftRightIcon } from '../ui/Icons'; 
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { PRESET_SYSTEM_PROMPTS, AVAILABLE_MODELS_TEXT, DEFAULT_GEMINI_MODEL, DEFAULT_OPENROUTER_MODEL, APP_NAME } from '../../constants';

const ChatView: React.FC = () => {
  const { 
    apiSettings, 
    activeProvider, 
    chatParams, 
    updateChatParams, 
    kangSantriPreset, 
    setKangSantriPreset,
    getActiveConversation,
    updateConversationMessages
  } = useContext(AppContext);

  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);
  const [isConversationListOpen, setIsConversationListOpen] = useState(false); 

  const [modalSystemPrompt, setModalSystemPrompt] = useState(chatParams.system_prompt || PRESET_SYSTEM_PROMPTS[KangSantriPreset.DEFAULT]);
  const [modalTemperature, setModalTemperature] = useState(chatParams.temperature);
  const [modalTopP, setModalTopP] = useState(chatParams.top_p);
  const [modalMaxTokens, setModalMaxTokens] = useState(chatParams.max_tokens);
  
  const activeConversation = getActiveConversation();
  const currentMessages = activeConversation?.messages || [];

  useEffect(() => {
    if (isParamsModalOpen) {
        setModalSystemPrompt(chatParams.system_prompt || PRESET_SYSTEM_PROMPTS[kangSantriPreset]);
        setModalTemperature(chatParams.temperature);
        setModalTopP(chatParams.top_p);
        setModalMaxTokens(chatParams.max_tokens);
    }
  }, [chatParams, kangSantriPreset, isParamsModalOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isLoading]);

  useEffect(() => {
    const providerSettings = apiSettings[activeProvider];
    const modelsForProvider = AVAILABLE_MODELS_TEXT[activeProvider] || [];
    const currentModelInParams = chatParams.model;

    let targetModel = providerSettings?.defaultModel || 
                      (activeProvider === AIProvider.GEMINI ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENROUTER_MODEL);

    if (currentModelInParams && modelsForProvider.includes(currentModelInParams)) {
        targetModel = currentModelInParams; 
    } else if (providerSettings?.defaultModel && modelsForProvider.includes(providerSettings.defaultModel)) {
        targetModel = providerSettings.defaultModel; 
    } else if (modelsForProvider.length > 0) {
        targetModel = modelsForProvider[0]; 
    }

    if (chatParams.model !== targetModel) {
        updateChatParams({ model: targetModel });
    }
  }, [activeProvider, apiSettings, chatParams.model, updateChatParams]);


  const handleSendMessage = async (text: string, imageBase64?: string) => {
    if (!text.trim() && !imageBase64) return;
    if (!activeConversation) {
        console.error("Tidak ada percakapan aktif untuk mengirim pesan.");
        return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date(),
      imagePreview: imageBase64,
    };
    
    const newMessagesForUI = [...currentMessages, userMessage];
    updateConversationMessages(activeConversation.id, newMessagesForUI);
    setIsLoading(true);

    try {
      let aiResponseText = '';
      let groundingChunks: GroundingChunk[] | undefined;

      const currentProviderSettings = apiSettings[activeProvider];
      const activeApiKeyEntry = currentProviderSettings?.apiKeys.find(k => k.isDefault && k.apiKey);

      if (!activeApiKeyEntry || !activeApiKeyEntry.apiKey) {
        throw new Error(`API Key aktif untuk ${activeProvider} belum diatur. Silakan periksa Pengaturan.`);
      }
      const apiKeyToUse = activeApiKeyEntry.apiKey;
      const modelToUse = chatParams.model || currentProviderSettings.defaultModel; 
      // System prompt for Gemini is passed inside params, for OpenRouter it's handled by the service.
      const currentChatParams = { ...chatParams, system_prompt: chatParams.system_prompt || PRESET_SYSTEM_PROMPTS[kangSantriPreset] };
      
      const historyForAI = [...currentMessages]; 

      if (activeProvider === AIProvider.GEMINI) {
        const response = await sendMessageToGemini(
            text, 
            historyForAI,
            apiKeyToUse, 
            modelToUse,
            currentChatParams, 
            imageBase64
        );
        aiResponseText = response.text;
        if (response.groundingMetadata?.groundingChunks) {
            groundingChunks = response.groundingMetadata.groundingChunks;
        }
      } else if (activeProvider === AIProvider.OPENROUTER) {
        // Use the actual OpenRouter service
        aiResponseText = await sendMessageToOpenRouter(
            text,
            historyForAI,
            apiKeyToUse,
            modelToUse,
            window.location.origin, // siteUrl
            APP_NAME, // siteName
            currentChatParams, // includes system_prompt
            imageBase64
        );
      } else { 
        // Fallback to placeholder for any other provider (if any added in future and not implemented)
        aiResponseText = await sendMessageToPlaceholder(
            text, historyForAI, activeProvider, modelToUse, imageBase64
        );
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date(),
        provider: activeProvider,
        model: modelToUse,
      };
      if (groundingChunks && groundingChunks.length > 0) {
        const sourcesText = "\n\nSumber Informasi:\n" + groundingChunks.map(chunk => `- ${chunk.web?.title || 'Unknown Source'}: ${chunk.web?.uri || 'No URI'}`).join("\n");
        aiMessage.text += sourcesText;
      }
      updateConversationMessages(activeConversation.id, [...newMessagesForUI, aiMessage]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.';
      const aiErrorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${errorMessage}`,
        sender: 'ai',
        timestamp: new Date(),
        provider: activeProvider,
      };
      updateConversationMessages(activeConversation.id, [...newMessagesForUI, aiErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChatParamsModal = () => {
    updateChatParams({ 
        system_prompt: modalSystemPrompt,
        temperature: modalTemperature,
        top_p: modalTopP,
        max_tokens: modalMaxTokens,
    });
    setIsParamsModalOpen(false);
  };
  
  const handleModalPresetChange = (newPreset: KangSantriPreset) => {
    setKangSantriPreset(newPreset); 
  };
  
  const currentProviderModels = AVAILABLE_MODELS_TEXT[activeProvider] || [];
  const modelOptions = currentProviderModels.map(m => ({ value: m, label: m }));
  const activeModelForLoading = chatParams.model || apiSettings[activeProvider]?.defaultModel;

  return (
    <div className="flex h-full">
      <ConversationList 
        isOpen={isConversationListOpen} 
        onClose={() => setIsConversationListOpen(false)} 
      />

      <div className="flex flex-col h-full flex-grow p-2 sm:p-4">
        <div className="flex flex-nowrap items-center justify-between sm:justify-end gap-1 sm:gap-2 px-1 mb-2 sm:mb-4">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsConversationListOpen(prev => !prev)} 
            className="p-1.5 sm:p-2 md:hidden flex-shrink-0" 
            title="Daftar Obrolan"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5"/>
            <span className="hidden sm:inline ml-1 text-xs">Obrolan</span>
          </Button>

          <div className="flex flex-nowrap items-center justify-end gap-1 sm:gap-2 flex-grow">
            <ProviderSelector />
            
            {modelOptions.length > 0 && (
              <div className="flex items-center"> 
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline mr-1">Model:</span>
                <Select
                  value={chatParams.model || (modelOptions.length > 0 ? modelOptions[0].value : '')}
                  onChange={(e) => updateChatParams({ model: e.target.value })}
                  options={modelOptions}
                  wrapperClassName="mb-0 min-w-[90px] sm:min-w-[140px]" 
                  className="text-xs sm:text-sm py-1.5" 
                  title="Pilih Model AI untuk Chat"
                />
              </div>
            )}
            
            <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setIsParamsModalOpen(true)} 
                title="Pengaturan Parameter Chat & Preset"
                className="p-1.5 sm:p-2 flex-shrink-0" 
            >
                <SettingsIcon className="w-5 h-5"/> 
                <span className="hidden sm:inline ml-1 text-xs sm:text-sm">Parameter</span>
            </Button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto space-y-4 p-2 sm:p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-inner pb-20 md:pb-6">
          {!activeConversation && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-10">
              <p>Pilih atau buat obrolan baru untuk memulai.</p>
            </div>
          )}
          {currentMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <MessageBubble 
              message={{id: 'loading', text: 'KangSantri AI sedang berpikir...', sender: 'ai', timestamp: new Date(), model: activeModelForLoading}} 
              isLoading={true}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        
        <Modal isOpen={isParamsModalOpen} onClose={() => setIsParamsModalOpen(false)} title="Pengaturan Lanjutan & Preset">
          <div className="space-y-6">
              <div>
                <h4 className="text-md font-semibold mb-2 text-textLight dark:text-textDark border-b pb-1 border-gray-300 dark:border-gray-600">Seleksi Preset</h4>
                <div className="space-y-3 mt-2">
                  <Select
                      label="Preset KangSantri"
                      value={kangSantriPreset} 
                      onChange={(e) => handleModalPresetChange(e.target.value as KangSantriPreset)}
                      options={Object.values(KangSantriPreset).map(p => ({value: p, label: p}))}
                      wrapperClassName="mb-0" className="text-sm py-1.5" title="Pilih Preset KangSantri"
                  />
                </div>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-2 text-textLight dark:text-textDark border-b pb-1 border-gray-300 dark:border-gray-600">Parameter Lanjutan</h4>
                <div className="space-y-3 mt-2">
                  <Textarea label="System Prompt" value={modalSystemPrompt} onChange={(e) => setModalSystemPrompt(e.target.value)} rows={4} placeholder="Contoh: Anda adalah asisten AI yang ramah." className="text-sm"/>
                  <Input label="Temperature (0-1)" type="number" step="0.1" min="0" max="1" value={modalTemperature !== undefined ? modalTemperature : ''} onChange={(e) => setModalTemperature(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="text-sm"/>
                  <Input label="Top P (0-1)" type="number" step="0.05" min="0" max="1" value={modalTopP !== undefined ? modalTopP : ''} onChange={(e) => setModalTopP(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="text-sm"/>
                  <Input label="Max Tokens" type="number" step="128" min="1" value={modalMaxTokens !== undefined ? modalMaxTokens : ''} onChange={(e) => setModalMaxTokens(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} className="text-sm"/>
                </div>
              </div>
          </div>
          <div className="mt-8 flex justify-end"> <Button onClick={handleSaveChatParamsModal}>Simpan & Tutup</Button> </div>
        </Modal>
      </div>
    </div>
  );
};

export default ChatView;
