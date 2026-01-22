const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Note = require('../models/Note');
const Post = require('../models/Post');

function ensureValid(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array(),
    });
    return false;
  }
  return true;
}

function genId(prefix = '') {
  return (
    prefix +
    Date.now().toString() +
    '-' +
    Math.random().toString(36).slice(2, 8)
  );
}

function noteFromBody(req) {
  const sections = Array.isArray(req.body.sections) ? req.body.sections : [];
  return {
    title: (req.body.title || '').trim(),
    placeId: req.body.placeId || null,
    sections,
  };
}

// --- Promisified model helpers ---
function createNote(note) {
  return new Promise((resolve, reject) => {
    Note.create(note, (err, created) => (err ? reject(err) : resolve(created)));
  });
}

function findNoteById(noteId) {
  return new Promise((resolve, reject) => {
    Note.findById(noteId, (err, note) => (err ? reject(err) : resolve(note)));
  });
}

function updateNote(noteId, userId, updates) {
  return new Promise((resolve, reject) => {
    Note.update(noteId, userId, updates, (err, note) =>
      err ? reject(err) : resolve(note)
    );
  });
}

function deleteNote(noteId, userId) {
  return new Promise((resolve, reject) => {
    Note.delete(noteId, userId, (err, ok) => (err ? reject(err) : resolve(ok)));
  });
}

function listNotesByStatus(userId, status) {
  return new Promise((resolve, reject) => {
    Note.findByStatus(userId, status, (err, notes) =>
      err ? reject(err) : resolve(notes)
    );
  });
}

function createPost(post) {
  return new Promise((resolve, reject) => {
    Post.create(post, (err, created) => (err ? reject(err) : resolve(created)));
  });
}

function deletePostsByNoteId(noteId) {
  return new Promise((resolve, reject) => {
    Post.deleteByNoteId(noteId, (err, ok) =>
      err ? reject(err) : resolve(ok)
    );
  });
}

function listPostsByCategory(category) {
  return new Promise((resolve, reject) => {
    Post.findByCategory(category, (err, posts) =>
      err ? reject(err) : resolve(posts)
    );
  });
}

function findPostById(postId) {
  return new Promise((resolve, reject) => {
    Post.findById(postId, (err, post) => (err ? reject(err) : resolve(post)));
  });
}

function deletePost(postId) {
  return new Promise((resolve, reject) => {
    Post.delete(postId, (err, ok) => (err ? reject(err) : resolve(ok)));
  });
}

/**
 * GET /api/notes/drafts
 * 获取草稿列表
 */
router.get('/drafts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const drafts = await listNotesByStatus(userId, 'draft');
    res.json({ success: true, drafts });
  } catch (error) {
    console.error('[notes/drafts] 获取草稿失败:', error);
    res.status(500).json({ success: false, message: '获取草稿失败' });
  }
});

/**
 * POST /api/notes/drafts
 * 保存草稿
 */
router.post(
  '/drafts',
  authenticateToken,
  [
    body('title').isString().trim().notEmpty().withMessage('标题不能为空'),
    body('placeId').optional().isString(),
    body('sections').isArray({ min: 1 }).withMessage('至少需要一个分区'),
  ],
  async (req, res) => {
    if (!ensureValid(req, res)) return;
    try {
      const userId = req.user.id;
      const now = new Date().toISOString();
      const { title, placeId, sections } = noteFromBody(req);

      const noteId = req.body.id || genId('note-');
      const created = await createNote({
        id: noteId,
        userId,
        title,
        placeId,
        status: 'draft',
        sections,
        createdAt: now,
        updatedAt: now,
      });
      res.json({ success: true, note: created });
    } catch (error) {
      console.error('[notes/drafts] 保存草稿失败:', error);
      res.status(500).json({ success: false, message: '保存草稿失败' });
    }
  }
);

/**
 * PUT /api/notes/drafts/:id
 * 更新草稿
 */
router.put(
  '/drafts/:id',
  authenticateToken,
  [
    param('id').isString().notEmpty(),
    body('title').optional().isString().trim().notEmpty(),
    body('placeId').optional().isString(),
    body('sections').optional().isArray({ min: 1 }),
  ],
  async (req, res) => {
    if (!ensureValid(req, res)) return;
    try {
      const userId = req.user.id;
      const noteId = req.params.id;
      const existing = await findNoteById(noteId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ success: false, message: '草稿不存在' });
      }
      if (existing.status !== 'draft') {
        return res
          .status(400)
          .json({ success: false, message: '仅草稿可通过此接口更新' });
      }

      const updates = {};
      if (req.body.title != null) updates.title = req.body.title.trim();
      if (req.body.placeId !== undefined) updates.placeId = req.body.placeId;
      if (req.body.sections != null) updates.sections = req.body.sections;

      const updated = await updateNote(noteId, userId, updates);
      res.json({ success: true, note: updated });
    } catch (error) {
      console.error('[notes/drafts] 更新草稿失败:', error);
      res.status(500).json({ success: false, message: '更新草稿失败' });
    }
  }
);

/**
 * DELETE /api/notes/drafts/:id
 * 删除草稿
 */
router.delete(
  '/drafts/:id',
  authenticateToken,
  [param('id').isString().notEmpty()],
  async (req, res) => {
    if (!ensureValid(req, res)) return;
    try {
      const userId = req.user.id;
      const noteId = req.params.id;

      const existing = await findNoteById(noteId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ success: false, message: '草稿不存在' });
      }
      if (existing.status !== 'draft') {
        return res
          .status(400)
          .json({ success: false, message: '仅草稿可通过此接口删除' });
      }

      await deleteNote(noteId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('[notes/drafts] 删除草稿失败:', error);
      res.status(500).json({ success: false, message: '删除草稿失败' });
    }
  }
);

/**
 * POST /api/notes/publish
 * 发布笔记：将 note.status 置为 published，并按 sections 拆分创建 posts
 */
router.post(
  '/publish',
  authenticateToken,
  [
    body('id').optional().isString(),
    body('title').isString().trim().notEmpty().withMessage('标题不能为空'),
    body('placeId').optional().isString(),
    body('sections').isArray({ min: 1 }).withMessage('至少需要一个分区'),
  ],
  async (req, res) => {
    if (!ensureValid(req, res)) return;
    try {
      const userId = req.user.id;
      const now = new Date().toISOString();
      const { title, placeId, sections } = noteFromBody(req);

      const noteId = req.body.id || genId('note-');
      const existing = await findNoteById(noteId);

      let note;
      if (!existing) {
        note = await createNote({
          id: noteId,
          userId,
          title,
          placeId,
          status: 'published',
          sections,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        if (existing.userId !== userId) {
          return res.status(403).json({ success: false, message: '无权限' });
        }
        // 重新发布：先清理旧 posts，再更新 note
        await deletePostsByNoteId(noteId);
        note = await updateNote(noteId, userId, {
          title,
          placeId,
          sections,
          status: 'published',
        });
      }

      const posts = [];
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const postId = `${noteId}-post-${i}`;
        const created = await createPost({
          id: postId,
          noteId,
          userId,
          placeId,
          category: section.category,
          title: section.title,
          text: section.text,
          images: Array.isArray(section.images) ? section.images : [],
          createdAt: now,
        });
        posts.push(created);
      }

      res.json({ success: true, note, posts });
    } catch (error) {
      console.error('[notes/publish] 发布失败:', error);
      res.status(500).json({ success: false, message: '发布失败' });
    }
  }
);

/**
 * GET /api/notes/published
 * 获取已发布笔记列表
 */
router.get('/published', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notes = await listNotesByStatus(userId, 'published');
    res.json({ success: true, notes });
  } catch (error) {
    console.error('[notes/published] 获取失败:', error);
    res.status(500).json({ success: false, message: '获取已发布笔记失败' });
  }
});

/**
 * GET /api/notes/posts
 * 获取帖子（按分类）
 */
router.get(
  '/posts',
  [query('category').isIn(['sight', 'food', 'route']).withMessage('category 无效')],
  async (req, res) => {
    if (!ensureValid(req, res)) return;
    try {
      const posts = await listPostsByCategory(req.query.category);
      res.json({ success: true, posts });
    } catch (error) {
      console.error('[notes/posts] 获取帖子失败:', error);
      res.status(500).json({ success: false, message: '获取帖子失败' });
    }
  }
);

/**
 * GET /api/notes/posts/:id
 * 获取单条帖子
 */
router.get(
  '/posts/:id',
  [param('id').isString().notEmpty()],
  async (req, res) => {
    if (!ensureValid(req, res)) return;
    try {
      const post = await findPostById(req.params.id);
      if (!post) return res.status(404).json({ success: false, message: '帖子不存在' });
      res.json({ success: true, post });
    } catch (error) {
      console.error('[notes/posts/:id] 获取帖子失败:', error);
      res.status(500).json({ success: false, message: '获取帖子失败' });
    }
  }
);

/**
 * DELETE /api/notes/posts/:id
 * 删除帖子（仅可删除自己的帖子）
 */
router.delete(
  '/posts/:id',
  authenticateToken,
  [param('id').isString().notEmpty()],
  async (req, res) => {
    if (!ensureValid(req, res)) return;
    try {
      const userId = req.user.id;
      const post = await findPostById(req.params.id);
      if (!post) return res.status(404).json({ success: false, message: '帖子不存在' });
      if (post.userId !== userId) return res.status(403).json({ success: false, message: '无权限' });
      await deletePost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[notes/posts/:id] 删除帖子失败:', error);
      res.status(500).json({ success: false, message: '删除帖子失败' });
    }
  }
);

/**
 * GET /api/notes/:id
 * 获取单条笔记（草稿或已发布）
 */
router.get(
  '/:id',
  authenticateToken,
  [param('id').isString().notEmpty()],
  async (req, res) => {
    if (!ensureValid(req, res)) return;
    try {
      const userId = req.user.id;
      const note = await findNoteById(req.params.id);
      if (!note || note.userId !== userId) {
        return res.status(404).json({ success: false, message: '笔记不存在' });
      }
      res.json({ success: true, note });
    } catch (error) {
      console.error('[notes/:id] 获取笔记失败:', error);
      res.status(500).json({ success: false, message: '获取笔记失败' });
    }
  }
);

/**
 * DELETE /api/notes/:id
 * 删除笔记（草稿或已发布）
 */
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isString().notEmpty()],
  async (req, res) => {
    if (!ensureValid(req, res)) return;
    try {
      const userId = req.user.id;
      const noteId = req.params.id;
      const existing = await findNoteById(noteId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ success: false, message: '笔记不存在' });
      }
      await deletePostsByNoteId(noteId);
      await deleteNote(noteId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('[notes/:id] 删除笔记失败:', error);
      res.status(500).json({ success: false, message: '删除笔记失败' });
    }
  }
);

module.exports = router;

