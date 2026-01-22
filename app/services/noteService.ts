/**
 * 旅行笔记服务
 * 管理用户的旅行笔记，包括创建、编辑、删除和查询
 * 支持草稿和发布功能，以及分区编辑
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from './authService';
import { API_CONFIG } from '@/config/api';

// 笔记状态
export type NoteStatus = 'draft' | 'published';

// 笔记分区
export interface NoteSection {
  category: 'sight' | 'food' | 'route'; // 内容类型：景点/美食/路线
  title: string; // 分区标题（例如景点名称）
  text: string; // 分区正文（支持 Markdown）
  images: string[]; // 图片列表，建议最多 5 张
}

// 笔记数据类型（新版本）
export interface Note {
  id: string;
  userId: string;
  title: string; // 笔记标题
  placeId?: string; // 关联地点 ID，可选
  status: NoteStatus; // draft 草稿 或 published 已发布
  sections: NoteSection[]; // 至少包含一项；用户可自行选择三个分类中的任意一个或多个
  createdAt: string; // ISO 字符串
  updatedAt: string; // ISO 字符串
  likeCount?: number; // 仅 published 状态需要
  favoriteCount?: number; // 仅 published 状态需要
  commentCount?: number; // 仅 published 状态需要
}

// 社区帖子（发布后的笔记分区会转化为帖子，或用户独立创建的帖子）
export interface Post {
  id: string;
  noteId?: string; // 对应的笔记 ID（可选，独立创建的帖子没有 noteId）
  userId: string;
  placeId?: string;
  category: 'sight' | 'food' | 'route';
  title: string;
  text: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  status: 'draft' | 'published'; // draft 草稿；published 已发布
}

// 兼容旧版本的 NoteItem（保留用于向后兼容）
export interface NoteItem {
  id: string;
  userId: string;
  title: string;
  content: string; // Markdown 格式
  placeId?: string; // 关联地点 ID，可选
  images?: string[]; // 图片数组（未来扩展）
  createdAt: string; // ISO 字符串
  updatedAt: string; // ISO 字符串
}

// 存储键名
const NOTES_STORAGE_KEY = '@tripMate:notes';
const POSTS_STORAGE_KEY = '@tripMate:posts';

// ==================== 新版本 Note API ====================

/**
 * 获取当前用户的所有笔记（新版本）
 */
export async function getNotesV2(): Promise<Note[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (notesJson) {
      const allNotes: Note[] = JSON.parse(notesJson);
      // 只返回当前用户的笔记
      return allNotes.filter((note) => note.userId === user.id);
    }
    return [];
  } catch (error) {
    console.error('获取笔记列表失败:', error);
    return [];
  }
}

/**
 * 根据 ID 获取单条笔记（新版本）
 */
export async function getNoteByIdV2(noteId: string): Promise<Note | null> {
  try {
    const notes = await getNotesV2();
    return notes.find((note) => note.id === noteId) || null;
  } catch (error) {
    console.error('获取笔记失败:', error);
    return null;
  }
}

/**
 * 保存草稿
 */
export async function saveDraft(
  note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'favoriteCount' | 'commentCount' | 'userId'>
): Promise<Note> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 验证至少有一个分区
    if (!note.sections || note.sections.length === 0) {
      throw new Error('笔记至少需要包含一个分区');
    }

    // 如果没有标题，使用第一个分区的标题作为默认值
    const title = note.title || note.sections[0]?.title || '未命名笔记';

    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const allNotes: Note[] = notesJson ? JSON.parse(notesJson) : [];

    const newNote: Note = {
      ...note,
      title,
      id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
      userId: user.id,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    allNotes.push(newNote);
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));

    // 尝试同步到服务器（如果网络可用）
    try {
      await syncDraftToServer(newNote);
    } catch (error) {
      console.warn('草稿同步到服务器失败，已保存到本地:', error);
    }

    return newNote;
  } catch (error) {
    console.error('保存草稿失败:', error);
    throw error;
  }
}

/**
 * 更新草稿
 */
export async function updateDraft(
  noteId: string,
  updatedFields: Partial<Omit<Note, 'id' | 'userId' | 'createdAt' | 'likeCount' | 'favoriteCount' | 'commentCount'>>
): Promise<Note> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!notesJson) {
      throw new Error('笔记不存在');
    }

    const allNotes: Note[] = JSON.parse(notesJson);
    const noteIndex = allNotes.findIndex(
      (note) => note.id === noteId && note.userId === user.id
    );

    if (noteIndex === -1) {
      throw new Error('笔记不存在或无权限');
    }

    // 如果更新了 sections，验证至少有一个分区
    if (updatedFields.sections && updatedFields.sections.length === 0) {
      throw new Error('笔记至少需要包含一个分区');
    }

    const updatedNote: Note = {
      ...allNotes[noteIndex],
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    allNotes[noteIndex] = updatedNote;
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));

    // 尝试同步到服务器
    try {
      await syncDraftToServer(updatedNote);
    } catch (error) {
      console.warn('草稿同步到服务器失败，已保存到本地:', error);
    }

    return updatedNote;
  } catch (error) {
    console.error('更新草稿失败:', error);
    throw error;
  }
}

/**
 * 获取草稿列表
 */
export async function getDrafts(): Promise<Note[]> {
  try {
    const notes = await getNotesV2();
    return notes.filter((note) => note.status === 'draft');
  } catch (error) {
    console.error('获取草稿列表失败:', error);
    return [];
  }
}

/**
 * 删除草稿
 */
export async function deleteDraft(noteId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!notesJson) {
      return;
    }

    const allNotes: Note[] = JSON.parse(notesJson);
    const filteredNotes = allNotes.filter(
      (note) => !(note.id === noteId && note.userId === user.id)
    );

    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(filteredNotes));

    // 尝试从服务器删除
    try {
      await deleteDraftFromServer(noteId);
    } catch (error) {
      console.warn('从服务器删除草稿失败:', error);
    }
  } catch (error) {
    console.error('删除草稿失败:', error);
    throw error;
  }
}

/**
 * 删除笔记（新版本，支持已发布和草稿）
 */
export async function deleteNoteV2(noteId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!notesJson) {
      return;
    }

    const allNotes: Note[] = JSON.parse(notesJson);
    const noteToDelete = allNotes.find(
      (note) => note.id === noteId && note.userId === user.id
    );

    if (!noteToDelete) {
      throw new Error('笔记不存在或无权限');
    }

    // 如果是已发布的笔记，同时删除相关的帖子
    if (noteToDelete.status === 'published') {
      const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
      if (postsJson) {
        const allPosts: Post[] = JSON.parse(postsJson);
        const filteredPosts = allPosts.filter((post) => post.noteId !== noteId);
        await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(filteredPosts));
      }
    }

    // 删除笔记
    const filteredNotes = allNotes.filter(
      (note) => !(note.id === noteId && note.userId === user.id)
    );
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(filteredNotes));

    // 尝试从服务器删除
    try {
      if (noteToDelete.status === 'published') {
        await deleteNoteFromServer(noteId);
      } else {
        await deleteDraftFromServer(noteId);
      }
    } catch (error) {
      console.warn('从服务器删除笔记失败:', error);
    }
  } catch (error) {
    console.error('删除笔记失败:', error);
    throw error;
  }
}

/**
 * 发布笔记
 */
export async function publishNote(
  note: Omit<Note, 'id' | 'likeCount' | 'favoriteCount' | 'commentCount' | 'userId'>
): Promise<{ note: Note; posts: Post[] }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 验证至少有一个分区
    if (!note.sections || note.sections.length === 0) {
      throw new Error('笔记至少需要包含一个分区才能发布');
    }

    // 如果没有标题，使用第一个分区的标题作为默认值
    const title = note.title || note.sections[0]?.title || '未命名笔记';

    // 生成笔记 ID（如果是新笔记）
    const noteId = note.id || Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);

    // 将每个分区转化为帖子
    const posts: Post[] = note.sections.map((section, index) => ({
      id: `${noteId}-post-${index}`,
      noteId: noteId,
      userId: user.id,
      placeId: note.placeId,
      category: section.category,
      title: section.title,
      text: section.text,
      images: section.images || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      status: 'published' as const,
    }));

    // 创建已发布的笔记
    const publishedNote: Note = {
      ...note,
      title,
      id: noteId,
      userId: user.id,
      status: 'published',
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
    };

    // 保存到本地存储
    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const allNotes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    
    // 如果是更新已有笔记，替换它；否则添加新笔记
    const existingIndex = allNotes.findIndex((n) => n.id === noteId);
    if (existingIndex >= 0) {
      allNotes[existingIndex] = publishedNote;
    } else {
      allNotes.push(publishedNote);
    }
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));

    // 保存帖子到本地存储
    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    const allPosts: Post[] = postsJson ? JSON.parse(postsJson) : [];
    posts.forEach((post) => {
      const existingPostIndex = allPosts.findIndex((p) => p.id === post.id);
      if (existingPostIndex >= 0) {
        allPosts[existingPostIndex] = post;
      } else {
        allPosts.push(post);
      }
    });
    await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(allPosts));

    // 尝试同步到服务器
    try {
      await syncNoteToServer(publishedNote, posts);
    } catch (error) {
      console.warn('笔记同步到服务器失败，已保存到本地:', error);
    }

    return { note: publishedNote, posts };
  } catch (error) {
    console.error('发布笔记失败:', error);
    throw error;
  }
}

/**
 * 获取已发布笔记
 */
export async function getPublishedNotes(): Promise<Note[]> {
  try {
    const notes = await getNotesV2();
    return notes.filter((note) => note.status === 'published');
  } catch (error) {
    console.error('获取已发布笔记失败:', error);
    return [];
  }
}

/**
 * 根据分类获取社区帖子（只返回已发布的帖子）
 */
export async function getPostsByCategory(category: 'sight' | 'food' | 'route'): Promise<Post[]> {
  try {
    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (postsJson) {
      const allPosts: Post[] = JSON.parse(postsJson);
      return allPosts
        .filter((post) => post.category === category && post.status === 'published')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error('获取社区帖子失败:', error);
    return [];
  }
}

/**
 * 根据 ID 获取单篇帖子
 */
export async function getPostById(postId: string): Promise<Post | null> {
  try {
    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (postsJson) {
      const allPosts: Post[] = JSON.parse(postsJson);
      return allPosts.find((post) => post.id === postId) || null;
    }
    return null;
  } catch (error) {
    console.error('获取帖子失败:', error);
    return null;
  }
}

/**
 * 根据笔记 ID 获取关联的帖子
 */
export async function getPostsByNoteId(noteId: string): Promise<Post[]> {
  try {
    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (postsJson) {
      const allPosts: Post[] = JSON.parse(postsJson);
      return allPosts.filter((post) => post.noteId === noteId);
    }
    return [];
  } catch (error) {
    console.error('获取笔记关联帖子失败:', error);
    return [];
  }
}

/**
 * 删除帖子
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (!postsJson) {
      return;
    }

    const allPosts: Post[] = JSON.parse(postsJson);
    const post = allPosts.find((p) => p.id === postId);

    if (!post) {
      throw new Error('帖子不存在');
    }

    // 验证权限：只能删除自己的帖子
    if (post.userId !== user.id) {
      throw new Error('无权限删除此帖子');
    }

    // 删除帖子
    const filteredPosts = allPosts.filter((p) => p.id !== postId);
    await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(filteredPosts));

    // 检查该笔记是否还有其他帖子，如果没有则删除笔记
    if (post.noteId) {
      const remainingPosts = filteredPosts.filter((p) => p.noteId === post.noteId);
      if (remainingPosts.length === 0) {
        // 该笔记的所有帖子都已删除，删除笔记
        const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
        if (notesJson) {
          const allNotes: Note[] = JSON.parse(notesJson);
          const filteredNotes = allNotes.filter((n) => n.id !== post.noteId);
          await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(filteredNotes));
        }
      }
    }

    // 尝试从服务器删除
    try {
      await deletePostFromServer(postId);
    } catch (error) {
      console.warn('从服务器删除帖子失败:', error);
    }
  } catch (error) {
    console.error('删除帖子失败:', error);
    throw error;
  }
}

// ==================== 帖子 CRUD API（独立创建的帖子）====================

/**
 * 保存帖子草稿（独立创建的帖子，不是来自笔记）
 */
export async function savePostDraft(
  post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'favoriteCount' | 'commentCount' | 'userId' | 'status'>
): Promise<Post> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 验证必填字段
    if (!post.title || !post.title.trim()) {
      throw new Error('帖子标题不能为空');
    }
    if (!post.category) {
      throw new Error('请选择帖子类别');
    }

    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    const allPosts: Post[] = postsJson ? JSON.parse(postsJson) : [];

    const newPost: Post = {
      ...post,
      id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
      userId: user.id,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      images: post.images || [],
    };

    allPosts.push(newPost);
    await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(allPosts));

    // 尝试同步到服务器
    try {
      await syncPostDraftToServer(newPost);
    } catch (error) {
      console.warn('草稿同步到服务器失败，已保存到本地:', error);
    }

    return newPost;
  } catch (error) {
    console.error('保存帖子草稿失败:', error);
    throw error;
  }
}

/**
 * 更新帖子草稿
 */
export async function updatePostDraft(
  postId: string,
  updatedFields: Partial<Omit<Post, 'id' | 'userId' | 'createdAt' | 'likeCount' | 'favoriteCount' | 'commentCount' | 'status'>>
): Promise<Post> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (!postsJson) {
      throw new Error('帖子不存在');
    }

    const allPosts: Post[] = JSON.parse(postsJson);
    const postIndex = allPosts.findIndex(
      (post) => post.id === postId && post.userId === user.id && post.status === 'draft'
    );

    if (postIndex === -1) {
      throw new Error('帖子不存在或无权限');
    }

    const updatedPost: Post = {
      ...allPosts[postIndex],
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    allPosts[postIndex] = updatedPost;
    await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(allPosts));

    // 尝试同步到服务器
    try {
      await syncPostDraftToServer(updatedPost);
    } catch (error) {
      console.warn('草稿同步到服务器失败，已保存到本地:', error);
    }

    return updatedPost;
  } catch (error) {
    console.error('更新帖子草稿失败:', error);
    throw error;
  }
}

/**
 * 获取当前用户的帖子草稿列表
 */
export async function getPostDrafts(): Promise<Post[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (postsJson) {
      const allPosts: Post[] = JSON.parse(postsJson);
      return allPosts
        .filter((post) => post.userId === user.id && post.status === 'draft')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return [];
  } catch (error) {
    console.error('获取帖子草稿列表失败:', error);
    return [];
  }
}

/**
 * 发布帖子（将草稿转为已发布，或直接发布新帖子）
 */
export async function publishPost(
  post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'favoriteCount' | 'commentCount' | 'userId' | 'status'> & { id?: string }
): Promise<Post> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 验证必填字段
    if (!post.title || !post.title.trim()) {
      throw new Error('帖子标题不能为空');
    }
    if (!post.text || !post.text.trim()) {
      throw new Error('帖子内容不能为空');
    }
    if (!post.category) {
      throw new Error('请选择帖子类别');
    }

    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    const allPosts: Post[] = postsJson ? JSON.parse(postsJson) : [];

    const postId = post.id || Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
    const existingIndex = allPosts.findIndex((p) => p.id === postId);

    const publishedPost: Post = {
      ...post,
      id: postId,
      userId: user.id,
      status: 'published',
      createdAt: existingIndex >= 0 ? allPosts[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: existingIndex >= 0 ? allPosts[existingIndex].likeCount : 0,
      favoriteCount: existingIndex >= 0 ? allPosts[existingIndex].favoriteCount : 0,
      commentCount: existingIndex >= 0 ? allPosts[existingIndex].commentCount : 0,
      images: post.images || [],
    };

    if (existingIndex >= 0) {
      allPosts[existingIndex] = publishedPost;
    } else {
      allPosts.push(publishedPost);
    }

    await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(allPosts));

    // 尝试同步到服务器
    try {
      await syncPostToServer(publishedPost);
    } catch (error) {
      console.warn('帖子同步到服务器失败，已保存到本地:', error);
    }

    return publishedPost;
  } catch (error) {
    console.error('发布帖子失败:', error);
    throw error;
  }
}

/**
 * 更新已发布的帖子
 */
export async function updatePost(
  postId: string,
  updatedFields: Partial<Omit<Post, 'id' | 'userId' | 'createdAt' | 'likeCount' | 'favoriteCount' | 'commentCount' | 'status'>>
): Promise<Post> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (!postsJson) {
      throw new Error('帖子不存在');
    }

    const allPosts: Post[] = JSON.parse(postsJson);
    const postIndex = allPosts.findIndex(
      (post) => post.id === postId && post.userId === user.id
    );

    if (postIndex === -1) {
      throw new Error('帖子不存在或无权限');
    }

    const updatedPost: Post = {
      ...allPosts[postIndex],
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    allPosts[postIndex] = updatedPost;
    await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(allPosts));

    // 尝试同步到服务器
    try {
      await syncPostToServer(updatedPost);
    } catch (error) {
      console.warn('帖子同步到服务器失败，已保存到本地:', error);
    }

    return updatedPost;
  } catch (error) {
    console.error('更新帖子失败:', error);
    throw error;
  }
}

/**
 * 获取当前用户已发布的帖子列表
 */
export async function getMyPublishedPosts(): Promise<Post[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (postsJson) {
      const allPosts: Post[] = JSON.parse(postsJson);
      return allPosts
        .filter((post) => post.userId === user.id && post.status === 'published')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error('获取已发布帖子列表失败:', error);
    return [];
  }
}

/**
 * 根据地点获取帖子列表
 */
export async function getPostsByPlace(placeId: string): Promise<Post[]> {
  try {
    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (postsJson) {
      const allPosts: Post[] = JSON.parse(postsJson);
      return allPosts
        .filter((post) => post.placeId === placeId && post.status === 'published')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error('获取地点帖子列表失败:', error);
    return [];
  }
}

/**
 * 搜索帖子
 */
export async function searchPosts(
  query: string,
  filters?: { userId?: string; category?: 'sight' | 'food' | 'route' }
): Promise<Post[]> {
  try {
    const postsJson = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (!postsJson) {
      return [];
    }

    const allPosts: Post[] = JSON.parse(postsJson);
    const lowerQuery = query.toLowerCase();

    let filtered = allPosts.filter((post) => {
      // 只搜索已发布的帖子
      if (post.status !== 'published') return false;

      // 应用过滤器
      if (filters?.userId && post.userId !== filters.userId) return false;
      if (filters?.category && post.category !== filters.category) return false;

      // 搜索标题、正文和地点ID
      return (
        post.title.toLowerCase().includes(lowerQuery) ||
        post.text.toLowerCase().includes(lowerQuery) ||
        (post.placeId && post.placeId.toLowerCase().includes(lowerQuery))
      );
    });

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('搜索帖子失败:', error);
    return [];
  }
}

// ==================== 服务器同步函数（占位实现）====================

/**
 * 同步草稿到服务器
 */
async function syncDraftToServer(note: Note): Promise<void> {
  // TODO: 实现服务器 API 调用
  // 当前先使用本地存储，后续可添加服务器同步
  console.log('同步草稿到服务器:', note.id);
}

/**
 * 从服务器删除草稿
 */
async function deleteDraftFromServer(noteId: string): Promise<void> {
  // TODO: 实现服务器 API 调用
  console.log('从服务器删除草稿:', noteId);
}

/**
 * 从服务器删除已发布笔记
 */
async function deleteNoteFromServer(noteId: string): Promise<void> {
  // TODO: 实现服务器 API 调用
  console.log('从服务器删除已发布笔记:', noteId);
}

/**
 * 从服务器删除帖子
 */
async function deletePostFromServer(postId: string): Promise<void> {
  // TODO: 实现服务器 API 调用
  console.log('从服务器删除帖子:', postId);
}

/**
 * 同步笔记和帖子到服务器
 */
async function syncNoteToServer(note: Note, posts: Post[]): Promise<void> {
  // TODO: 实现服务器 API 调用
  console.log('同步笔记到服务器:', note.id, '帖子数量:', posts.length);
}

/**
 * 同步帖子草稿到服务器
 */
async function syncPostDraftToServer(post: Post): Promise<void> {
  // TODO: 实现服务器 API 调用
  console.log('同步帖子草稿到服务器:', post.id);
}

/**
 * 同步已发布帖子到服务器
 */
async function syncPostToServer(post: Post): Promise<void> {
  // TODO: 实现服务器 API 调用
  console.log('同步帖子到服务器:', post.id);
}

// ==================== 兼容旧版本 API ====================

/**
 * 获取当前用户的所有笔记（旧版本，兼容）
 */
export async function getNotes(): Promise<NoteItem[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (notesJson) {
      const allNotes: NoteItem[] = JSON.parse(notesJson);
      // 只返回当前用户的笔记
      return allNotes.filter((note) => note.userId === user.id);
    }
    return [];
  } catch (error) {
    console.error('获取笔记列表失败:', error);
    return [];
  }
}

/**
 * 根据 ID 获取单条笔记（旧版本，兼容）
 */
export async function getNoteById(noteId: string): Promise<NoteItem | null> {
  try {
    const notes = await getNotes();
    return notes.find((note) => note.id === noteId) || null;
  } catch (error) {
    console.error('获取笔记失败:', error);
    return null;
  }
}

/**
 * 新建笔记（旧版本，兼容）
 */
export async function createNote(
  note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<NoteItem> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const allNotes: NoteItem[] = notesJson ? JSON.parse(notesJson) : [];

    const newNote: NoteItem = {
      ...note,
      id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
      userId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    allNotes.push(newNote);
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));

    return newNote;
  } catch (error) {
    console.error('创建笔记失败:', error);
    throw error;
  }
}

/**
 * 更新笔记（旧版本，兼容）
 */
export async function updateNote(
  noteId: string,
  updatedFields: Partial<Omit<NoteItem, 'id' | 'userId' | 'createdAt'>>
): Promise<NoteItem> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!notesJson) {
      throw new Error('笔记不存在');
    }

    const allNotes: NoteItem[] = JSON.parse(notesJson);
    const noteIndex = allNotes.findIndex(
      (note) => note.id === noteId && note.userId === user.id
    );

    if (noteIndex === -1) {
      throw new Error('笔记不存在或无权限');
    }

    const updatedNote: NoteItem = {
      ...allNotes[noteIndex],
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    allNotes[noteIndex] = updatedNote;
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));

    return updatedNote;
  } catch (error) {
    console.error('更新笔记失败:', error);
    throw error;
  }
}

/**
 * 删除笔记（旧版本，兼容）
 */
export async function deleteNote(noteId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!notesJson) {
      return;
    }

    const allNotes: NoteItem[] = JSON.parse(notesJson);
    const filteredNotes = allNotes.filter(
      (note) => !(note.id === noteId && note.userId === user.id)
    );

    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(filteredNotes));
  } catch (error) {
    console.error('删除笔记失败:', error);
    throw error;
  }
}

/**
 * 根据地点 ID 获取关联的笔记（旧版本，兼容）
 */
export async function getNotesByPlaceId(placeId: string): Promise<NoteItem[]> {
  try {
    const notes = await getNotes();
    return notes.filter((note) => note.placeId === placeId);
  } catch (error) {
    console.error('获取地点关联笔记失败:', error);
    return [];
  }
}
