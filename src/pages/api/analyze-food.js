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
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: `Eres un nutricionista experto que extrae datos en JSON. 
            Clasifica la comida en una de estas categorías: Desayuno, Almuerzo, Comida, Merienda, Cena, Otros.
            Ten en cuenta el contexto del texto para elegir la categoría.` 
          },
          { 
            role: "user", 
            content: `Analiza: "${foodText}". 
            Retorna UNICAMENTE este JSON: 
            {
              "calories": número, 
              "category": "Categoría elegida",
              "nutrients": {"proteinas": "Xg", "carbohidratos": "Xg", "grasas": "Xg"}
            }` 
          }
        ],
        temperature: 0
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonString = content.replace(/```json|```/g, "");
    const cleanJson = JSON.parse(jsonString);

    res.status(200).json(cleanJson);
  } catch (error) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: "Error con Groq", details: error.message });
  }
}