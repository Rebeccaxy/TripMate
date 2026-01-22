import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getCurrentUser, type User } from '@/services/authService';

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
  wishlist: string; // Interest points (free input, optional)
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

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

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

export default function AccountSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('');
  const [travelDNA, setTravelDNA] = useState<TravelDNA>(DEFAULT_DNA);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const initials = (displayName || userName || 'T').trim().charAt(0).toUpperCase();

  const options = useMemo(
    () => ({
      travelTypes: ['Nature & Scenery', 'City Sightseeing', 'Culture & History', 'Adventure Sports', 'Food Experience', 'Shopping', 'Wellness & Relaxation'],
      companions: ['Solo Travel', 'Couple/Partner', 'Family (with Children)', 'Friends Group', 'Business Trip'],
      budgets: ['Economy', 'Moderate', 'Luxury'] as BudgetRange[],
      paces: ['Relaxed', 'Moderate', 'Intensive'] as Pace[],
      lodging: ['Hostel', 'Budget Hotel', 'Boutique B&B', 'Chain Hotel', 'Luxury Resort'],
      transport: ['Flight Preferred', 'High-speed Rail/Train', 'Self-drive/Rental Car', 'Public Transport', 'Flexible'],
      diet: ['Regular Diet', 'Vegetarian', 'Halal', 'Seafood Lover', 'No Spicy', 'No Sweet'],
      specialNeeds: ['No Special Needs', 'Large Luggage/Sports Equipment', 'With Pets', 'Mobility/Accessibility', 'With Baby', 'Medical Support'],
      environment: ['Warm Climate', 'Cool Climate', 'Coastal', 'Mountain', 'Urban', 'Rural'],
      durations: ['Short (2-3 days)', 'Medium (4-7 days)', 'Long (8+ days)'] as TripDuration[],
    }),
    []
  );

  useEffect(() => {
    const load = async () => {
      const [name, dnaV2, dnaLegacy, avatar, user] = await Promise.all([
        AsyncStorage.getItem(DISPLAY_NAME_KEY),
        AsyncStorage.getItem(TRAVEL_DNA_V2_KEY),
        AsyncStorage.getItem(TRAVEL_DNA_KEY),
        AsyncStorage.getItem(AVATAR_URI_KEY),
        getCurrentUser().catch(() => null),
      ]);
      setDisplayName(name || '');
      if (dnaV2) {
        try {
          const parsed = JSON.parse(dnaV2);
          const loadedDna = { ...DEFAULT_DNA, ...(parsed || {}) };
          // Migrate old Chinese values to new English values
          const migratedDna = migrateDnaToEnglish(loadedDna);
          setTravelDNA(migratedDna);
          // Save migrated data back to storage if migration occurred
          const needsMigration = JSON.stringify(loadedDna) !== JSON.stringify(migratedDna);
          if (needsMigration) {
            await AsyncStorage.setItem(TRAVEL_DNA_V2_KEY, JSON.stringify(migratedDna));
            console.log('[Settings] Migrated Chinese values to English');
          }
        } catch {
          setTravelDNA(DEFAULT_DNA);
        }
      } else {
        // Compatible with legacy version: put old text into "wishlist/interest points" to avoid losing information
        setTravelDNA({ ...DEFAULT_DNA, wishlist: dnaLegacy || '' });
      }
      setAvatarUri(avatar);
      setUserName(user?.name || '');
    };
    load().catch((e) => console.error('Failed to load settings', e));
  }, []);

  const save = async () => {
    try {
      const dnaJson = JSON.stringify(travelDNA);
      const legacy = buildLegacySummary(travelDNA);
      await Promise.all([
        AsyncStorage.setItem(DISPLAY_NAME_KEY, displayName),
        AsyncStorage.setItem(TRAVEL_DNA_V2_KEY, dnaJson),
        // Also write a readable summary for compatibility with old read logic
        AsyncStorage.setItem(TRAVEL_DNA_KEY, legacy),
        avatarUri
          ? AsyncStorage.setItem(AVATAR_URI_KEY, avatarUri)
          : AsyncStorage.removeItem(AVATAR_URI_KEY),
      ]);
      console.log('[Settings] Successfully saved Travel DNA:', dnaJson);
      router.back();
    } catch (e) {
      console.error('Failed to save settings', e);
      // Show error to user
      alert('Failed to save settings. Please try again.');
    }
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Photo library permission not granted, cannot select avatar');
        return;
      }

      // Compatible with different versions of expo-image-picker:
      // - New version: ImagePicker.MediaType.Images
      // - Old version: ImagePicker.MediaTypeOptions.Images (will have deprecation warning, but works)
      const mediaTypesCompat =
        (ImagePicker as any).MediaType?.Images != null
          ? [(ImagePicker as any).MediaType.Images]
          : ImagePicker.MediaTypeOptions.Images;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesCompat,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setAvatarUri(uri);
    } catch (e) {
      console.error('Failed to select avatar', e);
    }
  };

  const handleResetAvatar = async () => {
    try {
      await AsyncStorage.removeItem(AVATAR_URI_KEY);
      setAvatarUri(null);
    } catch (e) {
      console.error('Failed to reset avatar', e);
    }
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
          Settings
        </ThemedText>
        <TouchableOpacity
          onPress={save}
          activeOpacity={0.7}
          style={styles.headerSaveButton}>
          <Text style={styles.headerSaveText}>Save</Text>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.contentArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.contentInner}>
          <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Avatar
          </ThemedText>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarFallbackText}>{initials}</Text>
              )}
            </View>
            <View style={styles.avatarActions}>
              <TouchableOpacity onPress={handlePickAvatar} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Change Avatar</Text>
              </TouchableOpacity>
            <TouchableOpacity
              onPress={handleResetAvatar}
              disabled={!avatarUri}
              style={[
                styles.actionBtn,
                styles.actionBtnGhost,
                !avatarUri && styles.actionBtnDisabled,
              ]}>
              <Text
                style={[
                  styles.actionBtnTextGhost,
                  !avatarUri && styles.actionBtnTextGhostDisabled,
                ]}>
                Reset to Default
              </Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Display Name
          </ThemedText>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your display name"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Travel DNA
          </ThemedText>
          <Text style={styles.sectionHint}>
            Optional, use tags or preset levels for quick input; further details can be supplemented in interest points.
          </Text>

          <Text style={styles.fieldTitle}>Travel Types (Multiple Selection)</Text>
          <View style={styles.chipWrap}>
            {options.travelTypes.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.travelTypes.includes(v)}
                onPress={() => setTravelDNA((prev) => ({ ...prev, travelTypes: toggleInList(prev.travelTypes, v) }))}
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Companions (Multiple Selection)</Text>
          <View style={styles.chipWrap}>
            {options.companions.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.companions.includes(v)}
                onPress={() => setTravelDNA((prev) => ({ ...prev, companions: toggleInList(prev.companions, v) }))}
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Budget Range (Single Selection)</Text>
          <View style={styles.chipWrap}>
            {options.budgets.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.budget === v}
                onPress={() => setTravelDNA((prev) => ({ ...prev, budget: prev.budget === v ? '' : v }))}
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Travel Pace (Single Selection)</Text>
          <View style={styles.chipWrap}>
            {options.paces.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.pace === v}
                onPress={() => setTravelDNA((prev) => ({ ...prev, pace: prev.pace === v ? '' : v }))}
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Lodging Preference (Multiple Selection)</Text>
          <View style={styles.chipWrap}>
            {options.lodging.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.lodging.includes(v)}
                onPress={() => setTravelDNA((prev) => ({ ...prev, lodging: toggleInList(prev.lodging, v) }))}
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Transport Preference (Multiple Selection)</Text>
          <View style={styles.chipWrap}>
            {options.transport.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.transport.includes(v)}
                onPress={() => setTravelDNA((prev) => ({ ...prev, transport: toggleInList(prev.transport, v) }))}
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Diet Preference (Optional, Multiple Selection)</Text>
          <View style={styles.chipWrap}>
            {options.diet.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.diet.includes(v)}
                onPress={() => setTravelDNA((prev) => ({ ...prev, diet: toggleInList(prev.diet, v) }))}
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Special Needs (Optional, Multiple Selection)</Text>
          <View style={styles.chipWrap}>
            {options.specialNeeds.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.specialNeeds.includes(v)}
                onPress={() =>
                  setTravelDNA((prev) => {
                    // When "No Special Needs" is selected, clear other needs; when other needs are selected, remove "No Special Needs"
                    if (v === 'No Special Needs') return { ...prev, specialNeeds: prev.specialNeeds.includes(v) ? [] : [v] };
                    const next = toggleInList(prev.specialNeeds.filter((x) => x !== 'No Special Needs'), v);
                    return { ...prev, specialNeeds: next };
                  })
                }
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Environment Preference (Multiple Selection)</Text>
          <View style={styles.chipWrap}>
            {options.environment.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.environment.includes(v)}
                onPress={() => setTravelDNA((prev) => ({ ...prev, environment: toggleInList(prev.environment, v) }))}
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Trip Duration (Single Selection)</Text>
          <View style={styles.chipWrap}>
            {options.durations.map((v) => (
              <Chip
                key={v}
                label={v}
                active={travelDNA.duration === v}
                onPress={() => setTravelDNA((prev) => ({ ...prev, duration: prev.duration === v ? '' : v }))}
              />
            ))}
          </View>

          <Text style={styles.fieldTitle}>Interest Points (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={travelDNA.wishlist}
            onChangeText={(t) => setTravelDNA((prev) => ({ ...prev, wishlist: t }))}
            placeholder="e.g., Cherry blossom season, diving course, local markets, beachside B&B stay..."
            placeholderTextColor="#9CA3AF"
            multiline
          />

          <TouchableOpacity
            onPress={() => setTravelDNA(DEFAULT_DNA)}
            style={[styles.actionBtn, styles.resetBtn]}>
            <Text style={styles.actionBtnText}>Clear Travel DNA</Text>
          </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
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
  headerSaveButton: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: { paddingBottom: 24 },
  contentInner: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  section: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  sectionTitle: { marginBottom: 10 },
  sectionHint: { marginTop: -6, marginBottom: 10, fontSize: 12, color: '#6B7280' },
  fieldTitle: { marginTop: 10, marginBottom: 8, fontSize: 13, fontWeight: '700', color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 64, height: 64 },
  avatarFallbackText: { color: '#007A8C', fontSize: 22, fontWeight: '700' },
  avatarActions: { flex: 1, gap: 8 },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#007A8C',
    alignItems: 'center',
  },
  resetBtn: { marginTop: 12 },
  actionBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(148,163,184,0.35)' },
  actionBtnDisabled: { opacity: 0.45 },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  actionBtnTextGhost: { color: '#111827', fontSize: 13, fontWeight: '600' },
  actionBtnTextGhostDisabled: { color: '#9CA3AF' },
  avatarHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#007A8C', borderColor: '#007A8C' },
  chipText: { fontSize: 12, color: '#111827' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
});

