// ═══════════════════════════════════════════════════
//  SCRIPT: Descargar y generar sonidos trol locales
// ═══════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const SOUNDS_DIR = path.join(__dirname, '..', 'assets', 'sounds');
if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(destPath);

        client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Status code: ${res.statusCode}`));
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

/**
 * Generar audio con TTS de Google y procesarlo con FFmpeg
 */
async function generateTtsSound(text, destFilename, effect = '') {
    const tempTts = path.join(SOUNDS_DIR, `temp_${destFilename}`);
    const finalPath = path.join(SOUNDS_DIR, destFilename);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es-US&client=tw-ob&q=${encodeURIComponent(text)}`;

    await downloadFile(ttsUrl, tempTts);

    let ffmpegCmd;
    if (effect === 'siren') {
        // Generar tono de sirena seguido del TTS
        ffmpegCmd = `ffmpeg -y -f lavfi -i "sine=frequency=800:duration=1.2" -i "${tempTts}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" -map "[out]" -b:a 128k "${finalPath}"`;
    } else if (effect === 'distortion') {
        // Efecto saturado / grito
        ffmpegCmd = `ffmpeg -y -i "${tempTts}" -af "volume=2.5,acompressor=threshold=0.1:ratio=20:attack=5:release=50" -b:a 128k "${finalPath}"`;
    } else {
        // Audio limpio
        ffmpegCmd = `ffmpeg -y -i "${tempTts}" -af "volume=1.5" -b:a 128k "${finalPath}"`;
    }

    try {
        execSync(ffmpegCmd, { stdio: 'ignore' });
        fs.unlinkSync(tempTts);
        console.log(`✅ Generado sonido TTS: ${destFilename}`);
    } catch (e) {
        fs.renameSync(tempTts, finalPath);
        console.log(`⚠️ Generado TTS básico: ${destFilename}`);
    }
}

/**
 * Generar efectos de sonido sintetizados mediante FFmpeg lavfi
 */
function generateSynthSound(type, destFilename) {
    const finalPath = path.join(SOUNDS_DIR, destFilename);

    let cmd = '';
    if (type === 'windows_error') {
        // Tono de acorde de error de Windows (doble tono 440Hz + 220Hz)
        cmd = `ffmpeg -y -f lavfi -i "sine=frequency=440:duration=0.3" -f lavfi -i "sine=frequency=220:duration=0.3" -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest,afade=t=out:st=0.2:d=0.1" -b:a 128k "${finalPath}"`;
    } else if (type === 'fail_trombone') {
        // 4 notas descendentes clásicas del trombone fail
        cmd = `ffmpeg -y -f lavfi -i "sine=frequency=392:duration=0.4" -f lavfi -i "sine=frequency=370:duration=0.4" -f lavfi -i "sine=frequency=349:duration=0.4" -f lavfi -i "sine=frequency=311:duration=1.2" -filter_complex "[0:a][1:a][2:a][3:a]concat=n=4:v=0:a=1[out]" -map "[out]" -b:a 128k "${finalPath}"`;
    } else if (type === 'discord_leave') {
        // Dos tonos descendentes característicos de desconexión de Discord (D5 -> B4)
        cmd = `ffmpeg -y -f lavfi -i "sine=frequency=587:duration=0.18" -f lavfi -i "sine=frequency=493:duration=0.35" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1,afade=t=out:st=0.4:d=0.13" -b:a 128k "${finalPath}"`;
    } else if (type === 'jumpscare') {
        // Ruido blanco fuerte + tono agudo estridente
        cmd = `ffmpeg -y -f lavfi -i "anoisesrc=d=1.5:c=white:a=0.9" -f lavfi -i "sine=frequency=1200:duration=1.5" -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest,volume=2.0,afade=t=out:st=1.0:d=0.5" -b:a 128k "${finalPath}"`;
    }

    if (cmd) {
        try {
            execSync(cmd, { stdio: 'ignore' });
            console.log(`✅ Generado sonido sintetizado: ${destFilename}`);
        } catch (e) {
            console.error(`❌ Error generando sintetizado ${destFilename}:`, e.message);
        }
    }
}

async function main() {
    console.log('🚀 Preparando todos los sonidos de trolleo locales...');

    // 1. Sonidos sintetizados exactos
    generateSynthSound('discord_leave', 'discord_leave.mp3');
    generateSynthSound('fail_trombone', 'fail_trombone.mp3');
    generateSynthSound('windows_error', 'windows_error.mp3');
    generateSynthSound('jumpscare', 'jumpscare.mp3');

    // 2. Voces y bardeos argentinos auténticos
    await generateTtsSound('¡Pero la puta que lo parió loco! ¡Qué hacés!', 'iorio.mp3', 'distortion');
    await generateTtsSound('¡¿Qué hacés, pelotudo?! ¡Ponete a jugar bien y dejá de fedear!', 'quehaces.mp3', 'distortion');
    await generateTtsSound('¡Apagá el coso! ¡Apagalo, apagaloooo!', 'apagaelcoso.mp3', 'distortion');
    await generateTtsSound('Alerta roja de manco en la sala. Se detectó una persona con cero manos en el canal de voz.', 'alerta_manco.mp3', 'siren');

    console.log('\n🎉 ¡Todos los sonidos han sido creados y guardados en assets/sounds/!');
}

main().catch(console.error);
