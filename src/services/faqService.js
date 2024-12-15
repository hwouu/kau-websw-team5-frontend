import prisma from '../config/prismaClient.js';

// FAQ 조회
export const getFAQs = async () => {
    return await prisma.fAQs.findMany();
};

// FAQ 작성 (관리자)
export const createFAQ = async (userId, question, answer) => {
    const user = await prisma.user.findUnique({ where: { userID : userId } });
    if (!user || !user.isMaster) {
        throw new Error('관리자만 작성 가능합니다.');
    }

    return await prisma.fAQs.create({
        data: { question, answer },
    });
};

// FAQ 수정 (관리자)
export const updateFAQ = async (userId, id, question, answer) => {
    const user = await prisma.user.findUnique({ where: { userID : userId } });
    if (!user || !user.isMaster) {
        throw new Error('관리자만 수정 가능합니다.');
    }

    return await prisma.fAQs.update({
        where: { id },
        data: { question, answer },
    });
};

// FAQ 삭제 (관리자)
export const deleteFAQ = async (userId, id) => {
    const user = await prisma.user.findUnique({ where: { userID : userId } });
    if (!user || !user.isMaster) {
        throw new Error('관리자만 삭제 가능합니다.');
    }

    return await prisma.fAQs.delete({
        where: { id },
    });
};