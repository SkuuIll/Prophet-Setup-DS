#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  PROPHET BOT — Script de Instalación y Actualización
#  Uso: bash install.sh          (instalación completa)
#       bash install.sh update   (actualizar y reiniciar)
# ═══════════════════════════════════════════════════════════

set -e

NOMBRE_PM2="prophet-bot"
RAMA="main"

echo ""
echo "═══════════════════════════════════════"
echo "  🚀 Prophet Bot — Deploy Script"
echo "  📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"
echo ""

# ─── Detectar si es una actualización o instalación nueva ───
if pm2 describe "$NOMBRE_PM2" > /dev/null 2>&1; then
    ES_ACTUALIZACION=true
    echo "🔄 Modo: ACTUALIZACIÓN (bot ya existe en PM2)"
else
    ES_ACTUALIZACION=false
    echo "🆕 Modo: INSTALACIÓN NUEVA"
fi

# ─── 1. Detener el bot si está corriendo ───
if [ "$ES_ACTUALIZACION" = true ]; then
    echo ""
    echo "⏹️  Deteniendo el bot..."
    pm2 stop "$NOMBRE_PM2" 2>/dev/null || true
    echo "   ✅ Bot detenido"
fi

# ─── 2. Actualizar código desde GitHub ───
echo ""
echo "📥 Descargando últimos cambios desde GitHub..."
if git pull origin "$RAMA" 2>/dev/null; then
    echo "   ✅ Código actualizado"
else
    echo "   ⚠️  No se pudo hacer git pull (puede ser la primera vez o hay conflictos)"
fi

# ─── 3. Instalar Node.js si no existe ───
if ! command -v node &> /dev/null; then
    echo ""
    echo "📦 Node.js no encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "   ✅ Node.js $(node -v) instalado"
else
    echo ""
    echo "📦 Node.js $(node -v) ya instalado"
fi

# ─── 4. Instalar dependencias ───
echo ""
echo "📦 Instalando dependencias..."
npm install --production 2>&1 | tail -5
echo "   ✅ Dependencias instaladas"

# ─── 5. Instalar PM2 si no existe ───
if ! command -v pm2 &> /dev/null; then
    echo ""
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
    echo "   ✅ PM2 instalado"
fi

# ─── 6. Iniciar o reiniciar el bot ───
echo ""
if [ "$ES_ACTUALIZACION" = true ]; then
    echo "🔄 Reiniciando el bot..."
    pm2 restart "$NOMBRE_PM2"
    echo "   ✅ Bot reiniciado con los nuevos cambios"
else
    echo "🤖 Iniciando el bot por primera vez..."
    pm2 start index.js --name "$NOMBRE_PM2"
    echo "   ✅ Bot iniciado"

    # Configurar inicio automático solo en instalación nueva
    echo ""
    echo "💾 Configurando inicio automático..."
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
    pm2 save
    echo "   ✅ Inicio automático configurado"
fi

# ─── 7. Mostrar estado final ───
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ ¡Listo! Prophet Bot desplegado"
echo "═══════════════════════════════════════"
echo ""
pm2 status "$NOMBRE_PM2"
echo ""
echo "📝 Comandos útiles:"
echo "   pm2 status         → Ver estado del bot"
echo "   pm2 logs           → Ver logs en vivo"
echo "   pm2 logs --lines 50 → Ver últimas 50 líneas de log"
echo "   ./install.sh       → Actualizar y reiniciar"
echo ""
