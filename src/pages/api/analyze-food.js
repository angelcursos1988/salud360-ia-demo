export default async function handler(req, res) {
  const { foodText } = req.body;

  if (!foodText) {
    return res.status(400).json({ error: "No se proporcionó texto de comida" });
  }

  const prompt = `Actúa como un nutricionista experto. Analiza el siguiente texto: "${foodText}". 
  Devuelve ÚNICAMENTE un objeto JSON puro, sin texto adicional, con esta estructura:
  {
    "calories": número_entero_estimado,
    "nutrients": {
      "proteinas": "gramos",
      "carbohidratos": "gramos",
      "grasas": "gramos"
    }
  }`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: "Eres un extractor de datos nutricionales en formato JSON." }, { role: "user", content: prompt }],
        temperature: 0.1 // Temperatura baja para que sea más preciso y no alucine
      })
    });

    const data = await response.json();
    
    // Limpieza de seguridad por si la IA envía backticks o texto extra
    let content = data.choices[0].message.content.trim();
    if (content.includes("```json")) {
      content = content.split("```json")[1].split("```")[0];
    }
    
    const result = JSON.parse(content);
    
    // Devolvemos el resultado asegurándonos de que calories exista
    res.status(200).json({
      calories: result.calories || 0,
      nutrients: result.nutrients || {}
    });

  } catch (error) {
    console.error("Error en API Analyze Food:", error);
    res.status(500).json({ error: "Error analizando nutrición", details: error.message });
  }
}