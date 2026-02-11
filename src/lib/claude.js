export const chatWithClaude = async (messages) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("API key no configurada");
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        system: "Eres un asistente de salud. Escucha síntomas pero nunca diagnostiques.",
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.message || msg.content
        }))
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Error en API");
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};