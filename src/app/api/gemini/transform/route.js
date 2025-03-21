// app/api/gemini/transform/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  // try {
    const formData = await request.formData();
    const imageFile = formData.get('image');
    const bytes = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');
    const providedApiKey = formData.get('apiKey');
    const apiKey = providedApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("API key is missing."); // Log missing API key
      return NextResponse.json({ error: 'API key is missing' }, { status: 400 });
    }

    if (!imageFile) {
      console.error("Image file is required."); // Log missing image file
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseModalities: ["Text", "Image"],
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig,
    });

    const history = [
      {
        role: "user",
        parts: [
          { text: `你将处理用户图片，用可爱贴纸遮盖图片中的多种敏感信息。
贴纸尽可能用猫咪元素：猫头、猫爪、猫尾或整只猫等。选择其中合适者，覆盖隐私区域即可

你需要输出遮掩后的图片
            
如果你明白了，那么请回答“明白”` },
        ],
      },
      {
        role: "model",
        parts: [
          { text: "明白" },
        ],
      },
    ];

    const prompt = "";

    let result;

    try {

      const chat = model.startChat({
        generationConfig,
        history,
      });

      const messageParts = [];
      console.log(
        "Base64 image length:",
        base64Image.length,
      );

      messageParts.push({ text: prompt });
      messageParts.push({
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image
        }
      });

      result = await chat.sendMessage(messageParts);
    }
    catch (error) {
      console.error('Gemini API transformation error:', error);
      return NextResponse.json({ error: 'Failed to transform image', details: error.message }, { status: 500 });
    }
    const response = result.response;

    let textResponse = null;
    let imageData = null;
    let mimeType = "image/png";

    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      console.log("Number of parts in response:", parts.length);

      for (const part of parts) {
        if ("inlineData" in part && part.inlineData) {
          // Get the image data
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          console.log(
            "Image data received, length:",
            imageData.length,
            "MIME type:",
            mimeType
          );
        } else if ("text" in part && part.text) {
          // Store the text
          textResponse = part.text;
          console.log(
            "Text response received:",
            textResponse.substring(0, 50) + "..."
          );
        }
      }
    }

    return NextResponse.json({
      image: imageData ? `data:${mimeType};base64,${imageData}` : null,
      description: textResponse || "模型未能生成图片，但没有提供具体原因。"
    });
  // } catch (error) {
  //   console.error("Error generating image:", error);
  //   return NextResponse.json(
  //     {
  //       error: "Failed to generate image",
  //       details: error instanceof Error ? error.message : String(error),
  //     },
  //     { status: 500 }
  //   );
  // }
}