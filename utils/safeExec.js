/**
 * safeExec — envuelve una función async en try/catch para que nunca crashee el proceso.
 * Logea el error pero lo absorbe.
 */
function safeExec(fn, context = 'unknown') {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (err) {
            console.error(`[safeExec:${context}] Error no crítico:`, err.message);
        }
    };
}

module.exports = { safeExec };
