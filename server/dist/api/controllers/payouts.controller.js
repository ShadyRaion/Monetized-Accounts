import prisma from "../utils/prisma.js";
export const listAffiliatePurchases = async (req, res) => {
    try {
        const list = await prisma.affiliatePurchase.findMany({ include: { affiliate: { include: { user: true } }, orderItem: { include: { product: true } } }, orderBy: { createdAt: 'desc' } });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const markPurchasePaid = async (req, res) => {
    try {
        const { id } = req.params;
        const p = await prisma.affiliatePurchase.update({ where: { id }, data: { status: 'Paid' } });
        res.json(p);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export default {};
//# sourceMappingURL=payouts.controller.js.map