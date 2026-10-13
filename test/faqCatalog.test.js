const test = require('node:test');
const assert = require('node:assert/strict');
const { _db } = require('../database');
const { initializeFAQ, FAQ_DATA } = require('../modules/advancedMod');

test('FAQ: iniciar varias veces no vuelve a insertar las preguntas originales', () => {
    initializeFAQ();
    const findCounts = () => FAQ_DATA.map(x => _db.prepare(
        'SELECT COUNT(*) AS count FROM faq_entries WHERE question = ? AND category = ?'
    ).get(x.question, x.category).count);
    const before = findCounts();
    initializeFAQ();
    initializeFAQ();
    assert.deepEqual(findCounts(), before);
    assert.ok(before.every(x => x >= 1));
});

test('FAQ: las respuestas nunca recomiendan comandos eliminados', () => {
    const answers = FAQ_DATA.map(x => x.answer).join('\n');
    for (const missing of ['/reporte', '/editar-perfil', '/badges', '/ticket']) {
        assert.equal(answers.includes(missing), false, missing);
    }
    assert.match(answers, /Reportar Usuario/);
    assert.match(answers, /\/ayuda/);
});
