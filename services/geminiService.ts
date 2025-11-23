import { GoogleGenAI, Type } from "@google/genai";

export const getZoneSuggestions = async (locationDescription: string) => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found for Gemini");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Suggest a realistic radius (in meters) and a short description for a geographic zone based on this user input: "${locationDescription}".
      The radius should be appropriate for the type of place (e.g., a building might be 50m, a park 500m, a city district 2000m).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedRadius: { type: Type.INTEGER, description: "Radius in meters" },
            reasoning: { type: Type.STRING, description: "Why this radius was chosen" },
            category: { type: Type.STRING, description: "Category of the location (e.g., Residential, Commercial)" }
          },
          required: ["suggestedRadius", "reasoning", "category"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};