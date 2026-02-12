export default async function handler(req, res) {
  const { foodText } = req.body;

  const prompt = `Analiza el siguiente texto de comida y devuelve UNICAMENTE un objeto JSON con este formato: 
  {"calories": número_estimado, "nutrients": {"proteinas": "gramos", "carbohidratos": "gramos", "grasas": "gramos"}}.
  Texto: "${foodText}"`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Error analizando nutrición" });
  }
}