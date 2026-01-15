
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiRefinement } from "../types";

// Refine task uses process.env.API_KEY exclusively as per guidelines
export async function refineTask(taskText: string): Promise<GeminiRefinement> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Decompose this task into a few logical subtasks and categorize it: "${taskText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 3-5 subtasks to complete the main task."
            },
            estimatedTime: {
              type: Type.STRING,
              description: "Estimated total time for the task."
            },
            category: {
              type: Type.STRING,
              description: "A one-word category for the task."
            }
          },
          required: ["subtasks", "estimatedTime", "category"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as GeminiRefinement;
  } catch (error) {
    console.error("Gemini Refinement Error:", error);
    return {
      subtasks: ["Unable to decompose task", "Check system environment settings"],
      estimatedTime: "Unknown",
      category: "Error"
    };
  }
}
