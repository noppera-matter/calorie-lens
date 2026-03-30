document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('captureBtn');
    const loader = document.getElementById('loader');
    const resultPanel = document.getElementById('resultPanel');
    const closeResultBtn = document.getElementById('closeResultBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const apiKeyInput = document.getElementById('apiKey');
    const shutterSoundInput = document.getElementById('shutterSound');

    // Load saved settings
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) apiKeyInput.value = savedKey;
    
    const savedSound = localStorage.getItem('SHUTTER_SOUND');
    shutterSoundInput.checked = (savedSound === null) ? true : (savedSound === 'true');

    // Initialize Camera
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, 
                audio: false 
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Camera access failed:", err);
            alert("카메라를 시작할 수 없습니다. 권한을 확인해주세요.");
        }
    }

    // Sound Effect Synthesizer
    function playShutterSound() {
        if (!shutterSoundInput.checked) return;
        
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Generate noise for shutter sound
        const bufferSize = audioCtx.sampleRate * 0.1; // 0.1s
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = buffer;

        // Filter for "click" feel
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        noiseSource.start();
        noiseSource.stop(audioCtx.currentTime + 0.1);
    }

    // Capture Photo
    captureBtn.addEventListener('click', async () => {
        playShutterSound();
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        
        // Show loading
        loader.classList.remove('hidden');
        
        try {
            const apiKey = apiKeyInput.value.trim();
            const analysis = await analyzeImage(base64Image, apiKey);
            updateUI(analysis);
        } catch (error) {
            console.error("Analysis failed:", error);
            alert(`분석 중 오류가 발생했습니다:\n${error.message}`);
        } finally {
            loader.classList.add('hidden');
        }
    });

    // Update UI with results
    function updateUI(data) {
        document.getElementById('calValue').innerText = data.totalCalories;
        document.getElementById('carValue').innerText = (data.carbs || 0) + 'g';
        document.getElementById('proValue').innerText = (data.protein || 0) + 'g';
        document.getElementById('fatValue').innerText = (data.fat || 0) + 'g';
        
        // Update bars
        const maxMacro = Math.max(data.carbs || 0, data.protein || 0, data.fat || 0, 1);
        document.getElementById('carBar').style.width = ((data.carbs / maxMacro) * 100) + '%';
        document.getElementById('proBar').style.width = ((data.protein / maxMacro) * 100) + '%';
        document.getElementById('fatBar').style.width = ((data.fat / maxMacro) * 100) + '%';
        
        // Update food list
        const foodList = document.getElementById('foodList');
        foodList.innerHTML = '';
        data.foods.forEach(food => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${food.name}</span><span>${food.calories}kcal</span>`;
            foodList.appendChild(li);
        });

        document.getElementById('aiReasoning').innerText = data.reasoning || "손 크기를 기준으로 분석된 추정치입니다.";
        
        // Show result panel
        resultPanel.classList.add('visible');
    }

    // Modal & Panel Controls
    closeResultBtn.addEventListener('click', () => {
        resultPanel.classList.remove('visible');
    });

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    saveSettingsBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        localStorage.setItem('GEMINI_API_KEY', key);
        localStorage.setItem('SHUTTER_SOUND', shutterSoundInput.checked);
        settingsModal.classList.add('hidden');
        alert("설정이 저장되었습니다.");
    });

    // Handle outside click for modal
    window.onclick = (event) => {
        if (event.target == settingsModal) {
            settingsModal.classList.add('hidden');
        }
    }

    initCamera();
});
