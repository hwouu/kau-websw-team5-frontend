import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from '../services/faqService.js';

export const getFAQsHandler = async (req, res) => {
    try {
        const faqs = await getFAQs();
        res.status(200).json(faqs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createFAQHandler = async (req, res) => {
    try {
        const { question, answer } = req.body;
        const userId = req.user?.userId;

        const newFAQ = await createFAQ(userId, question, answer);
        res.status(201).json(newFAQ);
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
};

export const updateFAQHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;
    const userId = req.user?.userId;

    const updatedFAQ = await updateFAQ(userId, parseInt(id), question, answer);
    res.status(200).json(updatedFAQ);
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
};

export const deleteFAQHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await deleteFAQ(userId, parseInt(id));
    res.status(200).json({ message: 'FAQ가 삭제되었습니다. ' });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
};
