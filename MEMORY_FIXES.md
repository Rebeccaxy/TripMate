# 内存溢出修复总结

## 问题诊断

根据崩溃日志分析，应用在 Expo Go 中因为 Hermes 内存溢出（OOM）而崩溃。关键证据：
- `hermes::vm::GCBase::oom` - 内存溢出
- `hermes::vm::HadesGC::OldGen::alloc` - 分配内存失败
- 崩溃发生在处理 Generator 和 Promise 时

## 已实施的修复

### 1. 修复无限循环问题 ⚠️ **关键修复**
- **问题**：`useEffect` 依赖项包含 `messages`，而 effect 内部会更新 `messages`，导致无限循环
- **修复**：从依赖项中移除 `messages`，使用 `hasAutoReplied` 标志防止重复执行

### 2. 优化状态更新
- **之前**：使用 `filter` 和展开运算符创建多个临时数组
- **现在**：使用循环创建新数组，减少临时对象

### 3. 清理定时器
- 为所有 `setTimeout` 添加清理函数
- 使用 `requestAnimationFrame` 优化滚动回调

### 4. 限制数据大小
- 对话历史：完全禁用
- max_tokens：300
- 响应长度：300 字符
- 系统提示词：200 字符
- 用户消息：200 字符
- **消息数组限制**：最多保留50条消息（内存和存储）

### 6. 减少日志输出
- 将详细的 `console.log` 限制为仅在开发模式（`__DEV__`）下输出
- 避免在生产环境中输出大量日志导致内存压力

### 5. 简化异步处理
- 移除复杂的 `Promise.resolve().then()` 链
- 使用简单的 `async` 函数
- 延迟存储操作，避免阻塞 UI

### 7. 防止消息数组无限增长 ⚠️ **关键修复**
- **问题**：消息数组可以无限增长，导致内存溢出
- **修复**：
  - 在 `chatService.ts` 中限制存储的消息数量（最多50条）
  - 在组件状态中限制内存中的消息数量（最多50条）
  - 所有 `setMessages` 调用都会检查并限制数组大小

## 测试步骤

1. **重置模拟器**（如果问题持续）：
   ```bash
   xcrun simctl shutdown all
   xcrun simctl erase all
   ```

2. **清除 Metro 缓存**：
   ```bash
   npx expo start -c
   ```

3. **测试空白项目**：
   - 创建一个新的空白 Expo 项目
   - 如果空白项目正常，说明问题在应用代码中

4. **尝试 JSC 引擎**：
   - 已在 `app.json` 中配置 iOS 使用 JSC
   - 需要构建开发客户端（dev build）才能生效
   - Expo Go 无法更改 JS 引擎

## 如果问题仍然存在

### 选项 1：构建开发客户端
```bash
npx expo prebuild
npx expo run:ios
```
这将使用 JSC 而不是 Hermes，可能解决内存问题。

### 选项 2：使用 Chrome DevTools 分析内存
1. 在 Expo Go 中打开开发者菜单
2. 选择 "Open JS Debugger"
3. 在 Chrome DevTools 中监控内存使用
4. 观察在崩溃前内存是否持续增长（内存泄漏）

### 选项 3：进一步减少内存使用
- 将 max_tokens 减少到 200
- 将响应长度限制到 200 字符
- 完全禁用用户偏好系统提示词

## 关键代码更改

### useEffect 依赖项修复
```typescript
// ❌ 之前（会导致无限循环）
useEffect(() => {
  setMessages(...); // 更新 messages
}, [messages, ...]); // messages 在依赖项中

// ✅ 现在
useEffect(() => {
  setMessages(...);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialMessage, hasAutoReplied, id]); // 移除 messages
```

### 状态更新优化
```typescript
// ❌ 之前（创建多个临时数组）
setMessages((prev) => {
  const filtered = prev.filter(...);
  return [...filtered, newMessage];
});

// ✅ 现在（使用循环，减少临时对象）
setMessages((prev) => {
  const newMessages: ChatMessage[] = [];
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].id !== loadingMessageId) {
      newMessages.push(prev[i]);
    }
  }
  newMessages.push(newMessage);
  return newMessages;
});
```

## 下一步

如果问题仍然存在，请：
1. 提供 Metro 终端输出（启动后最后 100 行）
2. 说明启动时运行的内容（providers、字体加载、主题加载等）
3. 检查是否有其他导入大量数据的模块

