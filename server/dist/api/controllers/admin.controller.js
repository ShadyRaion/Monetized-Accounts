import prisma from "../utils/prisma.js";
export const getStats = async (req, res) => {
    try {
        const users = await prisma.user.count();
        const products = await prisma.product.count();
        const orders = await prisma.order.count();
        const revenueAgg = await prisma.order.aggregate({ _sum: { totalAmount: true } });
        const revenue = revenueAgg._sum.totalAmount || 0;
        res.json({ users, products, orders, revenue });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const listUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: {
                    not: 'ADMIN'
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
// Return customers with DB-aggregated metrics derived only from completed orders
export const listCustomers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { role: { not: 'ADMIN' } },
            orderBy: { createdAt: 'desc' },
            include: {
                orders: {
                    where: { status: { in: ['Completed', 'completed'] } },
                    select: { id: true, totalAmount: true, createdAt: true }
                }
            }
        });
        const mapped = users.map((u) => {
            const userOrders = (u.orders || []);
            const totalSpent = userOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
            const ordersCount = userOrders.length;
            const firstPurchaseDate = ordersCount > 0 ? new Date(Math.min(...userOrders.map((o) => new Date(o.createdAt).getTime()))).toISOString().split('T')[0] : '';
            const lastPurchaseDate = ordersCount > 0 ? new Date(Math.max(...userOrders.map((o) => new Date(o.createdAt).getTime()))).toISOString().split('T')[0] : '';
            return {
                id: u.id,
                email: u.email,
                name: u.name,
                referralCode: u.referralCode,
                role: u.role,
                isBanned: u.isBanned,
                ordersCount,
                totalSpent,
                firstPurchaseDate,
                lastPurchaseDate,
                orders: userOrders.map(o => o.id)
            };
        });
        res.json(mapped);
    }
    catch (error) {
        console.error('listCustomers error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const banUser = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = req.body?.reason ?? 'Banned by admin';
        const user = await prisma.user.update({ where: { id }, data: { isBanned: true } });
        if (user?.email) {
            try {
                const bl = await prisma.blacklist.upsert({
                    where: { email: user.email },
                    update: { reason },
                    create: { email: user.email, reason }
                });
                console.log('[admin] blacklist upsert result for', user.email, bl);
            }
            catch (e) {
                console.error('[admin] blacklist upsert error for', user.email, e);
            }
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const unbanUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.update({ where: { id }, data: { isBanned: false } });
        if (user?.email) {
            try {
                const del = await prisma.blacklist.deleteMany({ where: { email: user.email } });
                console.log('[admin] blacklist deleteMany result for', user.email, del);
            }
            catch (e) {
                console.error('[admin] blacklist delete error for', user.email, e);
            }
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const autoCompleteOrders = async (req, res) => {
    try {
        // Complete orders that are Delivered and older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const orders = await prisma.order.findMany({ where: { status: 'Delivered', updatedAt: { lt: thirtyDaysAgo } } });
        for (const o of orders) {
            await prisma.order.update({ where: { id: o.id }, data: { status: 'Completed' } });
        }
        res.json({ completed: orders.length });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('deleteUser error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const listBlacklist = async (req, res) => {
    try {
        const items = await prisma.blacklist.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(items);
    }
    catch (error) {
        console.error('listBlacklist error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const addToBlacklist = async (req, res) => {
    try {
        const { email, reason } = req.body;
        if (!email)
            return res.status(400).json({ message: 'Email required' });
        const item = await prisma.blacklist.create({ data: { email: email.toLowerCase(), reason } });
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (user)
            await prisma.user.update({ where: { id: user.id }, data: { isBanned: true } });
        res.status(201).json(item);
    }
    catch (error) {
        console.error('addToBlacklist error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const removeFromBlacklist = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.blacklist.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('removeFromBlacklist error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export default {};
//# sourceMappingURL=admin.controller.js.map