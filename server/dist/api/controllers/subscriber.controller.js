import prisma from "../utils/prisma.js";
import { broadcastEvent } from "../sse.js";
export const listSubscribers = async (_req, res) => {
    try {
        const subscribers = await prisma.subscriber.findMany({ orderBy: { subscribedAt: 'desc' } });
        res.json(subscribers);
    }
    catch (error) {
        console.error('listSubscribers error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const createSubscriber = async (req, res) => {
    try {
        const { email, name, source } = req.body ?? {};
        const authUser = req.user;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Email is required' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        let existing = await prisma.subscriber.findUnique({ where: { email: normalizedEmail } });
        if (existing) {
            const updateData = {};
            if (!existing.userId && authUser?.id) {
                updateData.userId = authUser.id;
            }
            if (!existing.name && name?.trim()) {
                updateData.name = name.trim();
            }
            if (existing.status === 'unsubscribed') {
                updateData.status = 'active';
                updateData.unsubscribedAt = null;
                updateData.subscribedAt = new Date();
            }
            if (Object.keys(updateData).length > 0) {
                existing = await prisma.subscriber.update({
                    where: { id: existing.id },
                    data: updateData
                });
            }
            try {
                broadcastEvent({ type: 'subscriber', action: 'updated', data: existing });
            }
            catch (broadcastError) {
                console.warn('[subscriber] failed to broadcast update', broadcastError);
            }
            return res.status(200).json(existing);
        }
        const subscriber = await prisma.subscriber.create({
            data: {
                email: normalizedEmail,
                name: name?.trim() || null,
                source: source && typeof source === 'string' ? source : 'newsletter',
                status: 'active',
                subscribedAt: new Date(),
                userId: authUser?.id ?? null
            }
        });
        try {
            broadcastEvent({ type: 'subscriber', action: 'created', data: subscriber });
        }
        catch (broadcastError) {
            console.warn('[subscriber] failed to broadcast create', broadcastError);
        }
        res.status(201).json(subscriber);
    }
    catch (error) {
        console.error('createSubscriber error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const deleteSubscriber = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || Array.isArray(id)) {
            return res.status(400).json({ message: 'Invalid subscriber id' });
        }
        const subscriber = await prisma.subscriber.findUnique({ where: { id } });
        if (!subscriber) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const canDeleteByEmail = async () => {
            const user = await prisma.user.findUnique({ where: { id: authUser.id } });
            return user?.email?.toLowerCase() === subscriber.email.toLowerCase();
        };
        const ownsSubscriber = subscriber.userId === authUser.id;
        const emailMatches = await canDeleteByEmail();
        if (authUser.role !== 'ADMIN' && !ownsSubscriber && !emailMatches) {
            return res.status(403).json({ message: 'Access denied' });
        }
        await prisma.subscriber.delete({ where: { id } });
        try {
            broadcastEvent({ type: 'subscriber', action: 'deleted', data: { id } });
        }
        catch (broadcastError) {
            console.warn('[subscriber] failed to broadcast delete', broadcastError);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('deleteSubscriber error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
//# sourceMappingURL=subscriber.controller.js.map