// scripts/currency.js – Reliable Currency Converter with Caching, Fallback, and Comma Formatting
(function() {
    const PRIMARY_API = 'https://api.exchangerate.host/latest?base={from}&symbols={to}';
    const FALLBACK_APIS = [
        'https://api.frankfurter.app/latest?from={from}&to={to}',
        'https://open.er-api.com/v6/latest/{from}'
    ];
    const CACHE_TTL = 10 * 60 * 1000;
    const RETRY_ATTEMPTS = 2;
    const BASE_DELAY = 1000;

    // ----- Helper: format number with commas (for result) -----
    function formatNumberWithCommas(num) {
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ----- CACHE HELPERS (unchanged) -----
    function getCacheKey(from, to) { return `sr_rate_${from}_${to}`.toLowerCase(); }
    function getCachedRate(from, to) {
        const key = getCacheKey(from, to);
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        try {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < CACHE_TTL) return { rate: data.rate, fresh: true };
            return { rate: data.rate, timestamp: data.timestamp, expired: true };
        } catch { return null; }
    }
    function setCachedRate(from, to, rate) {
        localStorage.setItem(getCacheKey(from, to), JSON.stringify({ rate, timestamp: Date.now() }));
    }

    // ----- FETCH WITH CORS PROXY FALLBACK (same robust version) -----
    async function fetchWithCorsFallback(url) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
        } catch (e) { /* fall through */ }
        // CORS proxy fallback
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const proxyRes = await fetch(proxyUrl);
        if (!proxyRes.ok) throw new Error(`Proxy HTTP ${proxyRes.status}`);
        return await proxyRes.json();
    }

    async function fetchWithRetries(url, attempts = RETRY_ATTEMPTS, baseDelay = BASE_DELAY) {
        let lastError;
        for (let i = 0; i <= attempts; i++) {
            try {
                return await fetchWithCorsFallback(url);
            } catch (err) {
                lastError = err;
                if (i < attempts) await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
            }
        }
        throw lastError;
    }

    async function fetchRateFromApi(from, to) {
        // Primary
        const primaryUrl = PRIMARY_API.replace('{from}', from).replace('{to}', to);
        try {
            const data = await fetchWithRetries(primaryUrl);
            if (data?.rates?.[to] !== undefined) return data.rates[to];
            throw new Error('Invalid primary response');
        } catch (err) {
            console.warn('Primary failed, trying fallbacks', err);
            for (const tmpl of FALLBACK_APIS) {
                try {
                    let url = tmpl.includes('{to}') ? tmpl.replace('{from}', from).replace('{to}', to) : tmpl.replace('{from}', from);
                    const data = await fetchWithRetries(url);
                    let rate = data?.rates?.[to];
                    if (rate !== undefined) return rate;
                } catch (e) { console.warn(`Fallback ${tmpl} failed`, e); }
            }
            throw new Error('All APIs failed');
        }
    }

    async function getRate(from, to) {
        const cached = getCachedRate(from, to);
        if (cached?.fresh) return { rate: cached.rate, status: 'live (cached)', fresh: true };
        const staleCache = cached?.expired ? cached.rate : null;
        try {
            const rate = await fetchRateFromApi(from, to);
            setCachedRate(from, to, rate);
            return { rate, status: 'live', fresh: true };
        } catch (err) {
            if (staleCache !== null) {
                const cacheTime = cached.timestamp ? new Date(cached.timestamp).toLocaleString() : 'unknown';
                return { rate: staleCache, status: 'cached (stale)', fresh: false, message: `Showing last known rate (cached at ${cacheTime})` };
            }
            throw new Error('Unable to fetch live rate. Please try again.');
        }
    }

    // ----- UI BINDING (with comma formatting for result) -----
    document.addEventListener('DOMContentLoaded', function() {
        const amountInput = document.getElementById('amount');
        const fromSelect = document.getElementById('fromCurrency');
        const toSelect = document.getElementById('toCurrency');
        const convertBtn = document.getElementById('convertBtn');
        const retryBtn = document.getElementById('retryBtn');
        const resultSpan = document.getElementById('conversionResult');
        const apiStatusSpan = document.getElementById('apiStatus');
        const cacheMessageP = document.getElementById('cacheMessage');

        function setStatus(status, msg = '') {
            apiStatusSpan.textContent = status;
            apiStatusSpan.className = 'status-indicator';
            if (status.includes('live')) apiStatusSpan.classList.add('status-live');
            else if (status.includes('cached')) apiStatusSpan.classList.add('status-cached');
            else if (status.includes('Unable') || status.includes('Offline')) apiStatusSpan.classList.add('status-offline');
            cacheMessageP.textContent = msg;
        }

        async function performConversion() {
            // Parse amount (strip commas)
            let rawAmount = amountInput.value.replace(/,/g, '');
            const amount = parseFloat(rawAmount) || 1;
            const from = fromSelect.value;
            const to = toSelect.value;
            resultSpan.textContent = 'Converting...';
            setStatus('Fetching...');
            try {
                const result = await getRate(from, to);
                const converted = amount * result.rate;
                // Format result with commas and 2 decimals
                const formatted = formatNumberWithCommas(converted);
                resultSpan.textContent = `${formatted} ${to}`;
                setStatus(result.status, result.message || '');
            } catch (error) {
                resultSpan.textContent = '—';
                setStatus('Offline', error.message);
                console.error('Currency converter error:', error);
            }
        }

        convertBtn.addEventListener('click', performConversion);
        retryBtn.addEventListener('click', performConversion);
        performConversion();
    });
})();