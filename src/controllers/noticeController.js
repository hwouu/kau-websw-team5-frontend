import { getNotices, getNoticeById ,createNotice, updateNotice, deleteNotice } from '../services/noticeService.js';

export const getNoticesHandler = async (req, res) => {
    try {
        const notices = await getNotices();
        res.status(200).json(notices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getNoticeByIdHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const notice = await getNoticeById(id);

        if(!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        res.status(200).json(notice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createNoticeHandler = async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.user?.userId;

        const newNotice = await createNotice(userId, title, content);
        res.status(201).json(newNotice);
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
};

export const updateNoticeHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user?.userId;

    const updatedNotice = await updateNotice(userId, parseInt(id), title, content);
    res.status(200).json(updatedNotice);
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
};

export const deleteNoticeHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    await deleteNotice(userId, parseInt(id));
    res.status(200).json({ message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
};
