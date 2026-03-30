async function analyzeImage(base64Image, apiKey) {
    if (!apiKey) {
        console.warn("API Key is missing. Returning simulation data.");
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    totalCalories: 540,
                    carbs: 65,
                    protein: 22,
                    fat: 18,
                    foods: [
                        { name: "페퍼로니 피자 (1조각)", calories: 350 },
                        { name: "콜라 (355ml)", calories: 140 },
                        { name: "갈릭 디핑 소스", calories: 50 }
                    ],
                    reasoning: "사용자의 손 크기를 기준으로 피자 1조각의 면적을 계산했을 때, 약 15cm 길이의 표준 조각으로 추정됩니다. 이를 기반으로 일반적인 화덕 피자 칼로리 데이터를 적용했습니다."
                });
            }, 2000);
        });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "사용자가 촬영한 음식 사진과 손(Size Reference)이 함께 있습니다. 손의 크기를 기준으로 음식의 실제 부피와 양을 가늠하여 총 칼로리와 영양 성분을 분석해주세요. 반드시 한국어로 답변하고, 아래 JSON 형식만 반환하세요. JSON 외의 텍스트는 포함하지 마세요.\n\nJSON 형식:\n{\n  \"totalCalories\": 0,\n  \"carbs\": 0,\n  \"protein\": 0,\n  \"fat\": 0,\n  \"foods\": [{\"name\": \"음식명\", \"calories\": 0}],\n  \"reasoning\": \"손 크기와 대조하여 어떻게 양을 계산했는지에 대한 설명\"\n}" },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Image.split(',')[1]
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Gemini API Error: ${data.error.message}`);
        }

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("AI 분석 결과가 없습니다. (Safety filter or empty response)");
        }

        const text = data.candidates[0].content.parts[0].text;
        
        // Extract JSON from the response text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (pErr) {
                console.error("JSON Parse Error:", text);
                throw new Error("AI 응답 형식이 올바르지 않습니다.");
            }
        }
        throw new Error("AI 분석 결과 형식이 잘못되었습니다.");
    } catch (error) {
        console.error("Detailed API Error:", error);
        throw error;
    }
}
