/**
 * ════ BANCO DE PREGUNTAS — PROPHET TRIVIA PARTY ════
 */

const QUESTION_BANK = [
    // ─── GAMING & ESPORTS ───
    {
        id: 'g1',
        category: '🎮 CS2 & Shoot',
        question: '¿Cuánto daño hace un disparo en la cabeza con AWP en Counter-Strike?',
        options: ['100 HP', '400+ HP (Muerte instantánea)', '85 HP', '250 HP'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'g2',
        category: '🎮 Gaming General',
        question: '¿En qué año se lanzó originalmente la plataforma Steam de Valve?',
        options: ['2000', '2003', '2007', '2010'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'g3',
        category: '🪂 PUBG Battlegrounds',
        question: '¿Cómo se llama el mapa original y más icónico de PUBG?',
        options: ['Miramar', 'Erangel', 'Sanhok', 'Taego'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'g4',
        category: '🛡️ League of Legends',
        question: '¿Qué monstruo épico de LoL otorga el buff "Mano del Barón"?',
        options: ['Heraldo de la Grieta', 'Dragón Ancestral', 'Barón Nashor', 'Gromp'],
        correctIndex: 2,
        timeLimit: 15
    },
    {
        id: 'g5',
        category: '🎮 Valorant',
        question: '¿Qué agente de Valorant tiene la habilidad de revivir a un compañero caído?',
        options: ['Jett', 'Sage', 'Reyna', 'Omen'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'g6',
        category: '🎮 Clásicos Gaming',
        question: '¿Cómo se llama el protagonista de la saga Half-Life?',
        options: ['Duke Nukem', 'Gordon Freeman', 'Doomguy', 'Master Chief'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'g7',
        category: '🎮 Rust & Survival',
        question: '¿Qué material se necesita para evitar que tu base en Rust sufra "decay" o deterioro?',
        options: ['Pólvora', 'Recursos en el Armario (TC)', 'Chapa de metal', 'Combustible de bajo grado'],
        correctIndex: 1,
        timeLimit: 15
    },

    // ─── MEMES & CULTURA GAMER / ARGENTINA ───
    {
        id: 'm1',
        category: '😂 Memes',
        question: 'Completá la mítica frase gamer: "Rush B, no..."',
        options: ['...stop!', '...flash!', '...smoke!', '...cry!'],
        correctIndex: 0,
        timeLimit: 15
    },
    {
        id: 'm2',
        category: '🇦🇷 Cultura & Memes',
        question: '¿Qué significa cuando un amigo en Discord dice que "lo carrilearon"?',
        options: ['Que jugó como profesional', 'Que su equipo ganó sin que él haga nada', 'Que se le cayó el internet', 'Que compró skins caras'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'm3',
        category: '😂 Memes Gaming',
        question: '¿Qué tecla se presiona popularmente para "pagar respetos" (Pay Respects)?',
        options: ['F', 'E', 'R', 'Espacio'],
        correctIndex: 0,
        timeLimit: 15
    },
    {
        id: 'm4',
        category: '😂 Memes',
        question: '¿Qué le pasa al jugador que "tira la toalla" y se va enojado de la partida?',
        options: ['Hace un Clutch', 'Hace un Rage Quit', 'Sube de rango', 'Pide pausa táctica'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'm5',
        category: '🎮 Cultura Gamer',
        question: '¿Qué significa el término "PVP" en los videojuegos?',
        options: ['Player vs Player', 'Power vs Points', 'Protect VIP Player', 'Ping Velocity Peak'],
        correctIndex: 0,
        timeLimit: 15
    },

    // ─── COMUNIDAD PROPHET GAMING ───
    {
        id: 'p1',
        category: '👑 Prophet Lore',
        question: '¿Cómo se llama el bot oficial con inteligencia artificial y música de la comunidad?',
        options: ['DynoBot', 'ProphetBot v3.0', 'MusicMan', 'CarlBot'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'p2',
        category: '👑 Prophet Lore',
        question: '¿Qué comando de ProphetBot se usa para ganar monedas de recompensa diaria?',
        options: ['/work', '/daily', '/balance', '/gamble'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'p3',
        category: '👑 Prophet Lore',
        question: '¿A partir de qué nivel se activa el sistema de apodos trols en voz?',
        options: ['Nivel 1', 'Nivel 5', 'Nivel 10', 'Nivel 50'],
        correctIndex: 2,
        timeLimit: 15
    },
    {
        id: 'p4',
        category: '👑 Prophet Lore',
        question: '¿Cuál es el juego de cartas argentino tradicional disponible en Prophet Games?',
        options: ['Poker Texas', 'Truco Argentino', 'Uno', 'Blackjack Solo'],
        correctIndex: 1,
        timeLimit: 15
    },
    {
        id: 'p5',
        category: '🎮 CS2 & Prophet',
        question: '¿Cuál es el cuchillo más codiciado y caro en Counter-Strike?',
        options: ['Navaja Safari', 'Karambit Case Hardened #1 Blue Gem', 'Dagas Sombrías', 'Gut Knife Chamuscado'],
        correctIndex: 1,
        timeLimit: 15
    }
];

class QuestionBank {
    /**
     * Obtiene N preguntas aleatorias mezcladas
     */
    static getRandomQuestions(count = 10) {
        const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    static getAll() {
        return QUESTION_BANK;
    }
}

module.exports = QuestionBank;
