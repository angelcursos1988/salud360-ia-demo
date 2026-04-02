import { callIA } from "./aiClient";
import { buildHealthPrompt } from "./promptBuilder";
import { safeParseIA } from "./outputValidator";

export async function analyzePatient(message) {
  const prompt = buildHealthPrompt(message);

  const aiText = await callIA(prompt);

  return safeParseIA(aiText);
}