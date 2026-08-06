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
    'milkyway.jpg'
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
                    console.log('Downloaded ' + file);
                    resolve();
                });
            } else {
                fileStream.close();
                fs.unlink(dest, () => {}); // Delete the file async
                console.log('Failed ' + file + ': ' + response.statusCode);
                resolve();
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            console.log('Error ' + file + ': ' + err.message);
            resolve();
        });
    });
}

async function main() {
    for (const file of files) {
        await download(file);
    }
    console.log('Done');
}

main();
