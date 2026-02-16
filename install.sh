#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  PROPHET BOT — Script de Instalación y Actualización
#  Uso: ./install.sh   (detecta automáticamente si es
#        instalación nueva o actualización)
# ═══════════════════════════════════════════════════════════

set -e

NOMBRE_PM2="prophet-bot"
RAMA="main"
NODE_MIN_VERSION=18

echo ""
echo "═══════════════════════════════════════"
echo "  🚀 Prophet Bot — Deploy Script"
echo "  📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"
echo ""

# ─── Detectar si es actualización ───
ES_ACTUALIZACION=false
if command -v pm2 &> /dev/null && pm2 describe "$NOMBRE_PM2" > /dev/null 2>&1; then
    ES_ACTUALIZACION=true
    echo "🔄 Modo: ACTUALIZACIÓN"
else
    echo "🆕 Modo: INSTALACIÓN NUEVA"
fi

# ─── 1. Detener y limpiar procesos PM2 duplicados ───
if [ "$ES_ACTUALIZACION" = true ]; then
    echo ""
    echo "⏹️  Deteniendo el bot..."
    pm2 delete "$NOMBRE_PM2" 2>/dev/null || true
    echo "   ✅ Bot detenido y procesos limpiados"
fi

# ─── 2. Actualizar código desde GitHub ───
echo ""
echo "📥 Descargando últimos cambios desde GitHub..."
if git pull origin "$RAMA"; then
    echo "   ✅ Código actualizado"
else
    echo "   ⚠️  No se pudo hacer git pull (puede haber conflictos)"
    echo "   Intentá resolver los conflictos manualmente y volvé a correr el script."
    exit 1
fi

# ─── 3. Instalar Node.js (mínimo v18 para discord-player-youtubei) ───
INSTALAR_NODE=false
if ! command -v node &> /dev/null; then
    INSTALAR_NODE=true
else
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt "$NODE_MIN_VERSION" ]; then
        echo "⚠️  Node.js v$NODE_VERSION detectado, se necesita v$NODE_MIN_VERSION+. Actualizando..."
        INSTALAR_NODE=true
    fi
fi

if [ "$INSTALAR_NODE" = true ]; then
    echo ""
    echo "📦 Instalando Node.js v20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "   ✅ Node.js $(node -v) instalado"
else
    echo ""
    echo "📦 Node.js $(node -v) detectado ✅"
fi

# ─── 4. Instalar FFmpeg (necesario para música) ───
if ! command -v ffmpeg &> /dev/null; then
    echo ""
    echo "🎵 FFmpeg no encontrado. Instalando (necesario para música)..."
    sudo apt-get update -qq
    sudo apt-get install -y ffmpeg
    echo "   ✅ FFmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}') instalado"
else
    echo "🎵 FFmpeg detectado ✅"
fi

# ─── 5. Limpiar e instalar dependencias ───
echo ""
echo "📦 Instalando dependencias..."
# Limpiar node_modules viejos si hay problemas con binarios nativos
if [ "$INSTALAR_NODE" = true ] || [ ! -d "node_modules" ]; then
    echo "   🧹 Limpiando node_modules para instalación limpia..."
    rm -rf node_modules package-lock.json
fi
npm install 2>&1 | tail -10
echo "   ✅ Dependencias instaladas"

# ─── 6. Verificar dependencias críticas de música ───
echo ""
echo "🔍 Verificando módulos de música..."
MUSIC_OK=true

node -e "require('discord-player')" 2>/dev/null && echo "   ✅ discord-player" || { echo "   ❌ discord-player — FALTANTE"; MUSIC_OK=false; }
node -e "require('@discord-player/extractor')" 2>/dev/null && echo "   ✅ @discord-player/extractor" || { echo "   ❌ @discord-player/extractor — FALTANTE"; MUSIC_OK=false; }
node -e "require('discord-player-youtubei')" 2>/dev/null && echo "   ✅ discord-player-youtubei" || { echo "   ❌ discord-player-youtubei — FALTANTE"; MUSIC_OK=false; }
node -e "require('@discordjs/voice')" 2>/dev/null && echo "   ✅ @discordjs/voice" || { echo "   ❌ @discordjs/voice — FALTANTE"; MUSIC_OK=false; }

if [ "$MUSIC_OK" = false ]; then
    echo ""
    echo "   ⚠️  Algunos módulos de música faltan. Intentando instalar individualmente..."
    npm install discord-player @discord-player/extractor @discord-player/ffmpeg @discord-player/opus discord-player-youtubei @discordjs/voice ffmpeg-static libsodium-wrappers 2>&1 | tail -5
    echo "   ✅ Reinstalación de módulos de música completada"
fi

# ─── 7. Instalar PM2 si no existe ───
if ! command -v pm2 &> /dev/null; then
    echo ""
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
    echo "   ✅ PM2 instalado"
fi

# ─── 8. Iniciar el bot (siempre una sola instancia) ───
echo ""
echo "🤖 Iniciando el bot..."
pm2 start index.js --name "$NOMBRE_PM2"
echo "   ✅ Bot iniciado"

# ─── 9. Configurar inicio automático (solo si no está configurado) ───
if [ "$ES_ACTUALIZACION" = false ]; then
    echo ""
    echo "💾 Configurando inicio automático..."
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
fi
pm2 save

# ─── 10. Estado final ───
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ ¡Listo! Prophet Bot desplegado"
echo "═══════════════════════════════════════"
echo ""
pm2 status "$NOMBRE_PM2"
echo ""
echo "📝 Comandos útiles:"
echo "   pm2 status           → Ver estado del bot"
echo "   pm2 logs             → Ver logs en vivo"
echo "   pm2 logs --lines 50  → Ver últimas 50 líneas"
echo "   pm2 restart $NOMBRE_PM2 → Reiniciar sin reinstalar"
echo "   ./install.sh         → Actualizar y reiniciar"
echo ""
