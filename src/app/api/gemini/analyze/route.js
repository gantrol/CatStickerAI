// app/api/gemini/analyze/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PROMPT_CHINESE = `评估此图片中猫咪贴纸对隐私信息的保护效果。给出1-5的评分（1表示保护效果差，5表示保护效果极佳）。
请你：
1. 检查原始图片中可能存在的敏感信息（个人身份信息、地址、社交账号、人脸等）是否被猫咪贴纸有效遮挡；
2. 评估贴纸的美观度和与图片的融合度；
3. 如果发现有未被遮挡的敏感信息，请具体指出并给出较低评分；
4. 如果所有敏感信息都被很好地遮挡，且贴纸美观可爱，给出较高评分。`

const PROMPT_ENGLISH = `Evaluate the effectiveness of cat stickers in protecting privacy information in this image. Provide a rating from 1 to 5 (1 being "poor protection" and 5 being "excellent protection").
You need to:
1. Check if sensitive information (personal identity, addresses, social accounts, faces, etc.) in the original image has been effectively covered by cat stickers;
2. Evaluate the aesthetic quality of the stickers and how well they blend with the image;
3. If you find any unprotected sensitive information, point it out specifically and give a lower rating;
4. If all sensitive information is well protected and the stickers are cute and aesthetically pleasing, give a higher rating.`


export async function POST(request) {
  try {
    const { originalImage, curtainImage, apiKey: providedApiKey, language = "en" } = await request.json();
    const apiKey = providedApiKey || process.env.GEMINI_API_KEY;
    if (!originalImage) {
      return NextResponse.json({ 
        error: 'Missing original image', 
        details: 'Original image is required for analysis' 
      }, { status: 400 });
    }
    
    if (!curtainImage) {
      return NextResponse.json({ 
        error: 'Missing curtain image', 
        details: 'Protected image is required for analysis' 
      }, { status: 400 });
    }
    console.log("Original Image(B):", originalImage.length); // Debug log
    
    // Extract base64 data from the curtain image URL if it's in data URL format
    let curtainBase64 = curtainImage;
    if (curtainImage && typeof curtainImage === 'string' && curtainImage.startsWith('data:')) {
      curtainBase64 = curtainImage.split(',')[1];
    }
    
    console.log("Curtain Image(B):", curtainBase64?.length); // Debug log

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use structured output model for analysis
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.618,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      }
    });

    // Prepare system prompt to guide the JSON output format
    const systemPrompt = `Please respond in ${language} with JSON format with these exact fields: { \"rating\": number, \"analysis\": string }. The rating should be between 1-5, where 1 means not similar at all and 5 means very similar.`;

    let userPrompt;
    console.log(language)
    if (language === 'en') {
      userPrompt = PROMPT_ENGLISH;
    } else if (language === 'zh') {
      userPrompt = PROMPT_CHINESE;
    } else {
      userPrompt = PROMPT_ENGLISH;
    }
    // Generate content with proper formatting of image data
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: systemPrompt + userPrompt},
          { inlineData: { mimeType: "image/jpeg", data: originalImage } },
          { inlineData: { mimeType: "image/png", data: curtainBase64 } }
        ]
      }]
    });

    const responseText = result.response.text();
    
    // More robust JSON parsing
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', responseText);
      // Fallback parsing if the response isn't properly formatted JSON
      const ratingMatch = responseText.match(/"rating"\s*:\s*(\d+)/);
      const analysisMatch = responseText.match(/"analysis"\s*:\s*"([^"]*)"/);
      
      responseJson = {
        rating: ratingMatch ? parseInt(ratingMatch[1]) : 3,
        analysis: analysisMatch ? analysisMatch[1] : 'Unable to analyze similarity.'
      };
    }

    return NextResponse.json({
      rating: responseJson.rating,
      analysis: responseJson.analysis
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Analysis failed', details: error.message }, { status: 500 });
  }
}