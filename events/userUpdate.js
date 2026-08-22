'use strict';

const config = require('../config');
const { stmts } = require('../database');
const { applyClanFont, isAutoClanFontEnabled, getClanFontStyle, convertText, canManageMember } = require('../modules/clanFont');

module.exports = {
    name: 'userUpdate',
    once: false,
    async execute(oldUser, newUser) {
        if (newUser.bot) return;

        // Comprobar si cambió el nombre de usuario o nombre global
        const usernameChanged = oldUser.username !== newUser.username;
        const displayNameChanged = oldUser.displayName !== newUser.displayName;
        if (!usernameChanged && !displayNameChanged) return;

        try {
            const client = newUser.client;
            const guild = client.guilds.cache.get(config.GUILD_ID);
            if (!guild) return;

            const member = await guild.members.fetch(newUser.id).catch(() => null);
            if (!member || !canManageMember(member)) return;

            const fontData = stmts.getFontNickData(member.id);
            const isAuto = isAutoClanFontEnabled();

            if (isAuto || fontData) {
                const style = fontData?.font_style || getClanFontStyle();
                const currentNick = member.nickname;
                const rawName = currentNick || member.displayName || newUser.displayName || newUser.username;
                const expectedNick = convertText(rawName, style);

                // Si el apodo actual no está estilizado con la fuente activa, aplicarlo
                if (currentNick !== expectedNick) {
                    await applyClanFont(member, style, 'Auto-aplicación de fuente del clan tras cambio de cuenta global', true);
                }
            }
        } catch (err) {
            console.debug('[ClanFont] Error en userUpdate:', err.message);
        }
    }
};
