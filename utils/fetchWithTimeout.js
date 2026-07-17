function fetchWithTimeout(resource, options = {}, timeoutMs = 10000) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

    return fetch(resource, { ...options, signal });
}

module.exports = { fetchWithTimeout };
