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
    const { image, text, mediaType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const prompt = text || `أنت خبير تغذية. حلل هذا الطعام في الصورة وأرجع النتيجة بصيغة JSON صالحة فقط بدون أي نص إضافي أو علامات markdown. الشكل المطلوب:
{
  "dish_name": "اسم الطبق بالعربية",
  "confidence": "عالية",
  "items": [
    {
      "name": "اسم المكون بالعربية",
      "amount_g": 100,
      "calories": 50,
      "protein": 1,
      "carbs": 12,
      "fat": 0
    }
  ]
}

ملاحظات مهمة:
- confidence: استخدم فقط "عالية" أو "متوسطة" أو "منخفضة"
- amount_g: الكمية بالجرام كرقم
- جميع القيم الغذائية أرقام (لا نصوص)
- اذكر كل مكون رئيسي مرئي في الصورة منفصلاً
- أرجع JSON فقط`;

    const parts = [{ text: prompt }];

    if (image) {
      parts.push({
        inline_data: {
          mime_type: mediaType || "image/jpeg",
          data: image.replace(/^data:image\/\w+;base64,/, "")
        }
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: parts }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "Gemini API error" });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!parsed || !parsed.items) {
      return res.status(500).json({ error: "تعذر تحليل الطعام، حاول بصورة أوضح" });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
