import { type Request, type Response } from 'express';
import prisma from '../utils/prisma.ts';
import { broadcastEvent } from '../sse.ts'

// Minimal, robust ticket controller. Status values: 'open' | 'replied' | 'closed'

export const createTicket = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type = 'Other', subject, message } = req.body;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    if (!subject || !message) return res.status(400).json({ message: 'Missing fields' });

    const ticket = await prisma.supportTicket.create({
      data: { userId, type, subject, status: 'open' }
    });

    const msg = await prisma.ticketMessage.create({ data: { ticketId: ticket.id, senderId: userId, message } });

    const result = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      include: { messages: { include: { sender: { select: { id: true, name: true, email: true, role: true } } } } }
    });

    try { broadcastEvent({ type: 'ticket', action: 'created', data: result }) } catch (e) {}
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getUserTickets = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: {
          include: {
            sender: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        }
      }
    });
    tickets.sort((a: { updatedAt: Date | string }, b: { updatedAt: Date | string }) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const addMessage = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { ticketId } = req.params;
    const { message } = req.body;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    if (!message) return res.status(400).json({ message: 'Missing message' });

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // If ticket is closed, only admins may add messages (or require reopen first)
    if (ticket.status === 'closed' && userRole !== 'ADMIN') return res.status(400).json({ message: 'Ticket is closed' });

    await prisma.ticketMessage.create({ data: { ticketId, senderId: userId, message } });

    const newStatus = userRole === 'ADMIN' ? 'replied' : 'open';
    if (newStatus !== ticket.status) {
      await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: newStatus } });
    }

    const updated = await prisma.supportTicket.findUnique({ where: { id: ticketId }, include: { messages: { include: { sender: { select: { id: true, name: true, email: true, role: true } } } } } });
    try { broadcastEvent({ type: 'ticket', action: 'updated', data: updated }) } catch (e) {}
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const adminListTickets = async (req: any, res: Response) => {
  try {
    const requester = req.user?.id ?? 'unknown'
    console.debug(`[tickets] adminListTickets requested by user=${requester}`)
    const tickets = await prisma.supportTicket.findMany({ include: { user: { select: { id: true, name: true, email: true } }, messages: { include: { sender: { select: { id: true, name: true, email: true, role: true } } } } } });
    tickets.sort((a: { updatedAt: Date | string }, b: { updatedAt: Date | string }) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    console.debug(`[tickets] adminListTickets returning ${tickets.length} tickets`)
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const adminCloseTicket = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.supportTicket.update({ where: { id }, data: { status: 'closed' } });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
}

export const adminReopenTicket = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const reopened = await prisma.supportTicket.update({ where: { id }, data: { status: 'open' } });
    res.json(reopened);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
}

export const updateTicket = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Missing status' });
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.userId !== req.user?.id && req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Access denied' });
    const normalized = String(status).toLowerCase();
    if (!['open','replied','closed'].includes(normalized)) return res.status(400).json({ message: 'Invalid status' });
    const updated = await prisma.supportTicket.update({ where: { id }, data: { status: normalized } });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
}

export const deleteTicket = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    // Delete messages then ticket
    await prisma.ticketMessage.deleteMany({ where: { ticketId: id } });
    await prisma.supportTicket.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
}

// Admin-only: reset messaging tables (TRUNCATE). This will permanently delete all tickets/messages.
export const adminResetMessaging = async (req: any, res: Response) => {
  try {
    // Only admin middleware should call this endpoint
    await prisma.ticketMessage.deleteMany({});
    await prisma.supportTicket.deleteMany({});
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
}

export default {};



