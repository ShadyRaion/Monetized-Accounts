import prisma from "../utils/prisma.js";
const resolveAffiliateCode = async (userId, requestAffiliateCode) => {
    if (typeof requestAffiliateCode === 'string' && requestAffiliateCode.trim()) {
        return requestAffiliateCode.trim();
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    return user?.referralCode?.trim() || undefined;
};
export const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;
        if (!productId)
            return res.status(400).json({ message: 'productId required' });
        const existing = await prisma.cartItem.findFirst({ where: { userId, productId } });
        if (existing) {
            const updated = await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + (quantity || 1) } });
            return res.json(updated);
        }
        const item = await prisma.cartItem.create({ data: { userId, productId, quantity: quantity || 1 } });
        res.status(201).json(item);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const items = await prisma.cartItem.findMany({ where: { userId }, include: { product: true } });
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const item = await prisma.cartItem.findUnique({ where: { id } });
        if (!item || item.userId !== userId)
            return res.status(404).json({ message: 'Not found' });
        await prisma.cartItem.delete({ where: { id } });
        res.json({ message: 'Removed' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const quantity = Number(req.body.quantity);
        const verificationCount = Number(req.body.verificationCount ?? 0);
        if (!Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(verificationCount) || verificationCount < 0 || verificationCount > quantity) {
            return res.status(400).json({ message: 'Invalid cart quantity' });
        }
        const item = await prisma.cartItem.findFirst({ where: { id, userId } });
        if (!item)
            return res.status(404).json({ message: 'Not found' });
        const updated = await prisma.cartItem.update({ where: { id }, data: { quantity, verificationCount }, include: { product: true } });
        res.json(updated);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const checkoutCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentMethod } = req.body;
        const affiliateCode = await resolveAffiliateCode(userId, typeof req.body.affiliateCode === 'string' ? req.body.affiliateCode : undefined);
        const items = await prisma.cartItem.findMany({ where: { userId } });
        if (!items.length)
            return res.status(400).json({ message: 'Cart empty' });
        const productIds = items.map((i) => i.productId);
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
        let total = 0;
        for (const p of products)
            total += p.price;
        const order = await prisma.order.create({ data: { userId, totalAmount: total, status: 'VerifyingPayment', paymentMethod: paymentMethod ?? 'card', referralCode: affiliateCode ?? null } });
        for (const p of products) {
            await prisma.orderItem.create({ data: { orderId: order.id, productId: p.id } });
        }
        // clear cart
        await prisma.cartItem.deleteMany({ where: { userId } });
        res.status(201).json(order);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export default {};
//# sourceMappingURL=cart.controller.js.map