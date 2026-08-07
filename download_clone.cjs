const fs = require('fs');
const https = require('https');
const path = require('path');

const baseUrl = 'https://nikita.works/testchambers/clouds/';
const outDir = path.join(__dirname, 'nikita-clouds');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const files = [
    'index.html',
    'look.css',
    'gl-matrix.js',
    'main.js',
    'ShaderProgram.js',
    'fluid/2d/FluidSim.js',
    'renderToTexture.vert',
    'renderVolume.frag',
    'fs.frag',
    'render2DTex.frag',
    'blurTex.frag',
    'denoise.frag',
    'renderSkyVolume.frag',
    'renderSkyViewLUT.frag',
    'renderSkyOpticalDepth.frag',
    'renderCloudShadowMaps.frag',
    'renderWeatherMap.frag',
    'renderClouds.frag',
    'noise_shape_packed64.png',
    'noise_erosion_packed.png',
    'weather_turbulent.png',
    'milkyway.jpg',
    'fluid/2d/advect.frag',
    'fluid/2d/jacobi.frag',
    'fluid/2d/applyForce.frag',
    'fluid/2d/injectInk.frag',
    'fluid/2d/divergence.frag',
    'fluid/2d/subtractGradient.frag',
    'fluid/2d/curl.frag',
    'fluid/2d/applyVorticity.frag'
];

function download(file) {
    return new Promise((resolve, reject) => {
        const url = baseUrl + file;
        const dest = path.join(outDir, file);
        const dir = path.dirname(dest);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const fileStream = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });
            } else {
                fileStream.close();
                fs.unlink(dest, () => {});
                resolve();
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            resolve();
        });
    });
}

async function main() {
    for (const file of files) {
        await download(file);
    }
    
    // Patch index.html
    let html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
    html = html.replace('<div class="weather-board"></div>', '<div class="weather-board" style="display: none;"></div>');
    html = html.replace('<div class="dbg" style="position: absolute; top: 0; left: 0; color: white; background: black"></div>', '<div class="dbg" style="display: none;"></div>');
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    
    // Patch main.js
    let js = fs.readFileSync(path.join(outDir, 'main.js'), 'utf8');
    js = js.replace('this._cnv.requestPointerLock();', '// this._cnv.requestPointerLock();');
    js = js.replace('this._addUI();', '// this._addUI();');
    js = js.replace('if (document.pointerLockElement === this._cnv) {', 'if (this._isMouseDown) {');
    js = js.replace('_handleMousedown (e) {\n    }', '_handleMousedown (e) {\n      this._isMouseDown = true;\n    }');
    js = js.replace('_handleMouseup (e) {\n    }', '_handleMouseup (e) {\n      this._isMouseDown = false;\n    }');
    fs.writeFileSync(path.join(outDir, 'main.js'), js);
    
    console.log('Done');
}

main();
