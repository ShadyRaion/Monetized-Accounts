import { type Request, type Response } from 'express';
import prisma from '../utils/prisma.ts';

export const listAffiliatePurchases = async (req: any, res: Response) => {
  try {
    const list = await prisma.affiliatePurchase.findMany({ include: { affiliate: { include: { user: true } }, orderItem: { include: { product: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (error) { res.status(500).json({ message: 'Internal server error' }) }
}

export const markPurchasePaid = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const p = await prisma.affiliatePurchase.update({ where: { id }, data: { status: 'Paid' } });
    res.json(p);
  } catch (error) { res.status(500).json({ message: 'Internal server error' }) }
}

export default {};



