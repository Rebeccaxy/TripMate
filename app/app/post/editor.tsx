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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getPostById,
  savePostDraft,
  updatePostDraft,
  publishPost,
  updatePost,
  type Post,
} from '@/services/noteService';
import { getPlaceById } from '@/services/communityService';

type PostCategory = 'sight' | 'food' | 'route';

const CATEGORY_LABELS: Record<PostCategory, string> = {
  sight: '景点',
  food: '美食',
  route: '路线',
};

export default function PostEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, placeId, placeName, category } = useLocalSearchParams<{
    id?: string;
    placeId?: string;
    placeName?: string;
    category?: string;
  }>();

  const [postTitle, setPostTitle] = useState('');
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState<PostCategory>(
    (category as PostCategory) || 'sight'
  );
  const [images, setImages] = useState<string[]>([]);
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

  // 加载帖子数据（如果是编辑模式）
  useEffect(() => {
    const loadPost = async () => {
      if (id) {
        try {
          const post = await getPostById(id);
          if (post) {
            setPostTitle(post.title || '');
            setPostText(post.text || '');
            setPostCategory(post.category);
            setImages(post.images || []);
            setAssociatedPlaceId(post.placeId);
            setIsEditing(true);

            // 如果有关联地点，加载地点名称
            if (post.placeId) {
              try {
                const place = await getPlaceById(post.placeId);
                if (place) {
                  setAssociatedPlaceName(place.name);
                }
              } catch (error) {
                console.error('加载地点信息失败:', error);
              }
            }
          }
        } catch (error) {
          console.error('加载帖子失败:', error);
          Alert.alert('错误', '加载帖子失败，请稍后重试');
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
      } else if (placeId && !category) {
        // 从地点详情页进入，显示类别选择器
        setShowCategorySelector(true);
      }
    };

    loadPost();
  }, [id, placeId, placeName, category]);

  // 选择图片
  const handlePickImages = async () => {
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

      const newImages = result.assets.map((asset) => asset.uri).filter((uri) => uri);

      // 限制最多5张图片
      const totalImages = images.length + newImages.length;
      if (totalImages > 5) {
        Alert.alert('提示', '最多只能上传5张图片');
        const remaining = 5 - images.length;
        if (remaining > 0) {
          setImages([...images, ...newImages.slice(0, remaining)]);
        }
      } else {
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败，请稍后重试');
    }
  };

  // 删除图片
  const handleRemoveImage = (imageIndex: number) => {
    setImages(images.filter((_, i) => i !== imageIndex));
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    if (!postTitle.trim()) {
      Alert.alert('提示', '请输入帖子标题');
      return;
    }

    try {
      setSaving(true);

      const postData = {
        title: postTitle.trim(),
        text: postText.trim(),
        category: postCategory,
        placeId: associatedPlaceId,
        images,
      };

      if (isEditing && id) {
        await updatePostDraft(id, postData);
        Alert.alert('成功', '草稿已保存', [
          {
            text: '确定',
            onPress: () => router.back(),
          },
        ]);
      } else {
        await savePostDraft(postData);
        Alert.alert('成功', '草稿已保存', [
          {
            text: '确定',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error) {
      console.error('保存草稿失败:', error);
      Alert.alert('错误', '保存草稿失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  // 发布帖子
  const handlePublish = async () => {
    if (!postTitle.trim()) {
      Alert.alert('提示', '请输入帖子标题');
      return;
    }

    if (!postText.trim()) {
      Alert.alert('提示', '请输入帖子内容');
      return;
    }

    Alert.alert('确认发布', '发布后帖子将在社区中展示，确定要发布吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '发布',
        onPress: async () => {
          try {
            setPublishing(true);

            const postData = {
              id: id,
              title: postTitle.trim(),
              text: postText.trim(),
              category: postCategory,
              placeId: associatedPlaceId,
              images,
            };

            if (isEditing && id) {
              // 如果是编辑已发布的帖子，使用 updatePost
              await updatePost(id, postData);
            } else {
              // 如果是新帖子或草稿，使用 publishPost
              await publishPost(postData);
            }

            Alert.alert('成功', '帖子已发布', [
              {
                text: '确定',
                onPress: () => router.back(),
              },
            ]);
          } catch (error) {
            console.error('发布帖子失败:', error);
            Alert.alert('错误', '发布帖子失败，请稍后重试');
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
          {isEditing ? '编辑帖子' : '写帖子'}
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
          {/* 类别选择 */}
          {showCategorySelector ? (
            <View style={[styles.categorySelector, { borderColor }]}>
              <View style={styles.categorySelectorHeader}>
                <ThemedText type="defaultSemiBold">选择帖子类型</ThemedText>
                <TouchableOpacity
                  onPress={() => setShowCategorySelector(false)}
                  activeOpacity={0.7}>
                  <MaterialIcons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>
              <View style={styles.categoryOptions}>
                {(['sight', 'food', 'route'] as PostCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryOption, { borderColor }]}
                    onPress={() => {
                      setPostCategory(cat);
                      setShowCategorySelector(false);
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.categoryOptionText}>{CATEGORY_LABELS[cat]}</Text>
                    <MaterialIcons name="chevron-right" size={20} color="#007A8C" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.categoryButton, { borderColor }]}
              onPress={() => setShowCategorySelector(true)}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor:
                      postCategory === 'sight'
                        ? '#E0F2F1'
                        : postCategory === 'food'
                        ? '#FFF4E6'
                        : '#E8F4FD',
                  },
                ]}>
                <Text
                  style={[
                    styles.categoryBadgeText,
                    {
                      color:
                        postCategory === 'sight'
                          ? '#007A8C'
                          : postCategory === 'food'
                          ? '#D97706'
                          : '#0369A1',
                    },
                  ]}>
                  {CATEGORY_LABELS[postCategory]}
                </Text>
              </View>
              <MaterialIcons name="arrow-drop-down" size={24} color={textColor} />
            </TouchableOpacity>
          )}

          {/* 帖子标题输入 */}
          <TextInput
            style={[styles.postTitleInput, { color: textColor, borderColor }]}
            placeholder="帖子标题"
            placeholderTextColor="#999"
            value={postTitle}
            onChangeText={setPostTitle}
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

          {/* 正文输入 */}
          <TextInput
            style={[styles.postTextInput, { color: textColor, borderColor }]}
            placeholder={`描述这个${CATEGORY_LABELS[postCategory]}...`}
            placeholderTextColor="#999"
            value={postText}
            onChangeText={setPostText}
            multiline
            textAlignVertical="top"
            maxLength={5000}
          />

          {/* 图片区域 */}
          <View style={styles.imagesContainer}>
            {images.map((imageUri, imageIndex) => (
              <View key={imageIndex} style={styles.imageWrapper}>
                <ExpoImage source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(imageIndex)}
                  activeOpacity={0.7}>
                  <MaterialIcons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                style={[styles.addImageButton, { borderColor }]}
                onPress={handlePickImages}
                activeOpacity={0.7}>
                <MaterialIcons name="add-photo-alternate" size={24} color="#007A8C" />
                <Text style={styles.addImageText}>添加图片</Text>
                <Text style={styles.addImageHint}>({images.length}/5)</Text>
              </TouchableOpacity>
            )}
          </View>

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
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
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
  postTitleInput: {
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
  postTextInput: {
    fontSize: 16,
    lineHeight: 24,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    minHeight: 200,
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
