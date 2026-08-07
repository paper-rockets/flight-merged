export function initWaterEditor(getWaterUniformsCallback, updateBiomeSettingsCallback) {
    const editorEl = document.getElementById('water-editor');
    if (!editorEl) return;

    // Tabs
    const tabBtns = editorEl.querySelectorAll('.tab-btn');
    const tabContents = editorEl.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = editorEl.querySelector('#tab-' + btn.dataset.tab);
            if (target) target.classList.add('active');
        });
    });

    // Minimize / Close
    const minBtn = editorEl.querySelector('#minimizeBtn');
    if (minBtn) {
        minBtn.addEventListener('click', () => {
            editorEl.style.display = 'none';
        });
    }

    const bindSlider = (id, uniformName, mult = 1) => {
        const el = editorEl.querySelector('#' + id);
        let valEl = editorEl.querySelector('#' + id + 'Value');
        if (!valEl && id === 'seaState') valEl = editorEl.querySelector('#seaValue');
        if (!valEl && id === 'waveSpeed') valEl = editorEl.querySelector('#speedValue');
        
        if (el) {
            el.addEventListener('input', () => {
                const val = Number(el.value);
                if (valEl) valEl.textContent = val + (el.max > 10 ? '%' : '');
                
                const uniforms = getWaterUniformsCallback();
                if (uniforms && uniforms[uniformName]) {
                    uniforms[uniformName].value = val * mult;
                    updateBiomeSettingsCallback(uniformName, val * mult);
                }
            });
        }
    };

    bindSlider('seaState', 'uSea', 1/100);
    bindSlider('globalWaveHeight', 'uWaveHeight', 1/100);
    bindSlider('oceanScale', 'uOceanScale', 1/100);
    bindSlider('swellWavelength', 'uSwellWavelength', 1/100);
    bindSlider('waveSpeed', 'uWaveSpeed', 1/100);
    bindSlider('foamCoverage', 'uFoamAmount', 1/100);
    bindSlider('waterOpacity', 'uWaterOpacity', 1/100);
    bindSlider('chopPatchiness', 'uChopPatchiness', 1/100);
    bindSlider('waveTurbulence', 'uDetailAmount', 1/100);
    bindSlider('windDirection', 'uWindDir', 1);
    bindSlider('directionalSpread', 'uDirSpread', 1/100);
    bindSlider('waveChop', 'uChop', 1/100);

    // Spectrum
    const spectrumContainer = editorEl.querySelector('#spectrumContainer');
    if (spectrumContainer) {
        spectrumContainer.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            spectrumContainer.innerHTML += `
            <div class="control" style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 12px;">
                <div class="eyebrow" style="margin-bottom: 12px;">Wave Component ${i+1}</div>
                
                <div class="control-head"><label>Wavelength</label><span class="value" id="wl_val_${i}">---</span></div>
                <input type="range" id="wl_${i}" min="5" max="300" value="50">
                
                <div class="control-head" style="margin-top: 10px;"><label>Steepness</label><span class="value" id="st_val_${i}">---</span></div>
                <input type="range" id="st_${i}" min="0" max="200" value="50">
                
                <div class="control-head" style="margin-top: 10px;"><label>Direction</label><span class="value" id="dir_val_${i}">---</span></div>
                <input type="range" id="dir_${i}" min="0" max="360" value="0">
            </div>`;
        }

        for (let i = 0; i < 10; i++) {
            const wl = editorEl.querySelector(`#wl_${i}`);
            const st = editorEl.querySelector(`#st_${i}`);
            const dir = editorEl.querySelector(`#dir_${i}`);
            
            const updateComponent = () => {
                const uniforms = getWaterUniformsCallback();
                if (!uniforms || !uniforms.uW_k) return;
                
                const k = 2 * Math.PI / Number(wl.value);
                uniforms.uW_k.value[i] = k;
                uniforms.uW_c.value[i] = Math.sqrt(9.8 / k);
                uniforms.uW_st.value[i] = Number(st.value) / 1000;
                
                const rad = Number(dir.value) * Math.PI / 180;
                uniforms.uW_dir.value[i].set(Math.cos(rad), Math.sin(rad));
                
                editorEl.querySelector(`#wl_val_${i}`).textContent = wl.value + 'm';
                editorEl.querySelector(`#st_val_${i}`).textContent = st.value;
                editorEl.querySelector(`#dir_val_${i}`).textContent = dir.value + '°';
                
                // TODO: Save to biome presets
            };
            
            wl.addEventListener('input', updateComponent);
            st.addEventListener('input', updateComponent);
            dir.addEventListener('input', updateComponent);
        }
    }
}
