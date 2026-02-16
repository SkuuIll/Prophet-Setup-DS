#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  PROPHET BOT — Script de Instalación y Actualización
#  Uso: ./install.sh   (detecta automáticamente si es
#        instalación nueva o actualización)
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

# ─── 3. Instalar Node.js si no existe ───
if ! command -v node &> /dev/null; then
    echo ""
    echo "📦 Node.js no encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "   ✅ Node.js $(node -v) instalado"
else
    echo ""
    echo "📦 Node.js $(node -v) detectado"
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

# ─── 6. Iniciar el bot (siempre una sola instancia) ───
echo ""
echo "🤖 Iniciando el bot..."
pm2 start index.js --name "$NOMBRE_PM2"
echo "   ✅ Bot iniciado"

# ─── 7. Configurar inicio automático (solo si no está configurado) ───
if [ "$ES_ACTUALIZACION" = false ]; then
    echo ""
    echo "💾 Configurando inicio automático..."
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
fi
pm2 save

# ─── 8. Estado final ───
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
echo "   pm2 logs --lines 50 → Ver últimas 50 líneas"
echo "   ./install.sh       → Actualizar y reiniciar"
echo ""
