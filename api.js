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

    // 검증된 모델 및 버전 조합 리스트
    const attemptConfigs = [
        { version: 'v1', model: 'gemini-1.5-flash-8b' },
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1', model: 'gemini-1.5-pro' },
        { version: 'v1beta', model: 'gemini-1.5-pro' }
    ];

    let lastError = null;

    for (const config of attemptConfigs) {
        try {
            console.log(`Trying ${config.model} with ${config.version}...`);
            const response = await fetch(`https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "사용자가 촬영한 음식 사진과 손(Size Reference)이 함께 있습니다. 손의 크기를 기준으로 음식의 실제 부피와 양을 가늠하여 총 칼로리와 영양 성분을 분석해주세요. 반드시 한국어로 답변하고, 아래 JSON 형식만 반환하세요. JSON 외의 텍스트는 포함하지 마세요.\n\nJSON 형식:\n{\n  \"totalCalories\": 0,\n  \"carbs\": 0,\n  \"protein\": 0,\n  \"fat\": 0,\n  \"foods\": [{\"name\": \"음식명\", \"calories\": 0}],\n  \"reasoning\": \"손 크기와 대조하여 어떻게 양을 계산했는지에 대한 설명\"\n}" },
                            { inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] } }
                        ]
                    }]
                })
            });

            const data = await response.json();

            if (data.error) {
                lastError = data.error.message;
                console.warn(`Failed ${config.model}: ${lastError}`);
                continue; 
            }

            if (!data.candidates || data.candidates.length === 0) {
                lastError = "AI 분석 결과가 없습니다.";
                continue;
            }

            const text = data.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("AI 응답 형식이 올바르지 않습니다.");

        } catch (error) {
            lastError = error.message;
            console.warn(`${config.model} (${config.version}) 네트워크 오류:`, error);
        }
    }

    throw new Error(`모든 모델 시도 실패. 마지막 에러: ${lastError}`);
}
