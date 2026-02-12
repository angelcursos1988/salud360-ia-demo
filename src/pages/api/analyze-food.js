export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { foodText } = req.body;

  // 1. Verificación de API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: Falta OPENAI_API_KEY en variables de entorno");
    return res.status(500).json({ error: "Configuración del servidor incompleta (API Key)" });
  }

  const prompt = `Analiza: "${foodText}". 
  Responde UNICAMENTE un objeto JSON con este formato:
  {"calories": 300, "nutrients": {"proteinas": "10g", "carbohidratos": "20g", "grasas": "5g"}}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Eres un asistente que solo responde en JSON puro." },
          { role: "user", content: prompt }
        ],
        temperature: 0
      })
    });

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error("OpenAI no devolvió resultados");
    }

    let rawContent = data.choices[0].message.content.trim();
    
    // 2. Limpiador de JSON (Elimina posibles backticks o texto extra)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se encontró JSON en la respuesta");
    
    const cleanJson = JSON.parse(jsonMatch[0]);

    res.status(200).json({
      calories: cleanJson.calories || 0,
      nutrients: cleanJson.nutrients || {}
    });

  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ error: "Error en el análisis", details: error.message });
  }
}