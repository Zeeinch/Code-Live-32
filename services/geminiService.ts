

import { GoogleGenAI, Modality, Part } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStory = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short story, about 50-70 words, based on this prompt: "${prompt}"`,
      config: {
        temperature: 0.8,
        maxOutputTokens: 250,
        thinkingConfig: { thinkingBudget: 50 },
      }
    });
    
    const storyText = response.text;

    if (!storyText || storyText.trim() === '') {
      console.error("Story generation failed. No text found in response. Full API response:", JSON.stringify(response, null, 2));
      const finishReason = response.candidates?.[0]?.finishReason;
      const finishMessage = response.candidates?.[0]?.finishMessage;
      let reason = "The API response did not contain a story.";
      
      if (finishReason) {
          reason = `Story generation stopped. Reason: ${finishReason}.`;
      }
      if (finishMessage) {
          reason += ` Message: ${finishMessage}.`;
      }
      reason += " Check the developer console for the full API response."
      throw new Error(reason);
    }
    
    return storyText;
  } catch (error) {
    console.error("Error generating story:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`Failed to generate story from Gemini API. ${message}`);
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    if (!text?.trim()) {
      throw new Error("Cannot generate speech from empty text.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: text,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });
    
    const audioPart = response.candidates?.[0]?.content?.parts?.[0];

    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      console.error("Audio generation failed. No audio data found in the expected part. Full API response:", JSON.stringify(response, null, 2));
      
      const finishReason = response.candidates?.[0]?.finishReason;
      const finishMessage = response.candidates?.[0]?.finishMessage;
      let reason = "The response did not contain audio data.";
      
      if (finishReason) {
          reason = `Finish reason: ${finishReason}.`;
      }
      if (finishMessage) {
          reason += ` Message: ${finishMessage}.`;
      }
      reason += " Check the developer console for the full API response."
      throw new Error(reason);
    }
    
    return audioPart.inlineData.data;

  } catch (error) {
    console.error("Error generating speech:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    if (message.includes("Finish reason:") || message.includes("Story generation stopped")) {
        throw new Error(`Failed to generate speech. ${message}`);
    }
    throw new Error(`Failed to generate speech from Gemini API. ${message}`);
  }
};