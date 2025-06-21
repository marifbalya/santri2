
import React, { useState, useContext, useEffect } from 'react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { AppContext } from '../../contexts/AppContext';
import { AIProvider } from '../../types';
import { DEFAULT_IMAGE_GEN_MODEL_GEMINI, AVAILABLE_MODELS_IMAGE_GEN } from '../../constants';
import { generateImageWithGemini } from '../../services/imageGenService';
import { ImageIcon as PageIcon, SparklesIcon } from '../ui/Icons'; // Updated icon usage

const ImageGenView: React.FC = () => {
  const { apiSettings } = useContext(AppContext);
  const [prompt, setPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>(''); // Kept for potential future use or prompt engineering
  const [numImages, setNumImages] = useState<number>(1); // Kept, as Gemini API supports it
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Provider is fixed to Gemini
  const selectedProvider = AIProvider.GEMINI; 
  const [selectedImageModel, setSelectedImageModel] = useState<string>(DEFAULT_IMAGE_GEN_MODEL_GEMINI);

  const geminiModelsForImage = AVAILABLE_MODELS_IMAGE_GEN[AIProvider.GEMINI] || [];
  const imageModelOptions = geminiModelsForImage.map(m => ({ value: m, label: m }));

  useEffect(() => {
    // Ensure selected model is valid for Gemini, or default
    if (geminiModelsForImage.length > 0) {
      if (!geminiModelsForImage.includes(selectedImageModel)) {
        setSelectedImageModel(geminiModelsForImage[0]);
      }
    } else {
      setSelectedImageModel(''); // Should not happen if constants are correct
    }
  }, [selectedImageModel, geminiModelsForImage]);


  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError("Prompt tidak boleh kosong.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    const currentProviderSettings = apiSettings[selectedProvider]; // Always Gemini
    const activeApiKeyEntry = currentProviderSettings?.apiKeys.find(k => k.isDefault && k.apiKey);

    if (!activeApiKeyEntry || !activeApiKeyEntry.apiKey) {
      setError(`API Key aktif untuk ${selectedProvider} belum diatur atau tidak valid. Silakan periksa Pengaturan.`);
      setIsLoading(false);
      return;
    }
    const apiKeyToUse = activeApiKeyEntry.apiKey;
    
    if (!selectedImageModel) {
        setError(`Tidak ada model gambar yang dipilih atau tersedia untuk Gemini.`);
        setIsLoading(false);
        return;
    }

    // For Gemini, negative prompts are often part of the main prompt.
    // We can construct the final prompt here if needed.
    let finalPrompt = prompt;
    if (negativePrompt.trim()) {
      // Example of incorporating negative prompt, adjust based on Gemini's best practices
      finalPrompt = `${prompt.trim()}, ((Kualitas Rendah, Teks, Watermark, ${negativePrompt.trim()}))`;
    }

    try {
      const images: string[] = await generateImageWithGemini(
        finalPrompt, 
        apiKeyToUse, 
        selectedImageModel, 
        numImages
        // Negative prompt is now part of finalPrompt for Gemini
      );
      setGeneratedImages(images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat gambar.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <PageIcon className="w-7 h-7 text-primary dark:text-primary-light" />
        <h2 className="text-2xl font-semibold text-textLight dark:text-textDark">Generate Gambar dengan Gemini</h2>
      </div>
      
      {geminiModelsForImage.length > 1 && ( // Only show selector if multiple Gemini models are available
        <Select
            label="Pilih Model Gambar Gemini"
            options={imageModelOptions}
            value={selectedImageModel}
            onChange={(e) => setSelectedImageModel(e.target.value)}
            wrapperClassName="max-w-md"
        />
      )}

      <Textarea
        label="Prompt Gambar"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Contoh: Kucing lucu memakai topi penyihir, gaya fantasi digital art."
        rows={4}
        className="text-base"
      />
      <Textarea
        label="Prompt Negatif (Opsional, akan digabung ke prompt utama)"
        value={negativePrompt}
        onChange={(e) => setNegativePrompt(e.target.value)}
        placeholder="Contoh: buram, kualitas rendah, teks, watermark, tangan jelek"
        rows={2}
        className="text-sm"
      />
      {/* 
      <Input
        label="Jumlah Gambar (1-4, tergantung model)"
        type="number"
        value={numImages}
        min={1}
        max={4} 
        onChange={(e) => setNumImages(parseInt(e.target.value))}
        wrapperClassName="max-w-xs"
      />
      */}

      <Button 
        onClick={handleGenerateImage} 
        isLoading={isLoading} 
        disabled={isLoading || !selectedImageModel || !prompt.trim()}
        leftIcon={isLoading ? undefined : <SparklesIcon className="w-5 h-5"/>}
        size="lg"
        className="w-full sm:w-auto"
      >
        {isLoading ? 'Sedang Membuat...' : 'Generate Gambar'}
      </Button>

      {error && <p className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-md">{error}</p>}

      {isLoading && (
        <div className="flex flex-col justify-center items-center py-10 text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-textLight dark:text-textDark text-lg">AI sedang melukis imajinasi Anda...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Proses ini mungkin memakan waktu beberapa saat.</p>
        </div>
      )}

      {generatedImages.length > 0 && !isLoading && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-textLight dark:text-textDark">Hasil Gambar:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4"> {/* Max 2 columns for better display */}
            {generatedImages.map((imageBase64, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-lg bg-gray-50 dark:bg-gray-800 group relative">
                <img 
                    src={`data:image/jpeg;base64,${imageBase64}`} 
                    alt={`Generated image ${index + 1}`} 
                    className="w-full h-auto object-contain aspect-square" 
                />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = `data:image/jpeg;base64,${imageBase64}`;
                            link.download = `kangsantri_ai_img_${prompt.substring(0,20).replace(/\s/g,'_')}_${Date.now()}.jpg`;
                            link.click();
                        }}
                        title="Unduh Gambar"
                        className="shadow-md"
                    >
                        Unduh
                    </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
       {!isLoading && generatedImages.length === 0 && !error && (
         <div className="text-center py-12 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8">
            <PageIcon className="w-20 h-20 mx-auto mb-6 opacity-30" />
            <p className="text-lg font-medium">Masukkan prompt di atas dan klik "Generate Gambar".</p>
            <p className="text-sm">Biarkan AI Gemini mewujudkan ide visual Anda!</p>
         </div>
       )}
    </div>
  );
};

export default ImageGenView;