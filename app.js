// Focus Booster Beacon - Main Application Logic
class FocusBoosterBeacon {
    constructor() {
        this.audioContext = null;
        this.oscillators = {};
        this.gainNodes = {};
        this.isActive = false;
        this.currentTimer = null;
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.breathingInterval = null;
        this.isBreathing = false;
        this.currentEnvironment = 'default';
        this.activeTask = null;
        this.taskTimer = null;
        
        this.init();
    }

    init() {
        this.setupAudioContext();
        this.setupEventListeners();
        this.createParticles();
        this.updateDisplays();
    }

    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    setupEventListeners() {
        // Main beacon button
        const beaconCore = document.getElementById('beaconCore');
        beaconCore.addEventListener('click', () => this.toggleBeacon());

        // Binaural beat presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const freq = parseInt(e.target.dataset.freq);
                this.setBinauralBeat(freq);
                this.setActiveButton(btn, '.preset-btn');
            });
        });

        // Sliders
        const baseFreq = document.getElementById('baseFreq');
        const beatFreq = document.getElementById('beatFreq');
        const volume = document.getElementById('volume');

        baseFreq.addEventListener('input', (e) => {
            document.getElementById('baseFreqValue').textContent = e.target.value;
            this.updateBinauralBeat();
        });

        beatFreq.addEventListener('input', (e) => {
            document.getElementById('beatFreqValue').textContent = e.target.value;
            this.updateBinauralBeat();
        });

        volume.addEventListener('input', (e) => {
            document.getElementById('volumeValue').textContent = e.target.value;
            this.updateVolume(e.target.value / 100);
        });

        // Ambient sounds
        document.querySelectorAll('.sound-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sound = e.target.dataset.sound;
                this.toggleAmbientSound(sound, btn);
            });
        });

        // Environment selection
        document.querySelectorAll('.env-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const env = e.target.dataset.env;
                this.setEnvironment(env);
                this.setActiveButton(btn, '.env-btn');
            });
        });

        // Timer presets
        document.querySelectorAll('.timer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const time = parseInt(e.target.dataset.time);
                this.setTimer(time);
                this.setActiveButton(btn, '.timer-btn');
            });
        });

        // Breathing toggle
        const breathingToggle = document.getElementById('breathingToggle');
        breathingToggle.addEventListener('click', () => this.toggleBreathing());

        // Micro tasks
        document.querySelectorAll('.task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const task = e.target.dataset.task;
                this.startMicroTask(task);
            });
        });

        // Modal controls
        document.getElementById('closeTask').addEventListener('click', () => this.closeMicroTask());
        document.getElementById('completeTask').addEventListener('click', () => this.completeMicroTask());
    }

    createParticles() {
        const particlesContainer = document.getElementById('particles');
        
        // Create initial particles
        for (let i = 0; i < 50; i++) {
            setTimeout(() => this.createParticle(), i * 100);
        }

        // Continuously create new particles
        setInterval(() => this.createParticle(), 200);
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const x = Math.random() * window.innerWidth;
        const size = Math.random() * 3 + 1;
        const duration = Math.random() * 3 + 3;
        
        particle.style.left = x + 'px';
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.animationDuration = duration + 's';
        
        document.getElementById('particles').appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, duration * 1000);
    }

    toggleBeacon() {
        if (!this.audioContext) {
            this.setupAudioContext();
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isActive = !this.isActive;
        const beaconCore = document.getElementById('beaconCore');
        const statusDisplay = document.getElementById('statusDisplay').querySelector('.status-text');

        if (this.isActive) {
            beaconCore.classList.add('active');
            beaconCore.querySelector('.beacon-text').textContent = 'ACTIVE';
            statusDisplay.textContent = 'HYPERFOCUS ENGAGED';
            this.startBinauralBeat();
            if (this.currentTimer > 0) {
                this.startTimer();
            }
        } else {
            beaconCore.classList.remove('active');
            beaconCore.querySelector('.beacon-text').textContent = 'ACTIVATE';
            statusDisplay.textContent = 'READY TO ENGAGE';
            this.stopBinauralBeat();
            this.stopTimer();
        }
    }

    setBinauralBeat(frequency) {
        document.getElementById('beatFreq').value = frequency;
        document.getElementById('beatFreqValue').textContent = frequency;
        this.updateBinauralBeat();
    }

    startBinauralBeat() {
        if (!this.audioContext) return;

        const baseFreq = parseFloat(document.getElementById('baseFreq').value);
        const beatFreq = parseFloat(document.getElementById('beatFreq').value);
        const volume = parseFloat(document.getElementById('volume').value) / 100;

        // Left channel
        this.oscillators.left = this.audioContext.createOscillator();
        this.gainNodes.left = this.audioContext.createGain();
        
        this.oscillators.left.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        this.oscillators.left.type = 'sine';
        
        // Right channel (with beat frequency)
        this.oscillators.right = this.audioContext.createOscillator();
        this.gainNodes.right = this.audioContext.createGain();
        
        this.oscillators.right.frequency.setValueAtTime(baseFreq + beatFreq, this.audioContext.currentTime);
        this.oscillators.right.type = 'sine';

        // Set volume
        this.gainNodes.left.gain.setValueAtTime(volume * 0.5, this.audioContext.currentTime);
        this.gainNodes.right.gain.setValueAtTime(volume * 0.5, this.audioContext.currentTime);

        // Create stereo panner for left/right separation
        const pannerLeft = this.audioContext.createStereoPanner();
        const pannerRight = this.audioContext.createStereoPanner();
        pannerLeft.pan.setValueAtTime(-1, this.audioContext.currentTime);
        pannerRight.pan.setValueAtTime(1, this.audioContext.currentTime);

        // Connect nodes
        this.oscillators.left.connect(this.gainNodes.left);
        this.gainNodes.left.connect(pannerLeft);
        pannerLeft.connect(this.audioContext.destination);

        this.oscillators.right.connect(this.gainNodes.right);
        this.gainNodes.right.connect(pannerRight);
        pannerRight.connect(this.audioContext.destination);

        // Start oscillators
        this.oscillators.left.start();
        this.oscillators.right.start();
    }

    stopBinauralBeat() {
        if (this.oscillators.left) {
            this.oscillators.left.stop();
            this.oscillators.left = null;
        }
        if (this.oscillators.right) {
            this.oscillators.right.stop();
            this.oscillators.right = null;
        }
    }

    updateBinauralBeat() {
        if (this.isActive && this.oscillators.left && this.oscillators.right) {
            const baseFreq = parseFloat(document.getElementById('baseFreq').value);
            const beatFreq = parseFloat(document.getElementById('beatFreq').value);
            
            this.oscillators.left.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
            this.oscillators.right.frequency.setValueAtTime(baseFreq + beatFreq, this.audioContext.currentTime);
        }
    }

    updateVolume(volume) {
        if (this.gainNodes.left && this.gainNodes.right) {
            this.gainNodes.left.gain.setValueAtTime(volume * 0.5, this.audioContext.currentTime);
            this.gainNodes.right.gain.setValueAtTime(volume * 0.5, this.audioContext.currentTime);
        }
    }

    toggleAmbientSound(soundType, button) {
        // Simple ambient sound simulation using oscillators
        const isActive = button.classList.contains('active');
        
        if (isActive) {
            button.classList.remove('active');
            this.stopAmbientSound(soundType);
        } else {
            button.classList.add('active');
            this.startAmbientSound(soundType);
        }
    }

    startAmbientSound(soundType) {
        if (!this.audioContext) return;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);

        switch (soundType) {
            case 'rain':
                // Simulate rain with filtered noise
                this.createNoiseSource('rain', gainNode, 'highpass', 1000);
                break;
            case 'waves':
                // Simulate waves with low-frequency oscillation
                this.createOscillatorAmbient('waves', gainNode, 80, 'sawtooth');
                break;
            case 'forest':
                // Simulate forest with mixed frequencies
                this.createNoiseSource('forest', gainNode, 'bandpass', 2000);
                break;
            case 'cafe':
                // Simulate cafe with mid-frequency noise
                this.createNoiseSource('cafe', gainNode, 'bandpass', 800);
                break;
            case 'white':
                // Pure white noise
                this.createNoiseSource('white', gainNode);
                break;
        }
    }

    createNoiseSource(name, gainNode, filterType = null, frequency = null) {
        const bufferSize = 4096;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        let finalNode = noise;

        if (filterType && frequency) {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = filterType;
            filter.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            noise.connect(filter);
            finalNode = filter;
        }

        finalNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        noise.start();

        this.oscillators[name] = { source: noise, gain: gainNode };
    }

    createOscillatorAmbient(name, gainNode, frequency, type = 'sine') {
        const oscillator = this.audioContext.createOscillator();
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;

        // Add some modulation for more natural sound
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.frequency.setValueAtTime(0.1, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(10, this.audioContext.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        lfo.start();

        this.oscillators[name] = { oscillator, lfo, gain: gainNode };
    }

    stopAmbientSound(soundType) {
        if (this.oscillators[soundType]) {
            const sound = this.oscillators[soundType];
            if (sound.oscillator) {
                sound.oscillator.stop();
                sound.lfo?.stop();
            }
            if (sound.source) {
                sound.source.stop();
            }
            delete this.oscillators[soundType];
        }
    }

    setEnvironment(env) {
        const container = document.querySelector('.app-container');
        
        // Remove existing environment classes
        container.classList.remove('env-space', 'env-neon', 'env-forest', 'env-ocean');
        
        // Add new environment class
        if (env !== 'default') {
            container.classList.add(`env-${env}`);
        }
        
        this.currentEnvironment = env;
    }

    setTimer(minutes) {
        this.currentTimer = minutes;
        this.timeRemaining = minutes * 60;
        this.updateTimerDisplay();
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.timerComplete();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    timerComplete() {
        this.stopTimer();
        this.isActive = false;
        
        const beaconCore = document.getElementById('beaconCore');
        const statusDisplay = document.getElementById('statusDisplay').querySelector('.status-text');
        
        beaconCore.classList.remove('active');
        beaconCore.querySelector('.beacon-text').textContent = 'COMPLETE';
        statusDisplay.textContent = 'SESSION COMPLETE';
        
        this.stopBinauralBeat();
        
        // Flash the beacon
        beaconCore.style.animation = 'beacon-pulse 0.5s ease-in-out 3';
        
        setTimeout(() => {
            beaconCore.querySelector('.beacon-text').textContent = 'ACTIVATE';
            statusDisplay.textContent = 'READY TO ENGAGE';
            beaconCore.style.animation = '';
        }, 2000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timerDisplay').textContent = display;
    }

    updateDisplays() {
        // Update initial display values
        document.getElementById('baseFreqValue').textContent = document.getElementById('baseFreq').value;
        document.getElementById('beatFreqValue').textContent = document.getElementById('beatFreq').value;
        document.getElementById('volumeValue').textContent = document.getElementById('volume').value;
    }

    toggleBreathing() {
        const button = document.getElementById('breathingToggle');
        const circle = document.getElementById('breathingCircle');
        const text = document.getElementById('breathingText');

        if (this.isBreathing) {
            this.isBreathing = false;
            circle.classList.remove('breathing');
            button.textContent = 'Start Breathing';
            text.textContent = 'Ready';
            if (this.breathingInterval) {
                clearInterval(this.breathingInterval);
            }
        } else {
            this.isBreathing = true;
            circle.classList.add('breathing');
            button.textContent = 'Stop Breathing';
            this.startBreathingGuide();
        }
    }

    startBreathingGuide() {
        const text = document.getElementById('breathingText');
        let phase = 0; // 0: inhale, 1: hold, 2: exhale, 3: hold
        const phases = ['Inhale', 'Hold', 'Exhale', 'Hold'];
        const durations = [4000, 7000, 8000, 1000]; // 4-7-8 breathing technique

        const nextPhase = () => {
            if (!this.isBreathing) return;
            
            text.textContent = phases[phase];
            
            setTimeout(() => {
                phase = (phase + 1) % 4;
                nextPhase();
            }, durations[phase]);
        };

        nextPhase();
    }

    startMicroTask(taskType) {
        this.activeTask = taskType;
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskTitle');
        const content = document.getElementById('taskContent');
        const timer = document.getElementById('taskTimer');

        modal.classList.remove('hidden');

        switch (taskType) {
            case 'pattern':
                title.textContent = 'Pattern Recognition';
                content.innerHTML = this.generatePatternTask();
                timer.textContent = '30';
                this.startTaskTimer(30);
                break;
            case 'memory':
                title.textContent = 'Memory Challenge';
                content.innerHTML = this.generateMemoryTask();
                timer.textContent = '60';
                this.startTaskTimer(60);
                break;
            case 'color':
                title.textContent = 'Color Switch';
                content.innerHTML = this.generateColorTask();
                timer.textContent = '45';
                this.startTaskTimer(45);
                break;
        }
    }

    generatePatternTask() {
        const patterns = ['◆◇◆', '●○●○', '▲▼▲▼', '■□■□'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const options = [pattern + '◆', pattern + '◇', pattern + '●', pattern + '▲'];
        
        return `
            <p>Continue the pattern:</p>
            <div style="font-size: 24px; margin: 16px 0;">${pattern}_</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${options.map(opt => `<button class="btn btn--secondary task-option">${opt.slice(-1)}</button>`).join('')}
            </div>
        `;
    }

    generateMemoryTask() {
        const items = ['Apple', 'Book', 'Clock', 'Door', 'Eagle', 'Fire', 'Glass', 'House', 'Ice', 'Jade'];
        const selected = [];
        for (let i = 0; i < 5; i++) {
            selected.push(items[Math.floor(Math.random() * items.length)]);
        }
        
        return `
            <p>Remember these 5 items:</p>
            <div style="font-size: 18px; margin: 16px 0; padding: 16px; background: rgba(var(--color-teal-300-rgb), 0.1); border-radius: 8px;">
                ${selected.join(' • ')}
            </div>
            <p style="font-size: 14px; color: var(--color-text-secondary);">Study them carefully. You'll need to recall them.</p>
        `;
    }

    generateColorTask() {
        const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE'];
        const colorStyles = { RED: '#ff4444', BLUE: '#4444ff', GREEN: '#44ff44', YELLOW: '#ffff44', PURPLE: '#ff44ff' };
        const word = colors[Math.floor(Math.random() * colors.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return `
            <p>What COLOR is this word displayed in?</p>
            <div style="font-size: 32px; margin: 20px 0; color: ${colorStyles[color]}; font-weight: bold;">
                ${word}
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                ${colors.map(c => `<button class="btn btn--secondary task-option" data-answer="${c}">${c}</button>`).join('')}
            </div>
        `;
    }

    startTaskTimer(seconds) {
        const timer = document.getElementById('taskTimer');
        let timeLeft = seconds;

        this.taskTimer = setInterval(() => {
            timeLeft--;
            timer.textContent = timeLeft;

            if (timeLeft <= 0) {
                this.completeTimerTask();
            }
        }, 1000);
    }

    completeTimerTask() {
        clearInterval(this.taskTimer);
        document.getElementById('taskContent').innerHTML = '<p style="color: var(--color-success); text-align: center;">Time\'s up! Good effort.</p>';
        setTimeout(() => this.closeMicroTask(), 2000);
    }

    completeMicroTask() {
        clearInterval(this.taskTimer);
        document.getElementById('taskContent').innerHTML = '<p style="color: var(--color-success); text-align: center;">Task completed! Brain activated.</p>';
        setTimeout(() => this.closeMicroTask(), 1500);
    }

    closeMicroTask() {
        document.getElementById('taskModal').classList.add('hidden');
        this.activeTask = null;
        if (this.taskTimer) {
            clearInterval(this.taskTimer);
            this.taskTimer = null;
        }
    }

    setActiveButton(button, selector) {
        document.querySelectorAll(selector).forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new FocusBoosterBeacon();
});

// Handle task option clicks
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('task-option')) {
        // Highlight selected option
        e.target.style.background = 'var(--color-success)';
        e.target.style.color = 'white';
        
        // Disable other options
        document.querySelectorAll('.task-option').forEach(opt => {
            if (opt !== e.target) {
                opt.disabled = true;
                opt.style.opacity = '0.5';
            }
        });
        
        setTimeout(() => {
            document.querySelector('#completeTask').click();
        }, 1000);
    }
});