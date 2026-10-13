const test = require('node:test');
const assert = require('node:assert/strict');
const { getClientInfo } = require('../web/middleware');

function request(remoteAddress, forwarded = '198.51.100.20') {
    return {
        socket: { remoteAddress },
        headers: { 'x-forwarded-for': forwarded, 'user-agent': 'test-agent' },
    };
}

test('X-Forwarded-For es ignorado cuando el cliente accede directamente al VPS', () => {
    const prior = process.env.TRUST_PROXY;
    try {
        process.env.TRUST_PROXY = 'true';
        assert.equal(getClientInfo(request('203.0.113.10')).ipAddress, '203.0.113.10');
    } finally {
        if (prior === undefined) delete process.env.TRUST_PROXY;
        else process.env.TRUST_PROXY = prior;
    }
});

test('Se admite IP reenviada solo desde un reverse proxy local y si es válida', () => {
    const prior = process.env.TRUST_PROXY;
    try {
        process.env.TRUST_PROXY = 'true';
        assert.equal(getClientInfo(request('127.0.0.1')).ipAddress, '198.51.100.20');
        assert.equal(getClientInfo(request('::1', 'no-es-ip')).ipAddress, '::1');
    } finally {
        if (prior === undefined) delete process.env.TRUST_PROXY;
        else process.env.TRUST_PROXY = prior;
    }
});

test('Un X-Forwarded-For suministrado por un atacante no domina el rate limit', () => {
    const prior = process.env.TRUST_PROXY;
    try {
        process.env.TRUST_PROXY = 'true';
        const forwarded = '1.2.3.4, 198.51.100.20';
        assert.equal(getClientInfo(request('127.0.0.1', forwarded)).ipAddress,
            '198.51.100.20');
        assert.equal(getClientInfo(request('203.0.113.10', forwarded)).ipAddress,
            '203.0.113.10');
    } finally {
        if (prior === undefined) delete process.env.TRUST_PROXY;
        else process.env.TRUST_PROXY = prior;
    }
});
