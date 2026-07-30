import { PrismaClient } from '@prisma/client';

console.debug('[prisma] initializing PrismaClient')
const prisma = new PrismaClient({
	log: [
		{ level: 'query', emit: 'event' },
		{ level: 'info', emit: 'event' },
		{ level: 'warn', emit: 'event' },
		{ level: 'error', emit: 'event' }
	]
});

// Emit query logs to console for diagnostics
prisma.$on('query', (e) => {
	try { console.debug('[prisma.query]', e.query, 'params=', e.params, 'durationMs=', e.duration) } catch (err) {}
});
prisma.$on('error', (e) => { try { console.error('[prisma.error]', e) } catch (err) {} })

export default prisma;
