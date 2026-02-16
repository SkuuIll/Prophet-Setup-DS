#!/bin/bash

# Este script instala todas las dependencias y configura el bot para iniciarse automáticamente con PM2
# Ejecutar con: bash install.sh

echo "🚀 Iniciando instalación de Prophet Bot..."

# 1. Actualizar repositorios e instalar Node.js si no existe (asumiendo Ubuntu/Debian)
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Instalar dependencias del proyecto
echo "📦 Instalando dependencias del bot..."
npm install

# 3. Instalar PM2 globalmente (Gestor de procesos)
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2 globalmente..."
    sudo npm install -g pm2
fi

# 4. Iniciar el bot con PM2
echo "🤖 Iniciando el bot con PM2..."
pm2 start index.js --name "prophet-bot"

# 5. Generar script de inicio automático y guardarlo
echo "💾 Configurando inicio automático..."
pm2 startup systemd -u root --hp /root
pm2 save

echo "✅ ¡Instalación completada! El bot se reiniciará automáticamente si la VPS se apaga."
echo "📝 Comandos útiles:"
echo "   pm2 status       -> Ver estado del bot"
echo "   pm2 logs         -> Ver logs en vivo"
echo "   pm2 restart all  -> Reiniciar el bot"
