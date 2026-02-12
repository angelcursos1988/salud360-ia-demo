export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { foodText } = req.body;

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Falta GROQ_API_KEY en las variables de entorno" });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // O el modelo de Groq que prefieras
        messages: [
          { role: "system", content: "Responde exclusivamente en formato JSON puro." },
          { role: "user", content: `Analiza nutricionalmente: "${foodText}". 
            Retorna solo este JSON: {"calories": número, "nutrients": {"proteinas": "Xg", "carbohidratos": "Xg", "grasas": "Xg"}}` }
        ],
        temperature: 0
      })
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    // Groq a veces es tan rápido que el parseo es directo
    const content = data.choices[0].message.content.trim();
    
    // Limpieza de posibles marcas de markdown que Groq pueda incluir
    const jsonString = content.replace(/```json|```/g, "");
    const cleanJson = JSON.parse(jsonString);

    res.status(200).json(cleanJson);
  } catch (error) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: "Error con Groq", details: error.message });
  }
}