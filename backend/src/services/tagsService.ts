import * as tagsRepo from '../repos/tags';

export interface Tag {
    id: string;
    name: string;
    slug: string;
    type: 'SECTION' | 'PRODUCT';
    displayOrder: number;
    productSlugs: string;
    createdAt: string;
    updatedAt: string;
}

export async function getAllTags(): Promise<Tag[]> {
    return await tagsRepo.getAllTags();
}

export async function createTag(data: Partial<Tag>): Promise<Tag> {
    return await tagsRepo.createTag(data);
}

export async function updateTag(id: string, updates: Partial<Tag>): Promise<Tag | null> {
    return await tagsRepo.updateTag(id, updates);
}

export async function deleteTag(id: string): Promise<boolean> {
    return await tagsRepo.deleteTag(id);
}

export async function getProductsBySection(): Promise<any[]> {
    return await tagsRepo.getProductsBySection();
}

export default {
    getAllTags,
    createTag,
    updateTag,
    deleteTag,
    getProductsBySection,
};
