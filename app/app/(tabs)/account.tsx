import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Pressable,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getCurrentUser, type User } from '@/services/authService';
import {
  getLikedPlaces,
  getFavoritedPlaces,
} from '@/services/userEngagementService';
import { type Place } from '@/services/communityService';
import {
  getDrafts,
  getPublishedNotes,
  deleteNoteV2,
  type Note as NoteV2,
} from '@/services/noteService';

// 旅行笔记类型（预留给后端）
type NoteStatus = 'published' | 'draft';

interface Note {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  updatedAt: string;
  status: NoteStatus;
  stats?: {
    likes?: number;
    saves?: number;
    views?: number;
  };
  tags?: string[];
}

type NoteSectionKey = 'myNotes' | 'liked' | 'favorited' | 'drafts';

const TRAVEL_DNA_KEY = '@tripMate:travelDNA';
const TRAVEL_DNA_V2_KEY = '@tripMate:travelDNA:v2';
const DISPLAY_NAME_KEY = '@tripMate:displayName';
const AVATAR_URI_KEY = '@tripMate:avatarUri';

type BudgetRange = 'Economy' | 'Moderate' | 'Luxury' | '';
type Pace = 'Relaxed' | 'Moderate' | 'Intensive' | '';
type TripDuration = 'Short (2-3 days)' | 'Medium (4-7 days)' | 'Long (8+ days)' | '';

type TravelDNA = {
  travelTypes: string[];
  companions: string[];
  budget: BudgetRange;
  pace: Pace;
  lodging: string[];
  transport: string[];
  diet: string[];
  specialNeeds: string[];
  environment: string[];
  duration: TripDuration;
  wishlist: string;
};

const DEFAULT_DNA: TravelDNA = {
  travelTypes: [],
  companions: [],
  budget: '',
  pace: '',
  lodging: [],
  transport: [],
  diet: [],
  specialNeeds: [],
  environment: [],
  duration: '',
  wishlist: '',
};

function buildSummaryLines(dna: TravelDNA) {
  const lines: string[] = [];
  if (dna.travelTypes.length) lines.push(`Travel Types: ${dna.travelTypes.join(' / ')}`);
  if (dna.companions.length) lines.push(`Companions: ${dna.companions.join(' / ')}`);
  if (dna.budget) lines.push(`Budget Range: ${dna.budget}`);
  if (dna.pace) lines.push(`Travel Pace: ${dna.pace}`);
  if (dna.lodging.length) lines.push(`Lodging Preference: ${dna.lodging.join(' / ')}`);
  if (dna.transport.length) lines.push(`Transport Preference: ${dna.transport.join(' / ')}`);
  if (dna.diet.length) lines.push(`Diet Preference: ${dna.diet.join(' / ')}`);
  if (dna.specialNeeds.length) lines.push(`Special Needs: ${dna.specialNeeds.join(' / ')}`);
  if (dna.environment.length) lines.push(`Environment Preference: ${dna.environment.join(' / ')}`);
  if (dna.duration) lines.push(`Trip Duration: ${dna.duration}`);
  // Interest points (from wishlist field in settings)
  if (dna.wishlist.trim()) {
    const interests = dna.wishlist.trim().split(/\n|；|;|，|,/).filter(Boolean);
    if (interests.length > 0) {
      lines.push(`Interest Points: ${interests.join(' / ')}`);
    }
  }
  return lines;
}

// Travel DNA 摘要（用于 Account 页压缩展示）
function summarizeDNA(dna: TravelDNA): { summary: string; interestSummary: string } {
  const typePart = dna.travelTypes.join('/');
  const budgetPart = dna.budget;
  const pacePart = dna.pace;
  const envPart = dna.environment.join('/');
  const summaryParts = [typePart, budgetPart, pacePart, envPart].filter(Boolean);
  const summary = summaryParts.join('·');

  // Interest points summary (from wishlist field in settings)
  let interestSummary = '';
  if (dna.wishlist && dna.wishlist.trim()) {
    const interests = dna.wishlist.trim().split(/\n|；|;|，|,/).filter(Boolean);
    if (interests.length > 0) {
      const firstInterest = interests[0];
      interestSummary = firstInterest.length > 10 ? firstInterest.slice(0, 10) + '…' : firstInterest;
    }
  }

  return { summary, interestSummary };
}

export default function AccountScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [travelDNA, setTravelDNA] = useState<TravelDNA>(DEFAULT_DNA);
  const [travelDNALegacy, setTravelDNALegacy] = useState<string>('');
  const [activeSection, setActiveSection] = useState<NoteSectionKey>('myNotes');
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [likedPlaces, setLikedPlaces] = useState<Place[]>([]);
  const [favoritedPlaces, setFavoritedPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const swipeableRefs = useRef<Record<string, any>>({});

  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  // 计算笔记空间卡片高度：屏幕高度的百分比（可调整 0.5 = 50%, 0.6 = 60%, 0.7 = 70% 等）
  const NOTE_SPACE_HEIGHT_PERCENT = 0.52; // 60%
  const noteSpaceHeight = screenHeight * NOTE_SPACE_HEIGHT_PERCENT;

  // 使用真实的笔记数据
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [draftNotes, setDraftNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // 将新版本的 Note 转换为旧版本的 Note 格式（用于兼容现有 UI）
  const convertNoteV2ToNote = (noteV2: NoteV2): Note => {
    // 使用笔记标题，如果没有则使用第一个分区的标题作为后备
    const firstSection = noteV2.sections[0];
    const title = noteV2.title || firstSection?.title || 'Untitled Note';
    const excerpt = firstSection?.text.substring(0, 50) || '';
    const tags = noteV2.sections.map((s) => {
      const categoryLabels: Record<string, string> = {
        sight: 'Sightseeing',
        food: 'Food',
        route: 'Route',
      };
      return categoryLabels[s.category] || s.category;
    });

    return {
      id: noteV2.id,
      title,
      excerpt: excerpt.length > 50 ? excerpt + '...' : excerpt,
      createdAt: noteV2.createdAt,
      updatedAt: noteV2.updatedAt,
      status: noteV2.status,
      stats:
        noteV2.status === 'published'
          ? {
              likes: noteV2.likeCount || 0,
              saves: noteV2.favoriteCount || 0,
              views: noteV2.commentCount || 0,
            }
          : undefined,
      tags,
    };
  };

  // 加载笔记数据
  const loadNotes = useCallback(async () => {
    try {
      setLoadingNotes(true);
      const [published, drafts] = await Promise.all([
        getPublishedNotes(),
        getDrafts(),
      ]);

      setMyNotes(published.map(convertNoteV2ToNote));
      setDraftNotes(drafts.map(convertNoteV2ToNote));
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  // 页面获得焦点时刷新笔记列表
  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  // 加载点赞和收藏的地点
  const loadEngagementPlaces = useCallback(async () => {
    try {
      setLoadingPlaces(true);
      console.log('[Note Space] Starting to load liked and favorited places...');
      const [liked, favorited] = await Promise.all([
        getLikedPlaces(),
        getFavoritedPlaces(),
      ]);
      console.log('[笔记空间] 加载完成:', {
        likedCount: liked.length,
        favoritedCount: favorited.length,
        likedPlaces: liked.map(p => ({ id: p.id, name: p.name })),
        favoritedPlaces: favorited.map(p => ({ id: p.id, name: p.name })),
      });
      setLikedPlaces(liked);
      setFavoritedPlaces(favorited);
    } catch (error) {
      console.error('[Note Space] Failed to load liked/favorited places:', error);
    } finally {
      setLoadingPlaces(false);
    }
  }, []);

  // 页面获得焦点时加载点赞和收藏的地点
  useFocusEffect(
    useCallback(() => {
      loadEngagementPlaces();
    }, [loadEngagementPlaces])
  );


  useEffect(() => {
    const loadUser = async () => {
      try {
        const current = await getCurrentUser();
        setUser(current);
        // 如果后端已在 /auth/me 中返回 IP，则这里直接复用
        setIpAddress(current?.ip ?? null);
        const storedName = await AsyncStorage.getItem(DISPLAY_NAME_KEY);
        setDisplayName(storedName || current?.name || '');
      } catch (e) {
        console.error('Failed to load user info', e);
      } finally {
        setIsLoadingUser(false);
      }
    };

    const loadAvatar = async () => {
      try {
        const uri = await AsyncStorage.getItem(AVATAR_URI_KEY);
        setAvatarUri(uri);
      } catch (e) {
        console.error('Failed to load avatar', e);
      }
    };

    const loadTravelDNA = async () => {
      try {
        const [v2, legacy] = await Promise.all([
          AsyncStorage.getItem(TRAVEL_DNA_V2_KEY),
          AsyncStorage.getItem(TRAVEL_DNA_KEY),
        ]);

        if (v2) {
          try {
            const parsed = JSON.parse(v2);
            setTravelDNA({ ...DEFAULT_DNA, ...(parsed || {}) });
            setTravelDNALegacy('');
            return;
          } catch {
            // fallthrough to legacy
          }
        }

        // Compatible with legacy text (or when parsing fails)
        setTravelDNA(DEFAULT_DNA);
        setTravelDNALegacy(
          legacy ||
            'Preferences: City walks / Exploring hidden neighborhoods\nPace: Moderate to slow, prefer staying longer in one place\nInterests: Cafes, art galleries, local markets\nIdeal companions: Small group of 2-3 people with high flexibility'
        );
      } catch (e) {
        console.error('Failed to load Travel DNA', e);
      }
    };

    const loadLocationLabel = async () => {
      try {
        // Request foreground location permission to display current location in profile
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationLabel(null);
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const reversed = await Location.reverseGeocodeAsync({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });

        const first = reversed?.[0];
        const city =
          first?.city || first?.subregion || (first as any)?.district || undefined;
        const region = first?.region;
        const country = first?.country;
        const parts = [city, region, country].filter(Boolean);

        setLocationLabel(parts.length > 0 ? parts.join(', ') : null);
      } catch (e) {
        console.error('Failed to get current location', e);
        setLocationLabel(null);
      }
    };

    loadUser();
    loadAvatar();
    loadTravelDNA();
    loadLocationLabel();
  }, []);

  // 返回 Account 或切换 Tab 时刷新本地覆盖数据（昵称 / 头像 / Travel DNA）
  useFocusEffect(
    useCallback(() => {
      const syncFromStorage = async () => {
        try {
          const [name, avatar, v2, legacy] = await Promise.all([
            AsyncStorage.getItem(DISPLAY_NAME_KEY),
            AsyncStorage.getItem(AVATAR_URI_KEY),
            AsyncStorage.getItem(TRAVEL_DNA_V2_KEY),
            AsyncStorage.getItem(TRAVEL_DNA_KEY),
          ]);
          if (name !== null) setDisplayName(name);
          if (avatar !== null) setAvatarUri(avatar);
          if (v2) {
            try {
              const parsed = JSON.parse(v2);
              setTravelDNA({ ...DEFAULT_DNA, ...(parsed || {}) });
              setTravelDNALegacy('');
            } catch {
              setTravelDNA(DEFAULT_DNA);
              setTravelDNALegacy(legacy || '');
            }
          } else {
            setTravelDNA(DEFAULT_DNA);
            setTravelDNALegacy(legacy || '');
          }
        } catch (e) {
          console.error('Failed to refresh account info', e);
        }
      };

      syncFromStorage();
    }, [])
  );

  const currentNotes = useMemo(() => {
    let notes: Note[] = [];
    switch (activeSection) {
      case 'liked':
        notes = likedPlaces.length > 0 ? likedPlaces.map(place => ({
          id: place.id,
          title: place.name,
          excerpt: place.shortDesc,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'published' as NoteStatus,
          stats: {
            likes: place.stats.likeCount,
            saves: place.stats.favoriteCount,
            views: place.stats.commentCount,
          },
          tags: place.tags,
        })) : [];
        console.log(`[Note Space] Current tab: Liked, likedPlaces count: ${likedPlaces.length}, converted notes count: ${notes.length}`);
        return notes;
      case 'favorited':
        notes = favoritedPlaces.length > 0 ? favoritedPlaces.map(place => ({
          id: place.id,
          title: place.name,
          excerpt: place.shortDesc,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'published' as NoteStatus,
          stats: {
            likes: place.stats.likeCount,
            saves: place.stats.favoriteCount,
            views: place.stats.commentCount,
          },
          tags: place.tags,
        })) : [];
        console.log(`[Note Space] Current tab: Favorited, favoritedPlaces count: ${favoritedPlaces.length}, converted notes count: ${notes.length}`);
        return notes;
      case 'drafts':
        return draftNotes;
      case 'myNotes':
      default:
        return myNotes;
    }
  }, [activeSection, myNotes, likedPlaces, favoritedPlaces, draftNotes]);

  const handleDeleteNote = async (note: Note) => {
    // Close swipe state
    if (swipeableRefs.current[note.id]) {
      swipeableRefs.current[note.id].close();
    }

    const noteType = note.status === 'draft' ? 'Draft' : 'Note';
    Alert.alert(
      `Delete ${noteType}`,
      `Are you sure you want to delete "${note.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNoteV2(note.id);
              // Clean up ref after deletion
              delete swipeableRefs.current[note.id];
              loadNotes(); // Refresh notes list
            } catch (error) {
              console.error('Failed to delete note:', error);
              Alert.alert('Error', 'Failed to delete note, please try again later');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    note: Note
  ) => {
    const isPlace = activeSection === 'liked' || activeSection === 'favorited';
    // Places don't need delete button
    if (isPlace) {
      return null;
    }

    return (
      <View style={styles.rightAction}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDeleteNote(note)}>
          <MaterialIcons name="delete" size={24} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    );
  };

  const renderNoteItem = (note: Note, index: number) => {
    const isDraft = note.status === 'draft';
    const isPlace = activeSection === 'liked' || activeSection === 'favorited';

    const noteContent = (
      <Pressable
        style={[styles.noteCard, isDraft && styles.noteCardDraft]}
        onPress={() => {
          if (isPlace) {
            router.push(`/place/${note.id}` as any);
          } else if (isDraft) {
            // Click draft to enter editor
            router.push(`/note/editor?id=${note.id}`);
          } else {
            // Click published note to enter editor (can view and edit)
            router.push(`/note/editor?id=${note.id}`);
          }
        }}
        onLongPress={() => {
          // Long press to delete (only for notes and drafts, not places)
          if (!isPlace) {
            handleDeleteNote(note);
          }
        }}>
        <View style={styles.noteHeaderRow}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {note.title}
          </Text>
          {isDraft && <Text style={styles.noteDraftBadge}>Draft</Text>}
        </View>
        <Text style={styles.noteExcerpt} numberOfLines={2}>
          {note.excerpt}
        </Text>
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagRow}>
            {note.tags.map((tag) => (
              <View key={tag} style={[styles.tagChip, isDraft && styles.tagChipDraft]}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.noteMetaRow}>
          <Text style={styles.noteMetaText}>
            {isPlace ? '' : new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
          </Text>
          <View style={styles.noteStatsRow}>
            {note.stats?.views != null && (
              <Text style={styles.noteMetaText}>👁 {note.stats.views}</Text>
            )}
            {note.stats?.likes != null && (
              <Text style={styles.noteMetaText}>♥ {note.stats.likes}</Text>
            )}
            {note.stats?.saves != null && (
              <Text style={styles.noteMetaText}>★ {note.stats.saves}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );

    // If it's a place, return content directly (no swipe to delete)
    if (isPlace) {
      return (
        <View key={`${activeSection}-${note.id}-${index}`}>
          {noteContent}
        </View>
      );
    }

    // Notes and drafts use swipe to delete
    return (
      <Swipeable
        key={`${activeSection}-${note.id}-${index}`}
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current[note.id] = ref;
          } else {
            delete swipeableRefs.current[note.id];
          }
        }}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, note)}
        rightThreshold={40}
        overshootRight={false}
        friction={2}>
        {noteContent}
      </Swipeable>
    );
  };

  const initials = useMemo(() => {
    const base = displayName || user?.name;
    if (!base) return 'TM';
    const parts = base.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }, [displayName, user]);

  const dnaSummary = useMemo(() => summarizeDNA(travelDNA), [travelDNA]);

  return (
    <ThemedView style={styles.container}>
      <ImageBackground
        source={require('@/assets/images/Account/Account.png')}
        style={styles.backgroundImage}
        resizeMode="cover">
        <View
          style={[
            styles.contentContainer,
            { paddingTop: insets.top + 16 },
          ]}>
          {/* 顶部：头像 + 基本信息 + 设置按钮（同一行水平居中对齐） */}
          <View style={styles.headerCard}>
            <View style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.userName}>
                {displayName || user?.name || 'Guest User'}
              </Text>
              {!!user?.id && <Text style={styles.userId}>ID: {user.id}</Text>}
              <Text style={styles.userEmail}>
                {user?.email ?? 'Please login to sync data'}
              </Text>

              <View style={styles.ipRow}>
                <Text style={styles.ipLabel}>IP Address：</Text>
                {ipAddress ? (
                  <Text style={styles.ipValue}>
                    {ipAddress}
                    {locationLabel ? ` · ${locationLabel}` : ''}
                  </Text>
                ) : (
                  <Text style={styles.ipValueDim}>
                    {locationLabel ? locationLabel : 'Loading or unavailable'}
                  </Text>
                )}
              </View>

              {isLoadingUser && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.loadingText}>Loading account info...</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.settingsButton}
              onPress={() => router.push('/account/settings')}>
              <Image
                source={require('@/assets/icons/Account/Setting_fill.png')}
                style={styles.settingsIconImage}
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Travel DNA：仅展示（修改请到 Setting），透明底；整卡可点击 */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/account/travel-dna')}
            style={[styles.card, styles.cardTransparent, styles.dnaCardTouchable]}>
            <View style={styles.cardHeaderRow}>
              <ThemedText
                type="subtitle"
                style={[styles.cardHeaderTitleWhite, styles.cardHeaderTitleTight]}>
                Travel DNA
              </ThemedText>
              <TouchableOpacity
                onPress={() => router.push('/account/travel-dna')}
                style={styles.moreChip}
                activeOpacity={0.8}>
                <Text style={styles.moreChipText}>View More</Text>
                <Text style={styles.moreChipArrow}>›</Text>
              </TouchableOpacity>
            </View>
            {dnaSummary.summary || dnaSummary.interestSummary ? (
              <View style={styles.dnaSummaryCompact}>
                {dnaSummary.summary ? (
                  <Text
                    style={styles.dnaSummaryText}
                    numberOfLines={2}
                    ellipsizeMode="tail">
                    {dnaSummary.summary}
                  </Text>
                ) : null}
                    {dnaSummary.interestSummary ? (
                  <Text
                    style={styles.dnaWishText}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    Interest Points: {dnaSummary.interestSummary}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.dnaReadonlyText}>
                {travelDNALegacy || 'Travel DNA not set yet (Go to settings to complete your travel preferences)'}
              </Text>
            )}
          </TouchableOpacity>

          {/* 笔记分类切换 */}
          <ThemedView style={[styles.card, styles.noteSpaceCard, { height: noteSpaceHeight }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <ThemedText type="subtitle" style={styles.cardHeaderTitleBlack}>
                  My Note Space
                </ThemedText>
                <Text style={styles.cardHeaderSubGray}>View all your travel content in one place</Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.createPostButton}
                  onPress={() => router.push('/post/editor')}
                  activeOpacity={0.8}>
                  <MaterialIcons name="article" size={18} color="#007A8C" />
                  <Text style={styles.createPostButtonText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.tabRow}>
              <SectionTab
                label="My Uploads"
                active={activeSection === 'myNotes'}
                onPress={() => setActiveSection('myNotes')}
              />
              <SectionTab
                label="Liked"
                active={activeSection === 'liked'}
                onPress={() => setActiveSection('liked')}
              />
              <SectionTab
                label="Favorited"
                active={activeSection === 'favorited'}
                onPress={() => setActiveSection('favorited')}
              />
              <SectionTab
                label="Drafts"
                active={activeSection === 'drafts'}
                onPress={() => setActiveSection('drafts')}
              />
            </View>

            <ScrollView
              style={styles.noteScrollView}
              contentContainerStyle={styles.noteScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}>
              {(loadingPlaces && (activeSection === 'liked' || activeSection === 'favorited')) ||
              (loadingNotes && (activeSection === 'myNotes' || activeSection === 'drafts')) ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.emptyTitle}>Loading...</Text>
                </View>
              ) : currentNotes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>It's empty here</Text>
                  <Text style={styles.emptySubtitle}>
                    {activeSection === 'liked' 
                      ? 'Go to the home page and like some travel places, they will appear here.'
                      : activeSection === 'favorited'
                      ? 'Go to the home page and favorite some travel places, they will appear here.'
                      : activeSection === 'drafts'
                      ? 'Click the + button in the top right to create your first note draft.'
                      : activeSection === 'myNotes'
                      ? 'Click the + button in the top right to publish your first note.'
                      : 'After exploring, recording, or favoriting some journeys, they will be automatically organized here.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.noteList}>{currentNotes.map((note, index) => renderNoteItem(note, index))}</View>
              )}
            </ScrollView>
          </ThemedView>
        </View>
      </ImageBackground>
    </ThemedView>
  );
}

interface SectionTabProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function SectionTab({ label, active, onPress }: SectionTabProps) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },
  settingsButton: {
    padding: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  settingsIconImage: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  headerCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderRadius: 0,
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  avatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  avatarText: {
    color: '#007A8C',
    fontSize: 24,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  userId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  ipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ipLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  ipValue: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  ipValueDim: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  cardTransparent: {
    backgroundColor: 'transparent',
  },
  noteSpaceCard: {
    minHeight: 0,
    // 高度通过内联样式动态设置（屏幕高度的60%）
  },
  noteScrollView: {
    flex: 1,
  },
  noteScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  dnaCardTouchable: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    flexShrink: 0,
  },
  cardHeaderRow: {
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007A8C',
  },
  createPostButtonText: {
    fontSize: 12,
    color: '#007A8C',
    fontWeight: '600',
  },
  cardHeaderSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  cardHeaderTitleWhite: {
    color: '#FFFFFF',
    textAlign: 'left',
    fontSize: 18,    // 调整这里，比如 18/20
    fontWeight: '700',
  },
  cardHeaderTitleBlack: {
    color: '#111827',
    textAlign: 'left',
    fontSize: 18,
    fontWeight: '700',
  },
  cardHeaderSubWhite: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'left',
  },
  cardHeaderSubGray: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'left',
  },
  cardHeaderTitleTight: {
    marginTop: 0,
  },
  dnaSummaryCompact: {
    marginTop: 4,
    gap: 2,
  },
  dnaSummaryText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'left',
  },
  dnaWishText: {
    fontSize: 13,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'left',
  },
  dnaReadonlyText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 15,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'left',
  },
  dnaSummaryList: {
    marginTop: 2,
  },
  moreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  moreChipText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  moreChipArrow: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#007A8C',
    borderColor: '#007A8C',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noteList: {
    marginTop: 4,
    gap: 8,
  },
  noteCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  noteCardDraft: {
    borderStyle: 'dashed',
    borderColor: '#007A8C',
    backgroundColor: '#C8E1E4',
  },
  noteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noteTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  noteDraftBadge: {
    fontSize: 10,
    color: '#007A8C',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  noteExcerpt: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#C8E1E4', // 浅绿色背景
  },
  tagChipDraft: {
    backgroundColor: '#FFFFFF', // 草稿卡片中的 tag 背景为白色
  },
  tagText: {
    fontSize: 10,
    color: '#007A8C', // 主题绿色文字
  },
  noteMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  noteMetaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  noteStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rightAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    gap: 4,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
