'use strict';

const DEFAULT_CONTEXT = Object.freeze({
    pi: Math.PI,
    e: Math.E,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log10,
    ln: Math.log,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
});

class MathExpressionParser {
    constructor(input, context = DEFAULT_CONTEXT) {
        this.input = String(input || '').replace(/\*\*/g, '^');
        this.context = context;
        this.index = 0;
        this.current = this.nextToken();
    }

    evaluate() {
        const value = this.parseExpression();
        if (this.current.type !== 'eof') {
            throw new Error(`Token inesperado: ${this.current.value}`);
        }
        if (!Number.isFinite(value)) {
            throw new Error('Resultado inválido');
        }
        return value;
    }

    nextToken() {
        while (/\s/.test(this.input[this.index] || '')) this.index += 1;
        if (this.index >= this.input.length) return { type: 'eof', value: '' };

        const rest = this.input.slice(this.index);
        const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
        if (number) {
            this.index += number[0].length;
            return { type: 'number', value: number[0] };
        }

        const identifier = rest.match(/^[a-z]+/i);
        if (identifier) {
            this.index += identifier[0].length;
            return { type: 'identifier', value: identifier[0].toLowerCase() };
        }

        const char = this.input[this.index];
        if ('+-*/%^(),'.includes(char)) {
            this.index += 1;
            return { type: 'symbol', value: char };
        }

        throw new Error(`Carácter no permitido: ${char}`);
    }

    consume(value) {
        if (this.current.value !== value) {
            throw new Error(`Se esperaba "${value}"`);
        }
        this.current = this.nextToken();
    }

    parseExpression() {
        let value = this.parseTerm();
        while (this.current.value === '+' || this.current.value === '-') {
            const operator = this.current.value;
            this.current = this.nextToken();
            const right = this.parseTerm();
            value = operator === '+' ? value + right : value - right;
        }
        return value;
    }

    parseTerm() {
        let value = this.parseUnary();
        while (['*', '/', '%'].includes(this.current.value)) {
            const operator = this.current.value;
            this.current = this.nextToken();
            const right = this.parseUnary();
            if ((operator === '/' || operator === '%') && right === 0) {
                throw new Error('No se puede dividir por cero');
            }
            if (operator === '*') value *= right;
            else if (operator === '/') value /= right;
            else value %= right;
        }
        return value;
    }

    parseUnary() {
        if (this.current.value === '+' || this.current.value === '-') {
            const operator = this.current.value;
            this.current = this.nextToken();
            const value = this.parseUnary();
            return operator === '-' ? -value : value;
        }
        return this.parsePower();
    }

    parsePower() {
        const left = this.parsePrimary();
        if (this.current.value !== '^') return left;
        this.current = this.nextToken();
        return left ** this.parseUnary();
    }

    parsePrimary() {
        if (this.current.type === 'number') {
            const value = Number(this.current.value);
            this.current = this.nextToken();
            return value;
        }

        if (this.current.value === '(') {
            this.consume('(');
            const value = this.parseExpression();
            this.consume(')');
            return value;
        }

        if (this.current.type === 'identifier') {
            const name = this.current.value;
            this.current = this.nextToken();
            const resolved = this.context[name];

            if (this.current.value === '(') {
                if (typeof resolved !== 'function') {
                    throw new Error(`Función no soportada: ${name}`);
                }
                this.consume('(');
                const argument = this.parseExpression();
                if (this.current.value === ',') {
                    throw new Error('Las funciones aceptan un solo argumento');
                }
                this.consume(')');
                return resolved(argument);
            }

            if (typeof resolved !== 'number') {
                throw new Error(`Constante no soportada: ${name}`);
            }
            return resolved;
        }

        throw new Error('Expresión incompleta');
    }
}

function evaluateMathExpression(input, context = DEFAULT_CONTEXT) {
    return new MathExpressionParser(input, context).evaluate();
}

module.exports = {
    DEFAULT_CONTEXT,
    evaluateMathExpression,
};
