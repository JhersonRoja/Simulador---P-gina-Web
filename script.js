document.addEventListener('DOMContentLoaded', () => {
    const oscCanvas = document.getElementById('oscCanvas');
    const oscCtx = oscCanvas.getContext('2d');
    
    const genCanvas = document.getElementById('generatorCanvas');
    const genCtx = genCanvas.getContext('2d');
    
    const valVPeak = document.getElementById('valVPeak');
    const valVRms = document.getElementById('valVRms');
    const valVInst = document.getElementById('valVInst');
    const valFreq = document.getElementById('valFreq');
    const overlayRpm = document.getElementById('overlayRpm');
    const systemStatus = document.getElementById('systemStatus');
    
    const btnsPreset = document.querySelectorAll('.btn-preset');
    const sliderB = document.getElementById('sliderB');
    const lblB = document.getElementById('lblB');
    const sliderN = document.getElementById('sliderN');
    const lblN = document.getElementById('lblN');
    const sliderA = document.getElementById('sliderA');
    const lblA = document.getElementById('lblA');

    let state = {
        rpm: 36,
        B: 0.5,      // Tesla
        N: 2,        // Número de espiras (1 a 4)
        A: 0.02,     // m^2
        angle: 0,
        history: [],
        maxHistory: 300
    };

    btnsPreset.forEach(btn => {
        btn.addEventListener('click', (e) => {
            btnsPreset.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.rpm = parseInt(e.target.dataset.rpm);
            overlayRpm.textContent = state.rpm;
            
            if(state.rpm === 0) {
                systemStatus.textContent = "DETENIDO";
                systemStatus.style.color = "#ff3366";
            } else {
                systemStatus.textContent = "EN LÍNEA";
                systemStatus.style.color = "#00ff66";
            }
        });
    });

    sliderB.addEventListener('input', (e) => {
        state.B = parseFloat(e.target.value);
        lblB.textContent = state.B.toFixed(1) + ' T';
    });
    
    sliderN.addEventListener('input', (e) => {
        state.N = parseInt(e.target.value);
        lblN.textContent = `${state.N} ${state.N === 1 ? 'Espira' : 'Espiras'}`;
    });

    sliderA.addEventListener('input', (e) => {
        state.A = parseFloat(e.target.value);
        lblA.textContent = state.A.toFixed(2) + ' m²';
    });

    function updatePhysics(dt) {
        const omega = (state.rpm * 2 * Math.PI) / 60;
        const freq = state.rpm / 60;
        
        state.angle += omega * dt;
        if (state.angle > Math.PI * 2) state.angle -= Math.PI * 2;

        // Vpico = N * B * A * omega
        const vPeak = state.N * state.B * state.A * omega;
        state.vPeak = vPeak;
        const vRms = vPeak / Math.SQRT2;
        const vInst = state.rpm > 0 ? vPeak * Math.sin(state.angle) : 0;

        state.history.push(vInst);
        if (state.history.length > state.maxHistory) {
            state.history.shift();
        }

        if (!midiendo) {
        valVPeak.innerHTML = `${vPeak.toFixed(3)} <span class="unit">V</span>`;
        }
        valVRms.innerHTML = `${vRms.toFixed(3)} <span class="unit">V</span>`;
        valVInst.innerHTML = `${vInst.toFixed(3)} <span class="unit">V</span>`;
        valFreq.innerHTML = `${freq.toFixed(3)} <span class="unit">Hz</span>`;
    }

    function drawOscilloscope() {
        oscCtx.clearRect(0, 0, oscCanvas.width, oscCanvas.height);
        const width = oscCanvas.width;
        const height = oscCanvas.height;
        const midY = height / 2;

        oscCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        oscCtx.lineWidth = 1;
        oscCtx.beginPath();
        oscCtx.moveTo(0, midY);
        oscCtx.lineTo(width, midY);
        oscCtx.stroke();
        

        if (state.history.length === 0) return;

        oscCtx.beginPath();
        oscCtx.strokeStyle = '#00ff66';
        oscCtx.lineWidth = 2;
        

        // Escala vertical
        const maxV = state.N * state.B * state.A * ((60 * 2 * Math.PI) / 60); // ~3.77V
        const scaleY = (height / 2 - 15) / maxV;
        oscCtx.fillStyle = 'rgba(255,255,255,0.4)';
        oscCtx.font = '11px monospace';
        oscCtx.textAlign = 'left';
        oscCtx.fillText('0V', 6, midY - 6);
        oscCtx.fillText(`+${maxV.toFixed(2)}V`, 6, 14);
        oscCtx.fillText(`-${maxV.toFixed(2)}V`, 6, height - 6);

        for (let i = 0; i < state.history.length; i++) {
            const x = (i / state.maxHistory) * width;
            const y = midY - (state.history[i] * scaleY);

            if (i === 0) oscCtx.moveTo(x, y);
            else oscCtx.lineTo(x, y);
        }
        oscCtx.stroke();
    }

    function drawGenerator() {
        genCtx.clearRect(0, 0, genCanvas.width, genCanvas.height);
        
        const cx = genCanvas.width / 2;
        const cy = genCanvas.height / 2;
        
        const statorRadius = 110 + (state.A * 200); 
        const rotorRadius = 65;

        // 1. Estator
        genCtx.save();
        genCtx.translate(cx, cy);
        
        genCtx.beginPath();
        genCtx.arc(0, 0, statorRadius + 18, 0, Math.PI * 2);
        genCtx.fillStyle = '#1a1d26';
        genCtx.fill();
        genCtx.strokeStyle = '#2a2f45';
        genCtx.lineWidth = 4;
        genCtx.stroke();

        // Dibujar exactamente N espiras (1 a 4 espiras)
        const angles = [
            -Math.PI / 2,                  // 1: Arriba
            Math.PI / 2,                   // 2: Abajo
            0,                             // 3: Derecha
            Math.PI                        // 4: Izquierda
        ];

        for (let i = 0; i < state.N; i++) {
            genCtx.save();
            genCtx.rotate(angles[i] + Math.PI/2);

            // Estructura de la bobina
            genCtx.strokeStyle = '#c86b3c';
            genCtx.lineWidth = 14;
            genCtx.lineCap = 'round';
            genCtx.beginPath();
            genCtx.arc(0, -statorRadius, 18, Math.PI, 0);
            genCtx.stroke();
            
            // Núcleo
            genCtx.strokeStyle = '#e6844d';
            genCtx.lineWidth = 2;
            for (let j = -12; j <= 12; j += 4) {
                genCtx.beginPath();
                genCtx.moveTo(j, -statorRadius - 5);
                genCtx.lineTo(j, -statorRadius + 5);
                genCtx.stroke();
            }
            genCtx.restore();
        }
        genCtx.restore();

        // 2. Rotor Magnético
        genCtx.save();
        genCtx.translate(cx, cy);
        genCtx.rotate(state.angle);

        // Halo del campo magnético (B)
        const glowOpacity = (state.B / 1.5) * 0.4;
        const gradient = genCtx.createRadialGradient(0,0,rotorRadius-10, 0,0,rotorRadius+25);
        gradient.addColorStop(0, `rgba(0, 243, 255, ${glowOpacity})`);
        gradient.addColorStop(1, 'transparent');
        genCtx.fillStyle = gradient;
        genCtx.beginPath();
        genCtx.arc(0,0, rotorRadius+30, 0, Math.PI*2);
        genCtx.fill();

        // Polo Norte (Rojo)
        genCtx.beginPath();
        genCtx.arc(0, 0, rotorRadius, -Math.PI/2, Math.PI/2);
        genCtx.fillStyle = '#cc2936';
        genCtx.fill();
        
        // Polo Sur (Azul)
        genCtx.beginPath();
        genCtx.arc(0, 0, rotorRadius, Math.PI/2, -Math.PI/2);
        genCtx.fillStyle = '#087e8b';
        genCtx.fill();

        // Eje
        genCtx.beginPath();
        genCtx.arc(0, 0, 14, 0, Math.PI*2);
        genCtx.fillStyle = '#d0d4dc';
        genCtx.fill();
        genCtx.strokeStyle = '#758297';
        genCtx.lineWidth = 2;
        genCtx.stroke();

        // Textos N y S
        genCtx.fillStyle = '#fff';
        genCtx.font = 'bold 18px Orbitron';
        genCtx.textAlign = 'center';
        genCtx.textBaseline = 'middle';
        genCtx.fillText('N', 32, 0);
        genCtx.fillText('S', -32, 0);

        genCtx.restore();
    }

    let lastTime = performance.now();

    function loop(currentTime) {
        const dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        updatePhysics(dt);
        drawOscilloscope();
        drawGenerator();

        requestAnimationFrame(loop);
    }

        // --- Módulo de medición: congela el Voltaje Pico con ruido de instrumento ---
    let midiendo = false;
    let contadorLecturas = 0;

    const estiloMedicion = document.createElement('style');
    estiloMedicion.textContent = `
      .valor-congelado {
        color: #ffcc00 !important;
        text-shadow: 0 0 10px rgba(255,204,0,0.6);
        transition: color 0.3s ease, text-shadow 0.3s ease;
      }
      .flash-medicion { animation: flashReading 0.4s ease; }
      @keyframes flashReading {
        0% { background-color: rgba(255,204,0,0.2); }
        100% { background-color: transparent; }
      }
      .panel-medicion {
        background: #1a1d26;
        border: 1px solid #2a2f45;
        border-radius: 10px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
        font-family: inherit;
      }
      .btn-medir, .btn-reset {
        border: none;
        border-radius: 6px;
        padding: 10px 18px;
        font-weight: bold;
        cursor: pointer;
        font-size: 13px;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
      .btn-medir { background: #00ff66; color: #061a0d; }
      .btn-medir:hover { background: #33ff88; }
      .btn-medir:disabled { background: #2a2f45; color: #5a6376; cursor: not-allowed; }
      .btn-reset { background: #2a2f45; color: #9aa3b2; }
      .btn-reset:hover { background: #363c56; color: #fff; }
      .texto-lectura { font-family: monospace; font-size: 13px; color: #9aa3b2; margin: 0; flex: 1; min-width: 180px; }
      .texto-precision { font-family: monospace; font-size: 11px; color: #5a6376; margin: 4px 0 0; width: 100%; }
    `;
    document.head.appendChild(estiloMedicion);

    const filaStats = valFreq.closest('[class]').parentElement;

    const panelMedicion = document.createElement('div');
    panelMedicion.className = 'panel-medicion';
    panelMedicion.style.marginTop = '14px';
    panelMedicion.innerHTML = `
        <button class="btn-medir" id="btnMedir">📏 Tomar Lectura</button>
        <button class="btn-reset" id="btnReset">↺ Reiniciar contador</button>
        <p class="texto-lectura" id="etiquetaLectura">Selecciona un RPM y mide</p>
        <p class="texto-precision">Precisión del instrumento: ±3% (simula el margen de error real de un multímetro)</p>
    `;
    filaStats.insertAdjacentElement('afterend', panelMedicion);

    const btnLeer = panelMedicion.querySelector('#btnMedir');
    const btnReset = panelMedicion.querySelector('#btnReset');
    const etiquetaLectura = panelMedicion.querySelector('#etiquetaLectura');

    btnLeer.addEventListener('click', () => {
        if (midiendo) return;

        if (state.rpm === 0) {
            etiquetaLectura.textContent = '⚠ Selecciona una velocidad antes de medir';
            return;
        }

        const ruido = 0.97 + Math.random() * 0.06;
        const lectura = state.vPeak * ruido;

        midiendo = true;
        contadorLecturas++;

        valVPeak.innerHTML = `${lectura.toFixed(3)} <span class="unit">V</span>`;
        valVPeak.classList.add('valor-congelado', 'flash-medicion');
        etiquetaLectura.textContent = `Lectura #${contadorLecturas} registrada a ${state.rpm} RPM`;

        setTimeout(() => {
            valVPeak.classList.remove('valor-congelado', 'flash-medicion');
            midiendo = false;
        }, 1200);
    });

    btnReset.addEventListener('click', () => {
        contadorLecturas = 0;
        etiquetaLectura.textContent = 'Contador reiniciado — selecciona un RPM y mide';
    });
    requestAnimationFrame(loop);
});