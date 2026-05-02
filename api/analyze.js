import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, text } = req.body;

    const content = [];

    if (image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: image.replace(/^data:image\/\w+;base64,/, "")
        }
      });
    }

    content.push({
      type: "text",
      text: text || "حلل هذا الطعام واذكر السعرات الحرارية والبروتين والكربوهيدرات والدهون. أرجع النتيجة بصيغة JSON فقط بهذا الشكل: {\"name\":\"اسم الطعام\",\"calories\":number,\"protein\":number,\"carbs\":number,\"fat\":number}"
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: responseText };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
