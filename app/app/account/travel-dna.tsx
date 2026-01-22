import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { tracesService, type TracesStats } from '@/services/tracesService';
import { getTravelSuggestions, type TravelSuggestion } from '@/services/travelSuggestService';

const TRAVEL_DNA_KEY = '@tripMate:travelDNA';
const TRAVEL_DNA_V2_KEY = '@tripMate:travelDNA:v2';
const WISHLIST_ITEMS_KEY = '@tripMate:travelWishlistItems';
const LAST_SUGGEST_DNA_KEY = '@tripMate:lastSuggestDNA'; // DNA snapshot from last suggestion generation
const TRAVEL_SUGGESTIONS_KEY = '@tripMate:travelSuggestions'; // Save generated travel suggestions

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

type WishlistItem = {
  id: string;
  title: string;
  done: boolean;
};

// Migration mapping from old Chinese values to new English values
const CHINESE_TO_ENGLISH_MAP: Record<string, Record<string, string>> = {
  travelTypes: {
    '自然风光': 'Nature & Scenery',
    '城市观光': 'City Sightseeing',
    '文化历史': 'Culture & History',
    '冒险运动': 'Adventure Sports',
    '美食体验': 'Food Experience',
    '购物': 'Shopping',
    '养生放松': 'Wellness & Relaxation',
  },
  companions: {
    '独自旅行': 'Solo Travel',
    '情侣/伴侣': 'Couple/Partner',
    '家庭（带小孩）': 'Family (with Children)',
    '朋友团体': 'Friends Group',
    '商务出行': 'Business Trip',
  },
  budgets: {
    '经济型': 'Economy',
    '中等': 'Moderate',
    '高端': 'Luxury',
  },
  paces: {
    '放松': 'Relaxed',
    '适中': 'Moderate',
    '紧凑': 'Intensive',
  },
  lodging: {
    '青旅': 'Hostel',
    '经济酒店': 'Budget Hotel',
    '精品民宿': 'Boutique B&B',
    '连锁酒店': 'Chain Hotel',
    '豪华度假村': 'Luxury Resort',
  },
  transport: {
    '偏好飞机': 'Flight Preferred',
    '高铁/火车': 'High-speed Rail/Train',
    '自驾/租车': 'Self-drive/Rental Car',
    '公共交通': 'Public Transport',
    '灵活': 'Flexible',
  },
  diet: {
    '常规饮食': 'Regular Diet',
    '素食': 'Vegetarian',
    '清真': 'Halal',
    '海鲜爱好者': 'Seafood Lover',
    '不吃辣': 'No Spicy',
    '不吃甜': 'No Sweet',
  },
  specialNeeds: {
    '无特别需求': 'No Special Needs',
    '大件行李/运动器材': 'Large Luggage/Sports Equipment',
    '带宠物': 'With Pets',
    '行动不便/无障碍': 'Mobility/Accessibility',
    '带婴儿': 'With Baby',
    '医疗支持': 'Medical Support',
  },
  environment: {
    '温暖气候': 'Warm Climate',
    '凉爽气候': 'Cool Climate',
    '海滨': 'Coastal',
    '山区': 'Mountain',
    '城市': 'Urban',
    '乡村': 'Rural',
  },
  durations: {
    '短途(2-3天)': 'Short (2-3 days)',
    '中等(4-7天)': 'Medium (4-7 days)',
    '长途(8天+)': 'Long (8+ days)',
  },
};

// Migrate old Chinese DNA values to new English values
function migrateDnaToEnglish(dna: TravelDNA): TravelDNA {
  const migrated = { ...dna };

  // Migrate arrays
  if (migrated.travelTypes) {
    migrated.travelTypes = migrated.travelTypes.map(
      (v) => CHINESE_TO_ENGLISH_MAP.travelTypes[v] || v
    );
  }
  if (migrated.companions) {
    migrated.companions = migrated.companions.map(
      (v) => CHINESE_TO_ENGLISH_MAP.companions[v] || v
    );
  }
  if (migrated.lodging) {
    migrated.lodging = migrated.lodging.map(
      (v) => CHINESE_TO_ENGLISH_MAP.lodging[v] || v
    );
  }
  if (migrated.transport) {
    migrated.transport = migrated.transport.map(
      (v) => CHINESE_TO_ENGLISH_MAP.transport[v] || v
    );
  }
  if (migrated.diet) {
    migrated.diet = migrated.diet.map(
      (v) => CHINESE_TO_ENGLISH_MAP.diet[v] || v
    );
  }
  if (migrated.specialNeeds) {
    migrated.specialNeeds = migrated.specialNeeds.map(
      (v) => CHINESE_TO_ENGLISH_MAP.specialNeeds[v] || v
    );
  }
  if (migrated.environment) {
    migrated.environment = migrated.environment.map(
      (v) => CHINESE_TO_ENGLISH_MAP.environment[v] || v
    );
  }

  // Migrate single values
  if (migrated.budget && CHINESE_TO_ENGLISH_MAP.budgets[migrated.budget]) {
    migrated.budget = CHINESE_TO_ENGLISH_MAP.budgets[migrated.budget] as BudgetRange;
  }
  if (migrated.pace && CHINESE_TO_ENGLISH_MAP.paces[migrated.pace]) {
    migrated.pace = CHINESE_TO_ENGLISH_MAP.paces[migrated.pace] as Pace;
  }
  if (migrated.duration && CHINESE_TO_ENGLISH_MAP.durations[migrated.duration]) {
    migrated.duration = CHINESE_TO_ENGLISH_MAP.durations[migrated.duration] as TripDuration;
  }

  return migrated;
}

function buildLegacySummary(dna: TravelDNA) {
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
  if (dna.wishlist.trim()) lines.push(`Wishlist: ${dna.wishlist.trim()}`);
  return lines.join('\n');
}

function buildSummaryLines(dna: TravelDNA) {
  const lines: string[] = [];
  if (dna.travelTypes.length) lines.push(`Travel Types: ${dna.travelTypes.join(' / ')}`);
  if (dna.companions.length) lines.push(`Companions: ${dna.companions.join(' / ')}`);
  if (dna.budget) lines.push(`Budget Range: ${dna.budget}`);
  if (dna.pace) lines.push(`Travel Pace: ${dna.pace}`);
  if (dna.duration) lines.push(`Trip Duration: ${dna.duration}`);
  if (dna.environment.length) lines.push(`Environment Preference: ${dna.environment.join(' / ')}`);
  // Add interest points (from wishlist field in settings)
  if (dna.wishlist.trim()) {
    const interests = dna.wishlist.trim().split(/\n|；|;|，|,/).filter(Boolean);
    if (interests.length > 0) {
      lines.push(`Interest Points: ${interests.join(' / ')}`);
    }
  }
  return lines;
}

function seedWishlistFromText(text: string): WishlistItem[] {
  if (!text.trim()) return [];
  const rawItems = text
    .split(/\n|；|;|，|,/)
    .map((t) => t.trim())
    .filter(Boolean);
  return rawItems.map((title, index) => ({
    id: `${Date.now()}-${index}`,
    title,
    done: false,
  }));
}

// Calculate DNA hash value to detect changes (including interest points and wishlist)
function computeDnaHash(dna: TravelDNA, wishlistItems: WishlistItem[]): string {
  const wishlistText = wishlistItems
    .filter((i) => !i.done)
    .map((i) => i.title)
    .join('|');
  return JSON.stringify({
    types: dna.travelTypes.sort(),
    budget: dna.budget,
    pace: dna.pace,
    environment: dna.environment.sort(),
    interests: dna.wishlist.trim(), // Interest points (from wishlist field in settings)
    wishlist: wishlistText, // Wishlist (from Travel DNA page)
  });
}

export default function TravelDNAScreen() {
  const router = useRouter();
  const [dna, setDna] = useState<TravelDNA>(DEFAULT_DNA);
  const [legacy, setLegacy] = useState<string>('');
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [newWish, setNewWish] = useState('');
  const [tracesStats, setTracesStats] = useState<TracesStats | null>(null);
  const [isLoadingTraces, setIsLoadingTraces] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<TravelSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [lastSuggestDnaHash, setLastSuggestDnaHash] = useState<string>('');

  // Function to clear all Travel DNA data
  const clearAllData = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TRAVEL_DNA_V2_KEY),
        AsyncStorage.removeItem(TRAVEL_DNA_KEY),
        AsyncStorage.removeItem(WISHLIST_ITEMS_KEY),
        AsyncStorage.removeItem(TRAVEL_SUGGESTIONS_KEY),
        AsyncStorage.removeItem(LAST_SUGGEST_DNA_KEY),
      ]);
      console.log('[Travel DNA] Cleared all stored data');
    } catch (e) {
      console.error('Failed to clear Travel DNA data', e);
    }
  }, []);

  // Function to load data
  const loadData = useCallback(async () => {
    try {
      const [v2, legacyText, wishlistRaw, savedSuggestions, lastSuggestDna] = await Promise.all([
        AsyncStorage.getItem(TRAVEL_DNA_V2_KEY),
        AsyncStorage.getItem(TRAVEL_DNA_KEY),
        AsyncStorage.getItem(WISHLIST_ITEMS_KEY),
        AsyncStorage.getItem(TRAVEL_SUGGESTIONS_KEY),
        AsyncStorage.getItem(LAST_SUGGEST_DNA_KEY),
      ]);

      if (v2) {
        try {
          const parsed = JSON.parse(v2);
          const loadedDna = { ...DEFAULT_DNA, ...(parsed || {}) };
          // Migrate old Chinese values to new English values
          const migratedDna = migrateDnaToEnglish(loadedDna);
          setDna(migratedDna);
          // Save migrated data back to storage if migration occurred
          const needsMigration = JSON.stringify(loadedDna) !== JSON.stringify(migratedDna);
          if (needsMigration) {
            await AsyncStorage.setItem(TRAVEL_DNA_V2_KEY, JSON.stringify(migratedDna));
            console.log('[Travel DNA] Migrated Chinese values to English');
          }
        } catch {
          setDna(DEFAULT_DNA);
        }
      } else {
        setDna(DEFAULT_DNA);
      }

      // Only use legacy text if there's no v2 data (for backward compatibility)
      // If v2 exists, we'll generate fresh summary from it, so don't use old legacy text
      if (v2) {
        setLegacy(''); // Clear legacy when v2 exists, we'll use summaryLines instead
      } else {
        setLegacy(legacyText || '');
      }

      if (wishlistRaw) {
        try {
          const parsed: WishlistItem[] = JSON.parse(wishlistRaw);
          setWishlistItems(parsed || []);
        } catch {
          setWishlistItems([]);
        }
      } else if (v2) {
        try {
          const parsed = JSON.parse(v2);
          const wishlistText = (parsed?.wishlist as string) || '';
          setWishlistItems(seedWishlistFromText(wishlistText));
        } catch {
          setWishlistItems([]);
        }
      } else if (legacyText) {
        setWishlistItems(seedWishlistFromText(legacyText));
      }

      // Load DNA snapshot from last suggestion generation
      if (lastSuggestDna) {
        setLastSuggestDnaHash(lastSuggestDna);
      }

      // Load previously saved suggestions
      if (savedSuggestions) {
        try {
          const parsed: TravelSuggestion[] = JSON.parse(savedSuggestions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`[Travel DNA] Loaded saved suggestions, count: ${parsed.length}`);
            setSuggestions(parsed);
          }
        } catch (e) {
          console.error('Failed to load saved suggestions:', e);
          setSuggestions([]);
        }
      }
    } catch (e) {
      console.error('Failed to load Travel DNA page data', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when page gains focus (triggered when returning from settings page)
  useFocusEffect(
    useCallback(() => {
      console.log('[Travel DNA] Page gained focus, refreshing data');
      loadData();
    }, [loadData])
  );

  // Detect if DNA has changed (including interest points and wishlist)
  const currentDnaHash = useMemo(() => {
    return computeDnaHash(dna, wishlistItems);
  }, [dna, wishlistItems]);

  const hasDnaChanged = useMemo(() => {
    if (!lastSuggestDnaHash) {
      // If suggestions have never been generated, check if there is valid DNA (including interest points and wishlist)
      const hasWishlist = wishlistItems.some((i) => !i.done);
      return (
        dna.travelTypes.length > 0 ||
        dna.budget !== '' ||
        dna.pace !== '' ||
        dna.environment.length > 0 ||
        dna.wishlist.trim() !== '' ||
        hasWishlist
      );
    }
    return currentDnaHash !== lastSuggestDnaHash;
  }, [currentDnaHash, lastSuggestDnaHash, dna, wishlistItems]);

  // Sync Traces statistics (consistent with Traces page: /traces/stats)
  useEffect(() => {
    const loadTraces = async () => {
      try {
        setIsLoadingTraces(true);
        const stats = await tracesService.getStats();
        setTracesStats(stats);
      } catch (e) {
        // When not logged in/backend unavailable, don't block page, just show 0
        console.warn('Failed to sync Traces statistics (will display as 0)', e);
        setTracesStats({
          totalCities: 0,
          totalProvinces: 0,
          totalDistance: 0,
          trackingDays: 0,
        });
      } finally {
        setIsLoadingTraces(false);
      }
    };

    loadTraces();
  }, []);

  const persistWishlist = async (items: WishlistItem[], currentDna: TravelDNA) => {
    try {
      // Only save wishlist to independent storage, don't overwrite interest points field in DNA
      await AsyncStorage.setItem(WISHLIST_ITEMS_KEY, JSON.stringify(items));

      // Update summary (excluding wishlist, as wishlist is an independent part)
      const legacySummary = buildLegacySummary(currentDna);
      await AsyncStorage.setItem(TRAVEL_DNA_KEY, legacySummary);

      // Note: Don't modify DNA's wishlist field, as that is for interest points (from settings)
      setLegacy(legacySummary);
    } catch (e) {
      console.error('Failed to save wishlist', e);
    }
  };

  const handleAddWish = () => {
    const title = newWish.trim();
    if (!title) return;
    const next = [
      ...wishlistItems,
      {
        id: Date.now().toString(),
        title,
        done: false,
      },
    ];
    setWishlistItems(next);
    setNewWish('');
    void persistWishlist(next, dna);
  };

  const handleToggleWish = (id: string) => {
    const next = wishlistItems.map((item) =>
      item.id === id
        ? {
            ...item,
            done: !item.done,
          }
        : item
    );
    setWishlistItems(next);
    void persistWishlist(next, dna);
  };

  const handleRemoveWish = (id: string) => {
    const next = wishlistItems.filter((item) => item.id !== id);
    setWishlistItems(next);
    void persistWishlist(next, dna);
  };

  const summaryLines = useMemo(() => buildSummaryLines(dna), [dna]);

  const handleOpenSettings = () => {
    router.push('/account/settings');
  };

  // Generate AI travel suggestions (can refresh anytime, no need to detect DNA changes)
  const handleGenerateSuggestions = async () => {
    if (isLoadingSuggestions) return;

    try {
      setIsLoadingSuggestions(true);

      // Build Travel DNA data to send to backend
      // Includes interest points (from settings) and wishlist (independent wishlist from Travel DNA page)
      const interests = dna.wishlist.trim(); // Interest points (from settings)
      const wishlistText = wishlistItems
        .filter((i) => !i.done) // Only include unfinished wishes
        .map((i) => i.title)
        .join('、'); // Wishlist (from Travel DNA page)
      
      // Merge interest points and wishlist
      const combinedWishlist = [interests, wishlistText]
        .filter(Boolean)
        .join('、');
      
      const travelDnaForApi = {
        types: dna.travelTypes,
        budget: dna.budget,
        pace: dna.pace,
        environment: dna.environment,
        wishlist: combinedWishlist || undefined,
      };

      const newSuggestions = await getTravelSuggestions(travelDnaForApi);
      setSuggestions(newSuggestions);

      // Save suggestions to AsyncStorage so they still display when opening the page next time
      try {
        await AsyncStorage.setItem(TRAVEL_SUGGESTIONS_KEY, JSON.stringify(newSuggestions));
        console.log(`[Travel DNA] Saved suggestions to storage, count: ${newSuggestions.length}`);
      } catch (saveError) {
        console.error('Failed to save suggestions:', saveError);
        // Even if save fails, continue to display suggestions
      }

      // Save current DNA snapshot (for next time to detect changes, but doesn't affect refresh functionality)
      await AsyncStorage.setItem(LAST_SUGGEST_DNA_KEY, currentDnaHash);
      setLastSuggestDnaHash(currentDnaHash);
    } catch (error) {
      console.error('Failed to generate travel suggestions:', error);
      // When generation fails, don't clear existing suggestions, keep previous content
      // setSuggestions([]); // Comment out this line, keep previous suggestions
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Click suggestion card, navigate to Trip Chat
  const handleSuggestionClick = (suggestion: TravelSuggestion) => {
    const chatId = Date.now().toString();
    
    // Build implicit context
    const context = {
      itinerary: {
        country: suggestion.country,
        city: suggestion.city,
        activities: suggestion.activities,
        days: suggestion.days,
      },
      travelDNA: {
        types: dna.travelTypes,
        budget: dna.budget,
        pace: dna.pace,
        environment: dna.environment,
        // Include interest points (from settings) and wishlist (from Travel DNA page)
        wishlist: (() => {
          const interests = dna.wishlist.trim();
          const wishlistText = wishlistItems
            .filter((i) => !i.done)
            .map((i) => i.title)
            .join('、');
          return [interests, wishlistText].filter(Boolean).join('、') || undefined;
        })(),
      },
    };

    // Build user-visible initial message
    const activitiesText =
      suggestion.activities.length <= 2
        ? suggestion.activities.join(' · ')
        : `${suggestion.activities.slice(0, 2).join(' · ')} and ${suggestion.activities.length - 2} more`;
    const initialMessage = `I want to travel to ${suggestion.country}·${suggestion.city} and plan to stay for ${suggestion.days} days. I want to experience: ${activitiesText}. Please help me plan a detailed itinerary.`;

    router.push({
      pathname: '/chat/[id]',
      params: {
        id: chatId,
        initialMessage,
        context: JSON.stringify(context), // Pass as implicit context
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Travel DNA
        </ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleOpenSettings}
            activeOpacity={0.7}>
            <MaterialIcons name="tune" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={styles.contentArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Summary */}
          <ThemedView style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <ThemedText type="subtitle" style={styles.cardHeaderTitle}>
                Travel DNA Summary
              </ThemedText>
              <Text style={styles.cardHeaderSub}>Travel profile summary based on your preferences</Text>
            </View>
            {summaryLines.length > 0 ? (
              <View style={styles.summaryList}>
                {summaryLines.map((line) => (
                  <Text key={line} style={styles.summaryText}>
                    • {line}
                  </Text>
                ))}
              </View>
            ) : legacy ? (
              <View style={styles.summaryList}>
                <Text style={styles.summaryText}>{legacy}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>
                Travel DNA not filled yet. You can first complete your preferences in the "Settings" in the top right, then come back to view your profile.
              </Text>
            )}
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleOpenSettings}
              activeOpacity={0.8}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </ThemedView>

          {/* Traces Statistics */}
          <ThemedView style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <ThemedText type="subtitle" style={styles.cardHeaderTitle}>
                Traces Statistics
              </ThemedText>
              <Text style={styles.cardHeaderSub}>From Traces (synchronized with Traces page)</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>
                  {isLoadingTraces ? '…' : tracesStats?.totalCities ?? 0}
                </Text>
                <Text style={styles.statsLabel}>Visited Cities</Text>
              </View>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>
                  {isLoadingTraces ? '…' : tracesStats?.totalProvinces ?? 0}
                </Text>
                <Text style={styles.statsLabel}>Visited Provinces</Text>
              </View>
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>
                  {isLoadingTraces ? '…' : tracesStats?.trackingDays ?? 0}
                </Text>
                <Text style={styles.statsLabel}>Total Travel Days</Text>
              </View>
            </View>
          </ThemedView>

          {/* Wishlist */}
          <ThemedView style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <ThemedText type="subtitle" style={styles.cardHeaderTitle}>
                Wishlist
              </ThemedText>
              <Text style={styles.cardHeaderSub}>Destinations you want to visit or activities you want to experience</Text>
            </View>

            <View style={styles.wishlistInputRow}>
              <TextInput
                style={styles.wishlistInput}
                value={newWish}
                onChangeText={setNewWish}
                placeholder="e.g., Skiing in Hokkaido, Cherry blossoms in Kyoto, Snorkeling in Maldives..."
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={[
                  styles.addWishButton,
                  !newWish.trim() && styles.addWishButtonDisabled,
                ]}
                onPress={handleAddWish}
                disabled={!newWish.trim()}>
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {wishlistItems.length === 0 ? (
              <Text style={styles.placeholderText}>
                No wishlist items added yet. You can enter a destination or activity and click the + button on the right to add.
              </Text>
            ) : (
              <View style={styles.wishlistList}>
                {wishlistItems.map((item) => (
                  <View key={item.id} style={styles.wishItemRow}>
                    <TouchableOpacity
                      onPress={() => handleToggleWish(item.id)}
                      style={[
                        styles.wishCheck,
                        item.done && styles.wishCheckDone,
                      ]}>
                      {item.done && (
                        <MaterialIcons name="check" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.wishTitle,
                        item.done && styles.wishTitleDone,
                      ]}>
                      {item.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveWish(item.id)}
                      style={styles.wishDeleteBtn}>
                      <MaterialIcons
                        name="close"
                        size={18}
                        color="rgba(148,163,184,0.9)"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ThemedView>

          {/* AI Travel Inspiration */}
          <ThemedView style={styles.card}>
            <View style={styles.aiCardHeaderRow}>
              <View style={styles.aiCardHeaderLeft}>
                <ThemedText type="subtitle" style={styles.cardHeaderTitle}>
                  AI Travel Inspiration
                </ThemedText>
                <Text style={styles.cardHeaderSub}>
                  Generate 2–3 destination or itinerary suggestions based on Travel DNA and wishlist
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.aiRefreshButton,
                  isLoadingSuggestions && styles.aiRefreshButtonDisabled,
                ]}
                onPress={handleGenerateSuggestions}
                disabled={isLoadingSuggestions}
                activeOpacity={0.7}>
                {isLoadingSuggestions ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons
                    name="auto-awesome"
                    size={20}
                    color="#FFFFFF"
                  />
                )}
              </TouchableOpacity>
            </View>

            {!suggestions.length && !isLoadingSuggestions && (
              <Text style={styles.aiHintText}>Click the refresh button above to generate travel suggestions</Text>
            )}

            {suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((suggestion, index) => {
                  // Use line breaks to display all activities, instead of truncating
                  const activitiesText = suggestion.activities.join(' · ');
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionCard}
                      onPress={() => handleSuggestionClick(suggestion)}
                      activeOpacity={0.8}>
                      <View style={styles.suggestionCardContent}>
                        <Text style={styles.suggestionTitle}>
                          {suggestion.country}·{suggestion.city}
                        </Text>
                        <Text style={styles.suggestionSubtitle} numberOfLines={0}>
                          {activitiesText}
                        </Text>
                        <Text style={styles.suggestionDays}>{suggestion.days} days</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  cardHeaderRow: {
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020617',
  },
  cardHeaderSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryList: {
    marginTop: 4,
    gap: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
  },
  placeholderText: {
    marginTop: 6,
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  editButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#007A8C',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 8,
    marginTop: 8,
  },
  statsItem: {
    width: '31%',
    minWidth: 90,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007A8C',
  },
  statsLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  wishlistInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  wishlistInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  addWishButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007A8C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addWishButtonDisabled: {
    backgroundColor: '#ACD1D6',
  },
  wishlistList: {
    marginTop: 8,
    gap: 4,
  },
  wishItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  wishCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  wishCheckDone: {
    backgroundColor: '#007A8C',
    borderColor: '#007A8C',
  },
  wishTitle: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  wishTitleDone: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  wishDeleteBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginLeft: 4,
  },
  aiCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiCardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  aiRefreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007A8C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiRefreshButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  aiHintText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  suggestionsList: {
    marginTop: 12,
    gap: 12,
  },
  suggestionCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  suggestionCardContent: {
    gap: 6,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  suggestionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  suggestionDays: {
    fontSize: 12,
    color: '#007A8C',
    fontWeight: '500',
    marginTop: 4,
  },
});

