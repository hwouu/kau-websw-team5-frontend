import prisma from '../config/prismaClient.js';

// 공지 조회
export const getNotices = async () => {
    return await prisma.notices.findMany();
};

// 공지 상세 조회
export const getNoticeById = async (id) => {
    return await prisma.notices.findUnique({
        where: { id: parseInt(id) },
    });
}
  
// 공지 작성 (관리자)
export const createNotice = async (userId, title, content) => {
    const user = await prisma.user.findUnique({ where: { userID: userId } });
    if (!user || !user.isMaster) {
        throw new Error('관리자만 작성 가능합니다.');
    }
    return await prisma.notices.create({
        data: { title, content },
    });
};
  
// 공지 수정 (관리자)
export const updateNotice = async (userId, id, title, content) => {
    const user = await prisma.user.findUnique({ where: { userID: userId } });
    if (!user || !user.isMaster) {
        throw new Error('관리자만 수정 가능합니다.');
    }
    return await prisma.notices.update({
        where: { id },
        data: { title, content },
    });
};

// 공지 삭제 (관리자)  
export const deleteNotice = async (userId, id) => {
    const user = await prisma.user.findUnique({ where: { userID: userId } });
    if (!user || !user.isMaster) {
        throw new Error('관리자만 삭제 가능합니다.');
    }
    return await prisma.notices.delete({
        where: { id },
    });
};