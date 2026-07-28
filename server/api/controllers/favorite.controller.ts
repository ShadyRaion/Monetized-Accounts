import { type Request, type Response } from 'express';
import prisma from '../utils/prisma.ts';

export const addFavorite = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: 'productId required' });
    const exists = await prisma.favorite.findFirst({ where: { userId, productId } });
    if (exists) return res.status(400).json({ message: 'Already favorited' });
    const fav = await prisma.favorite.create({ data: { userId, productId } });
    res.status(201).json(fav);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const removeFavorite = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const fav = await prisma.favorite.findFirst({ where: { userId, productId } });
    if (!fav) return res.status(404).json({ message: 'Not found' });
    await prisma.favorite.delete({ where: { id: fav.id } });
    res.json({ message: 'Removed' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const listFavorites = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const favs = await prisma.favorite.findMany({ where: { userId }, include: { product: true } });
    res.json(favs);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export default {};



