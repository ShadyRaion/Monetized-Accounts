let clients = [];
let clientIdCounter = 1;
export function initSSE(app) {
    app.get('/events', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        if (typeof res.flushHeaders === 'function') {
            ;
            res.flushHeaders();
        }
        const id = clientIdCounter++;
        const client = { id, res };
        clients.push(client);
        // initial comment to establish the stream
        try {
            res.write(`: connected\n\n`);
        }
        catch (e) { /* ignore */ }
        req.on('close', () => {
            clients = clients.filter(c => c.id !== id);
        });
    });
}
export function broadcastEvent(event) {
    const data = typeof event === 'string' ? event : JSON.stringify(event);
    clients.forEach(client => {
        try {
            client.res.write(`data: ${data}\n\n`);
        }
        catch (e) {
            // ignore per-client errors
        }
    });
}
export default {};
//# sourceMappingURL=sse.js.map