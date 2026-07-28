import prisma from "../utils/prisma.js";
export const listFaqs = async (req, res) => {
    try {
        const faqs = await prisma.faq.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
        res.json(faqs);
    }
    catch (err) {
        console.error('listFaqs error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const createFaq = async (req, res) => {
    try {
        const { question, answer, hidden, order } = req.body;
        if (!question || !answer)
            return res.status(400).json({ message: 'Question and answer required' });
        const faq = await prisma.faq.create({ data: { question, answer, hidden: !!hidden, order: order ?? 0 } });
        res.status(201).json(faq);
    }
    catch (err) {
        console.error('createFaq error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const updateFaq = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer, hidden, order } = req.body;
        const faq = await prisma.faq.update({ where: { id }, data: { question, answer, hidden: !!hidden, order: order ?? 0 } });
        res.json(faq);
    }
    catch (err) {
        console.error('updateFaq error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const deleteFaq = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.faq.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        console.error('deleteFaq error', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export default {};
//# sourceMappingURL=faq.controller.js.map