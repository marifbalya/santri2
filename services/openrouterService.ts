import { Message, ChatParams } from '../types';
import { APP_NAME } from '../constants'; // Assuming APP_NAME is exported from constants

interface OpenRouterResponseChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason?: string;
  index?: number;
}

interface OpenRouterResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: OpenRouterResponseChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}


interface OpenRouterErrorDetail {
  code: string | null;
  message: string;
  param: string | null;
  type: string;
}
interface OpenRouterErrorResponse {
  error: OpenRouterErrorDetail;
}


const getMimeTypeFromBase64 = (base64String: string): string => {
    if (base64String.startsWith('/9j/')) return 'image/jpeg'; // JPEG
    if (base64String.startsWith('iVBORw0KGgo')) return 'image/png'; // PNG
    if (base64String.startsWith('R0lGOD')) return 'image/gif'; // GIF
    if (base64String.startsWith('UklGR')) return 'image/webp'; // WebP
    // Fallback if no specific signature found, common for data URLs
    if (base64String.includes('data:image/jpeg;base64,')) return 'image/jpeg';
    if (base64String.includes('data:image/png;base64,')) return 'image/png';
    if (base64String.includes('data:image/gif;base64,')) return 'image/gif';
    if (base64String.includes('data:image/webp;base64,')) return 'image/webp';
    return 'image/png'; // Default if unsure
};


export const sendMessageToOpenRouter = async (
  promptText: string,
  history: Message[],
  apiKey: string,
  modelName: string,
  siteUrl: string, // e.g., window.location.origin
  siteName: string, // e.g., APP_NAME
  params?: ChatParams,
  imageBase64?: string
): Promise<string> => {
  if (!apiKey) {
    throw new Error('API Key OpenRouter tidak tersedia.');
  }
  if (!modelName) {
    throw new Error('Nama model OpenRouter tidak diberikan.');
  }

  const messages: any[] = [];

  // 1. Add system prompt if available
  if (params?.system_prompt) {
    messages.push({ role: 'system', content: params.system_prompt });
  }

  // 2. Add history
  history.forEach(msg => {
    // OpenRouter uses 'assistant' for AI responses
    const role = msg.sender === 'user' ? 'user' : 'assistant';
    // For now, assume history messages are text-only for simplicity in this integration
    // If history messages could also contain images, this part would need enhancement
    messages.push({ role: role, content: msg.text });
  });

  // 3. Add current user prompt
  let currentUserContent: any = [{ type: 'text', text: promptText }];

  if (imageBase64) {
    const actualBase64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const mimeType = getMimeTypeFromBase64(actualBase64Data);
    currentUserContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${actualBase64Data}`,
      },
    });
  }
  
  // If only text, content should be a string, not an array of parts
  if (currentUserContent.length === 1 && currentUserContent[0].type === 'text') {
    messages.push({ role: 'user', content: currentUserContent[0].text });
  } else {
    messages.push({ role: 'user', content: currentUserContent });
  }


  const body: any = {
    model: modelName,
    messages: messages,
  };

  if (params?.temperature !== undefined) body.temperature = params.temperature;
  if (params?.top_p !== undefined) body.top_p = params.top_p;
  if (params?.max_tokens !== undefined) body.max_tokens = params.max_tokens;
  // Other params like 'stream', 'stop', 'frequency_penalty', 'presence_penalty' could be added if needed

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": siteUrl,
        "X-Title": siteName,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData: OpenRouterErrorResponse | any = await response.json().catch(() => ({}));
      console.error('OpenRouter API Error:', errorData);
      const errorDetail = errorData?.error;
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      if (errorDetail && typeof errorDetail.message === 'string') {
        errorMessage = `OpenRouter Error: ${errorDetail.message}`;
        if (errorDetail.code) errorMessage += ` (Code: ${errorDetail.code})`;
      } else if (typeof errorData.detail === 'string') { // Other possible error format
        errorMessage = `OpenRouter Error: ${errorData.detail}`;
      }
      
      if (response.status === 401) {
        errorMessage = "API Key OpenRouter tidak valid atau tidak diotorisasi. Periksa API Key Anda.";
      } else if (response.status === 402) {
        errorMessage = "Akun OpenRouter Anda kehabisan kredit. Silakan isi ulang.";
      } else if (response.status === 429) {
        errorMessage = "Terlalu banyak permintaan ke OpenRouter (Rate Limit). Coba lagi nanti.";
      } else if (errorDetail && errorDetail.message && errorDetail.message.includes("Model not found")) {
        errorMessage = `Model OpenRouter "${modelName}" tidak ditemukan atau tidak tersedia.`;
      }

      throw new Error(errorMessage);
    }

    const responseData: OpenRouterResponse = await response.json();

    if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message && responseData.choices[0].message.content) {
      return responseData.choices[0].message.content;
    } else {
      console.warn("Respons OpenRouter tidak memiliki konten yang diharapkan:", responseData);
      throw new Error('Respons OpenRouter tidak valid atau kosong.');
    }

  } catch (error) {
    console.error(`Error calling OpenRouter API (model: ${modelName}):`, error);
    if (error instanceof Error) {
        throw error; // Re-throw if already an Error instance with a good message
    }
    throw new Error('Gagal mendapatkan respons dari OpenRouter: ' + String(error));
  }
};
