import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getNoteByIdV2,
  saveDraft,
  updateDraft,
  publishNote,
  type Note,
  type NoteSection,
} from '@/services/noteService';
import { getPlaceById } from '@/services/communityService';

type SectionCategory = 'sight' | 'food' | 'route';

const CATEGORY_LABELS: Record<SectionCategory, string> = {
  sight: '景点',
  food: '美食',
  route: '路线',
};

export default function NoteEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, placeId, placeName } = useLocalSearchParams<{
    id?: string;
    placeId?: string;
    placeName?: string;
  }>();

  const [noteTitle, setNoteTitle] = useState('');
  const [sections, setSections] = useState<NoteSection[]>([]);
  const [associatedPlaceId, setAssociatedPlaceId] = useState<string | undefined>(
    placeId || undefined
  );
  const [associatedPlaceName, setAssociatedPlaceName] = useState<string | undefined>(
    placeName || undefined
  );
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#333333' }, 'background');

  // 检查是否允许访问（必须有 id 才能编辑）
  useEffect(() => {
    if (!id) {
      Alert.alert('提示', '请从笔记列表中选择要编辑的笔记', [
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ]);
      return;
    }
  }, [id, router]);

  // 加载笔记数据（如果是编辑模式）
  useEffect(() => {
    const loadNote = async () => {
      if (id) {
        try {
          const note = await getNoteByIdV2(id);
          if (note) {
            setNoteTitle(note.title || '');
            setSections(note.sections || []);
            setAssociatedPlaceId(note.placeId);
            setIsEditing(true);

            // 如果有关联地点，加载地点名称
            if (note.placeId) {
              try {
                const place = await getPlaceById(note.placeId);
                if (place) {
                  setAssociatedPlaceName(place.name);
                }
              } catch (error) {
                console.error('加载地点信息失败:', error);
              }
            }
          }
        } catch (error) {
          console.error('加载笔记失败:', error);
          Alert.alert('错误', '加载笔记失败，请稍后重试');
        }
      } else if (placeId && !placeName) {
        // 如果只有 placeId 没有 placeName，尝试加载地点名称
        try {
          const place = await getPlaceById(placeId);
          if (place) {
            setAssociatedPlaceName(place.name);
          }
        } catch (error) {
          console.error('加载地点信息失败:', error);
        }
      } else if (placeId) {
        // 从地点详情页进入，建议添加景点分区
        setShowCategorySelector(true);
      }
    };

    loadNote();
  }, [id, placeId, placeName]);

  // 添加分区
  const handleAddSection = (category: SectionCategory) => {
    const newSection: NoteSection = {
      category,
      title: '',
      text: '',
      images: [],
    };
    setSections((prev) => [...(prev || []), newSection]);
    setShowCategorySelector(false);
  };

  // 删除分区
  const handleRemoveSection = (index: number) => {
    if (!sections || sections.length <= 1) {
      Alert.alert('提示', '笔记至少需要包含一个分区');
      return;
    }
    Alert.alert('确认删除', '确定要删除这个分区吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          setSections((prev) => (prev || []).filter((_, i) => i !== index));
        },
      },
    ]);
  };

  // 更新分区
  const handleUpdateSection = (index: number, updates: Partial<NoteSection>) => {
    setSections((prev) => {
      const current = prev || [];
      const updated = [...current];
      if (updated[index]) {
        updated[index] = { ...updated[index], ...updates };
      }
      return updated;
    });
  };

  // 选择图片
  const handlePickImages = async (sectionIndex: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相册权限才能上传图片');
        return;
      }

      const mediaTypesCompat =
        (ImagePicker as any).MediaType?.Images != null
          ? [(ImagePicker as any).MediaType.Images]
          : ImagePicker.MediaTypeOptions.Images;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesCompat,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets) return;

      const currentSections = sections || [];
      if (!currentSections[sectionIndex]) return;

      const currentImages = currentSections[sectionIndex].images || [];
      const newImages = result.assets
        .map((asset) => asset.uri)
        .filter((uri) => uri);

      // 限制最多5张图片
      const totalImages = currentImages.length + newImages.length;
      if (totalImages > 5) {
        Alert.alert('提示', '每个分区最多只能上传5张图片');
        const remaining = 5 - currentImages.length;
        if (remaining > 0) {
          handleUpdateSection(sectionIndex, {
            images: [...currentImages, ...newImages.slice(0, remaining)],
          });
        }
      } else {
        handleUpdateSection(sectionIndex, {
          images: [...currentImages, ...newImages],
        });
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败，请稍后重试');
    }
  };

  // 删除图片
  const handleRemoveImage = (sectionIndex: number, imageIndex: number) => {
    const currentSections = sections || [];
    const section = currentSections[sectionIndex];
    if (!section) return;
    const updatedImages = (section.images || []).filter((_, i) => i !== imageIndex);
    handleUpdateSection(sectionIndex, { images: updatedImages });
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    if (!id || !isEditing) {
      Alert.alert('提示', '只能编辑已有笔记');
      return;
    }

    if (!noteTitle.trim()) {
      Alert.alert('提示', '请输入笔记标题');
      return;
    }

    if (!sections || sections.length === 0) {
      Alert.alert('提示', '请至少添加一个分区');
      return;
    }

    // 验证每个分区都有标题
    const hasEmptyTitle = sections.some((section) => !section || !section.title.trim());
    if (hasEmptyTitle) {
      Alert.alert('提示', '请为每个分区填写标题');
      return;
    }

    try {
      setSaving(true);

      const noteData = {
        title: noteTitle.trim(),
        placeId: associatedPlaceId,
        status: 'draft' as const,
        sections,
      };

      await updateDraft(id, noteData);
      Alert.alert('成功', '草稿已保存', [
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('保存草稿失败:', error);
      Alert.alert('错误', '保存草稿失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  // 发布笔记
  const handlePublish = async () => {
    if (!id || !isEditing) {
      Alert.alert('提示', '只能编辑已有笔记');
      return;
    }

    if (!noteTitle.trim()) {
      Alert.alert('提示', '请输入笔记标题');
      return;
    }

    if (!sections || sections.length === 0) {
      Alert.alert('提示', '请至少添加一个分区');
      return;
    }

    // 验证每个分区都有标题和正文
    const hasEmptyTitle = sections.some((section) => !section || !section.title.trim());
    const hasEmptyText = sections.some((section) => !section || !section.text.trim());

    if (hasEmptyTitle) {
      Alert.alert('提示', '请为每个分区填写标题');
      return;
    }

    if (hasEmptyText) {
      Alert.alert('提示', '请为每个分区填写正文内容');
      return;
    }

    Alert.alert('确认发布', '发布后笔记将在社区中展示，确定要发布吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '发布',
        onPress: async () => {
          try {
            setPublishing(true);

            const noteData = {
              id: id,
              title: noteTitle.trim(),
              placeId: associatedPlaceId,
              status: 'published' as const,
              sections,
            };

            await publishNote(noteData);
            Alert.alert('成功', '笔记已发布', [
              {
                text: '确定',
                onPress: () => router.back(),
              },
            ]);
          } catch (error) {
            console.error('发布笔记失败:', error);
            Alert.alert('错误', '发布笔记失败，请稍后重试');
          } finally {
            setPublishing(false);
          }
        },
      },
    ]);
  };

  const handleRemovePlace = () => {
    setAssociatedPlaceId(undefined);
    setAssociatedPlaceName(undefined);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={[]}>
      {/* 顶部绿色安全区域 */}
      <View style={[styles.topSafeArea, { height: insets.top }]} />
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          编辑笔记
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 100 + (insets.bottom || 0) },
          ]}>
          {/* 笔记标题输入 */}
          <TextInput
            style={[styles.noteTitleInput, { color: textColor, borderColor }]}
            placeholder="笔记标题"
            placeholderTextColor="#999"
            value={noteTitle}
            onChangeText={setNoteTitle}
            maxLength={100}
          />

          {/* 关联地点显示 */}
          {associatedPlaceId && associatedPlaceName && (
            <View style={[styles.placeTag, { borderColor }]}>
              <MaterialIcons name="place" size={16} color="#007A8C" />
              <Text style={styles.placeTagText}>{associatedPlaceName}</Text>
              <TouchableOpacity
                onPress={handleRemovePlace}
                style={styles.removePlaceButton}
                activeOpacity={0.7}>
                <MaterialIcons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* 分区列表 */}
          {sections && sections.length > 0 && sections.map((section, index) => (
            <View key={index} style={[styles.sectionCard, { borderColor }]}>
              {/* 分区头部 */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View
                    style={[
                      styles.categoryBadge,
                      {
                        backgroundColor:
                          section.category === 'sight'
                            ? '#E0F2F1'
                            : section.category === 'food'
                            ? '#FFF4E6'
                            : '#E8F4FD',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        {
                          color:
                            section.category === 'sight'
                              ? '#007A8C'
                              : section.category === 'food'
                              ? '#D97706'
                              : '#0369A1',
                        },
                      ]}>
                      {CATEGORY_LABELS[section.category]}
                    </Text>
                  </View>
                  {sections.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveSection(index)}
                      style={styles.removeSectionButton}
                      activeOpacity={0.7}>
                      <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 标题输入 */}
              <TextInput
                style={[styles.sectionTitleInput, { color: textColor, borderColor }]}
                placeholder={`${CATEGORY_LABELS[section.category]}标题`}
                placeholderTextColor="#999"
                value={section.title}
                onChangeText={(text) => handleUpdateSection(index, { title: text })}
                maxLength={100}
              />

              {/* 正文输入 */}
              <TextInput
                style={[styles.sectionTextInput, { color: textColor, borderColor }]}
                placeholder={`描述这个${CATEGORY_LABELS[section.category]}...`}
                placeholderTextColor="#999"
                value={section.text}
                onChangeText={(text) => handleUpdateSection(index, { text })}
                multiline
                textAlignVertical="top"
                maxLength={5000}
              />

              {/* 图片区域 */}
              <View style={styles.imagesContainer}>
                {section.images.map((imageUri, imageIndex) => (
                  <View key={imageIndex} style={styles.imageWrapper}>
                    <ExpoImage source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index, imageIndex)}
                      activeOpacity={0.7}>
                      <MaterialIcons name="close" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {section.images.length < 5 && (
                  <TouchableOpacity
                    style={[styles.addImageButton, { borderColor }]}
                    onPress={() => handlePickImages(index)}
                    activeOpacity={0.7}>
                    <MaterialIcons name="add-photo-alternate" size={24} color="#007A8C" />
                    <Text style={styles.addImageText}>添加图片</Text>
                    <Text style={styles.addImageHint}>({section.images.length}/5)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* 添加分区按钮 */}
          {!showCategorySelector && (
            <TouchableOpacity
              style={[styles.addSectionButton, { borderColor }]}
              onPress={() => setShowCategorySelector(true)}
              activeOpacity={0.7}>
              <MaterialIcons name="add-circle-outline" size={24} color="#007A8C" />
              <Text style={styles.addSectionText}>添加分区</Text>
            </TouchableOpacity>
          )}

          {/* 分区类型选择器 */}
          {showCategorySelector && (
            <View style={[styles.categorySelector, { borderColor }]}>
              <View style={styles.categorySelectorHeader}>
                <ThemedText type="defaultSemiBold">选择分区类型</ThemedText>
                <TouchableOpacity
                  onPress={() => setShowCategorySelector(false)}
                  activeOpacity={0.7}>
                  <MaterialIcons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>
              <View style={styles.categoryOptions}>
                {(['sight', 'food', 'route'] as SectionCategory[]).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.categoryOption, { borderColor }]}
                    onPress={() => handleAddSection(category)}
                    activeOpacity={0.7}>
                    <Text style={styles.categoryOptionText}>{CATEGORY_LABELS[category]}</Text>
                    <MaterialIcons name="chevron-right" size={20} color="#007A8C" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 格式化提示 */}
          <View style={styles.formatHint}>
            <MaterialIcons name="info-outline" size={16} color="#666" />
            <Text style={styles.formatHintText}>
              支持 Markdown 格式：**粗体**、*斜体*、- 列表等
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 底部操作栏 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 0 }]}>
        <TouchableOpacity
          style={[styles.draftButton, { borderColor }]}
          onPress={handleSaveDraft}
          disabled={saving || publishing}
          activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator size="small" color="#007A8C" />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#007A8C" />
              <Text style={styles.draftButtonText}>保存草稿</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.publishButton}
          onPress={handlePublish}
          disabled={saving || publishing}
          activeOpacity={0.8}>
          {publishing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="publish" size={20} color="#FFFFFF" />
              <Text style={styles.publishButtonText}>发布</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSafeArea: {
    width: '100%',
    backgroundColor: '#007A8C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007A8C',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  noteTitleInput: {
    fontSize: 22,
    fontWeight: '700',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    minHeight: 60,
  },
  placeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#E0F2F1',
  },
  placeTagText: {
    flex: 1,
    fontSize: 14,
    color: '#007A8C',
    fontWeight: '500',
  },
  removePlaceButton: {
    padding: 4,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeSectionButton: {
    padding: 4,
  },
  sectionTitleInput: {
    fontSize: 18,
    fontWeight: '600',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
    minHeight: 48,
  },
  sectionTextInput: {
    fontSize: 16,
    lineHeight: 24,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
    minHeight: 120,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
  },
  addImageText: {
    fontSize: 12,
    color: '#007A8C',
    fontWeight: '500',
  },
  addImageHint: {
    fontSize: 10,
    color: '#999',
  },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
  },
  addSectionText: {
    fontSize: 16,
    color: '#007A8C',
    fontWeight: '500',
  },
  categorySelector: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  categorySelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryOptions: {
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  formatHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  formatHintText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  draftButtonText: {
    fontSize: 16,
    color: '#007A8C',
    fontWeight: '600',
  },
  publishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#007A8C',
  },
  publishButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
