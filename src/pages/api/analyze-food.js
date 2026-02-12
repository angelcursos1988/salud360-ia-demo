export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { foodText } = req.body;

  // DEBUG: Si no hay API KEY, devolvemos un error claro para que lo veas en la consola
  if (!process.env.OPENAI_API_KEY) {
    console.error("FALTA API KEY");
    return res.status(500).json({ 
      error: "Error de configuración", 
      details: "La clave de OpenAI no está configurada en el servidor." 
    });
  }

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
          { role: "system", content: "Eres un nutricionista que solo responde en JSON." },
          { role: "user", content: `Analiza "${foodText}" y responde solo JSON: {"calories": número, "nutrients": {"proteinas": "Xg", "carbohidratos": "Xg", "grasas": "Xg"}}` }
        ],
        temperature: 0
      })
    });

    const data = await response.json();

    // Si OpenAI devuelve error (ej: clave inválida o cuota agotada)
    if (data.error) {
      console.error("Error de OpenAI:", data.error);
      return res.status(500).json({ error: "OpenAI falló", details: data.error.message });
    }

    const cleanJson = JSON.parse(data.choices[0].message.content.trim());
    res.status(200).json(cleanJson);

  } catch (error) {
    // Si el JSON.parse falla o hay un error de red
    res.status(500).json({ error: "Fallo en el proceso", details: error.message });
  }
}