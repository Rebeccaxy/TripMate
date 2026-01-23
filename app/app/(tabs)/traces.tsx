import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  PanResponder,
  Dimensions,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { locationTrackingService } from '@/services/locationTrackingService';
import {
  tracesService,
  type CityVisit,
  type TracesStats,
  type LocationPoint,
} from '@/services/tracesService';

export default function TracesScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [cities, setCities] = useState<CityVisit[]>([]);
  const [stats, setStats] = useState<TracesStats | null>(null);
  const [trajectory, setTrajectory] = useState<LocationPoint[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityVisit | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 39.9042, // Beijing
    longitude: 116.4074,
    latitudeDelta: 15,
    longitudeDelta: 15,
  });

  // Drawer: When open, top doesn't exceed safe area; when closed, ensure "Stats card + Enable location tracking" is above TabBar
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  // Total drawer content height (excluding top safe area)
  const DRAWER_HEIGHT = SCREEN_HEIGHT - insets.top-30;
  // Height still visible when collapsed (stats card + enable tracking + title area)
  const DRAWER_PEEK = 280;
  // Drawer open/close position on Y axis (absolute offset)
  const drawerOpenY = insets.top; // Top just touches safe area
  const drawerClosedY = drawerOpenY + (DRAWER_HEIGHT - DRAWER_PEEK);

  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const drawerTranslateY = React.useRef(new Animated.Value(drawerClosedY)).current;
  const drawerTranslateYRef = React.useRef(drawerClosedY);
  const drawerGestureStartYRef = React.useRef(drawerClosedY);

  useEffect(() => {
    const id = drawerTranslateY.addListener(({ value }) => {
      drawerTranslateYRef.current = value;
    });
    return () => {
      drawerTranslateY.removeListener(id);
    };
  }, [drawerTranslateY]);

  const animateDrawerTo = (toValue: number) => {
    // Stop any ongoing animation, smoothly transition from current position to target position
    drawerTranslateY.stopAnimation((currentValue) => {
      // Start animation from current actual position
      drawerTranslateY.setValue(currentValue);
      Animated.spring(drawerTranslateY, {
        toValue,
        useNativeDriver: true,
        tension: 100, // Slightly reduce tension for smoother animation
        friction: 12, // Slightly reduce friction for faster response
        velocity: 0, // Start from rest to avoid sudden acceleration
      }).start();
    });
  };

  const toggleDrawer = () => {
    const nextExpanded = !drawerExpanded;
    setDrawerExpanded(nextExpanded);
    animateDrawerTo(nextExpanded ? drawerOpenY : drawerClosedY);
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => false,
        // Lower drag trigger threshold for more sensitive dragging
        onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dy) > 4,
        onMoveShouldSetPanResponderCapture: (_evt, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          // 记录手势开始时抽屉位置，避免 move 时“叠加 dy”导致难以收起
          // 停止所有正在进行的动画，确保从当前位置开始拖拽
          drawerTranslateY.stopAnimation((value) => {
            // 记录手势开始时抽屉位置（使用动画停止后的实际值）
            drawerGestureStartYRef.current = value;
            drawerTranslateYRef.current = value;
          });
        },
        onPanResponderMove: (_evt, gesture) => {
          // Follow finger position in real-time for more natural dragging
          const rawNext = drawerGestureStartYRef.current + gesture.dy;
          let next = rawNext;
          
          // Add damping effect: closer to boundary, more resistance for more natural dragging
          // If dragging down (close direction), add damping when approaching closed position
          if (rawNext > drawerClosedY) {
            const overshoot = rawNext - drawerClosedY;
            // Damping coefficient: more overshoot, more resistance
            next = drawerClosedY + overshoot * 0.3;
          }
          // If dragging up (open direction), add damping when approaching open position
          else if (rawNext < drawerOpenY) {
            const overshoot = drawerOpenY - rawNext;
            next = drawerOpenY - overshoot * 0.3;
          }
          
          // Ensure within valid range
          next = Math.max(drawerOpenY, Math.min(drawerClosedY, next));
          
          // Set value directly, follow finger in real-time (no animation for immediate response)
          drawerTranslateY.setValue(next);
          // Also update ref to ensure subsequent calculations use latest value
          drawerTranslateYRef.current = next;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_evt, gesture) => {
          const current = drawerTranslateYRef.current;
          const travelDistance = drawerClosedY - drawerOpenY;
          const currentProgress = (current - drawerOpenY) / travelDistance; // 0 = fully open, 1 = fully closed
          
          // Calculate drag velocity (pixels/second)
          const velocity = Math.abs(gesture.vy);
          
          // Optimized logic:
          // 1. If velocity is fast enough (quick swipe), decide based on direction
          // 2. If velocity is slow, decide based on position and drag distance
          let shouldOpen = false;
          
          if (velocity > 0.5) {
            // Quick swipe: decide based on velocity direction
            shouldOpen = gesture.vy < 0; // Swipe up = open
          } else {
            // Slow drag: consider both position and drag distance
            const dragDistance = Math.abs(gesture.dy);
            const dragThreshold = travelDistance * 0.15; // Drag distance threshold: 15% of total distance
            
            if (dragDistance > dragThreshold) {
              // If drag distance is large enough, decide based on drag direction
              shouldOpen = gesture.dy < 0; // Drag up = open
            } else {
              // If drag distance is small, decide based on current position (more intuitive)
              // If already open more than 60%, tend to stay open; otherwise tend to close
              shouldOpen = currentProgress < 0.4;
            }
          }
          
          setDrawerExpanded(shouldOpen);
          animateDrawerTo(shouldOpen ? drawerOpenY : drawerClosedY);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawerOpenY, drawerClosedY]
  );

  useEffect(() => {
    console.log('📱 [Traces Page] Component loaded, starting initialization...');
    loadData(false); // First load shows main loading
    checkTrackingStatus();
  }, []);

  // 追踪开启时，定时刷新数据（避免“上传成功但 UI 不更新”）
  useEffect(() => {
    let timer: number | undefined;
    if (trackingEnabled) {
      // Refresh immediately once (silent, doesn't interrupt interface)
      loadData(true);
      timer = setInterval(() => {
        loadData(true);
      }, 8000) as unknown as number;
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingEnabled]);

  /**
   * Load data
   * @param silent true to not show global loading (for periodic refresh/background refresh)
   */
  const loadData = async (silent: boolean) => {
    try {
      if (!silent) setLoading(true);
      // Use Promise.allSettled to continue even if one fails
      // 使用 Promise.allSettled 确保即使某个请求失败也能继续
      const results = await Promise.allSettled([
        loadCities(),
        loadStats(),
        loadTrajectory(),
      ]);
      
      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const names = ['Cities', 'Stats', 'Trajectory'];
          console.error(`❌ [Traces] ${names[index]} 加载失败:`, result.reason);
        }
      });
    } catch (error) {
      console.error('❌ [Traces] 加载数据失败:', error);
      if (!silent) {
        Alert.alert('Error', 'Failed to load traces data, please try again later');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const cityList = await tracesService.getCityVisits();
      setCities(cityList);
      
      // If there are cities, adjust map region
      if (cityList.length > 0) {
        const lightedCities = cityList.filter((c) => c.isLighted);
        if (lightedCities.length > 0) {
          const avgLat =
            lightedCities.reduce((sum, c) => sum + c.latitude, 0) /
            lightedCities.length;
          const avgLon =
            lightedCities.reduce((sum, c) => sum + c.longitude, 0) /
            lightedCities.length;
          setMapRegion({
            latitude: avgLat,
            longitude: avgLon,
            latitudeDelta: 15,
            longitudeDelta: 15,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load city list:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await tracesService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadTrajectory = async () => {
    try {
      const trajectoryData = await tracesService.getLocationTrajectory();
      setTrajectory(trajectoryData);
      console.log(`✅ [Traces] 轨迹加载成功，共 ${trajectoryData.length} 个点`);
    } catch (error: any) {
      console.error('❌ [Traces] 获取轨迹失败:', error);
      console.error('   错误详情:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack?.substring(0, 200),
      });
      // Don't show alert for silent refreshes, only for initial load
      // 静默刷新时不显示错误提示，只在初始加载时显示
    }
  };

  const checkTrackingStatus = async () => {
    try {
      console.log('🔍 [Traces Page] Checking location permissions/tracking status...');
      const permissions = await locationTrackingService.checkPermissions();
      console.log(`   Foreground location permission: ${permissions.foreground ? '✅' : '❌'}`);
      console.log(`   Background location permission: ${permissions.background ? '✅' : '❌'}`);
      setPermissionsGranted(permissions.foreground);
      const enabled = locationTrackingService.isTrackingEnabled();
      console.log(`   Tracking switch status: ${enabled ? '✅ Enabled' : '⏸️ Disabled'}`);
      setTrackingEnabled(enabled);
    } catch (error) {
      console.error('Failed to check tracking status:', error);
    }
  };

  const handleToggleTracking = async () => {
    try {
      if (!trackingEnabled) {
        // Request permission
        const hasPermission = await locationTrackingService.requestPermissions();
        if (!hasPermission) {
          Alert.alert(
            'Permission Denied',
            'Location permission is required to record traces. Please enable location permission in settings.'
          );
          return;
        }

        // Start tracking
        const started = await locationTrackingService.startTracking();
        if (started) {
          setTrackingEnabled(true);
          Alert.alert('Success', 'Location tracking enabled, will start recording your traces');
        } else {
          Alert.alert('Failed', 'Failed to start location tracking, please try again later');
        }
      } else {
        // Stop tracking
        await locationTrackingService.stopTracking();
        setTrackingEnabled(false);
        Alert.alert('Success', 'Location tracking disabled');
      }
    } catch (error) {
      console.error('Failed to toggle tracking status:', error);
      Alert.alert('Error', 'Operation failed, please try again later');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleCityPress = (city: CityVisit) => {
    setSelectedCity(city);
    setMapRegion({
      latitude: city.latitude,
      longitude: city.longitude,
      latitudeDelta: 1,
      longitudeDelta: 1,
    });
  };

  const handleZoomIn = () => {
    setMapRegion((prev) => ({
      ...prev,
      latitudeDelta: prev.latitudeDelta * 0.5,
      longitudeDelta: prev.longitudeDelta * 0.5,
    }));
  };

  const handleZoomOut = () => {
    setMapRegion((prev) => ({
      ...prev,
      latitudeDelta: Math.min(prev.latitudeDelta * 2, 180),
      longitudeDelta: Math.min(prev.longitudeDelta * 2, 360),
    }));
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const lightedCities = cities.filter((c) => c.isLighted);
  const trajectoryCoordinates = trajectory.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));
  const lastPoint = trajectory.length > 0 ? trajectory[trajectory.length - 1] : null;

  return (
    <ThemedView style={styles.container}>
      {/* Full screen map as background */}
      <MapView
        style={styles.fullscreenMap}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        mapType="standard">
        {/* Draw trajectory */}
        {trajectoryCoordinates.length > 1 && (
          <Polyline
            coordinates={trajectoryCoordinates}
            strokeColor={Colors[colorScheme ?? 'light'].tint}
            strokeWidth={3}
          />
        )}

        {/* Mark all visited cities: lighted cities use theme color, unlighted use gray */}
        {cities.map((city) => (
          <Marker
            key={`${city.cityName}-${city.provinceName}`}
            coordinate={{
              latitude: city.latitude,
              longitude: city.longitude,
            }}
            title={city.cityName}
            description={`Visited ${city.visitCount} times`}
            pinColor={city.isLighted ? Colors[colorScheme ?? 'light'].tint : '#9AA0A6'}
            onPress={() => handleCityPress(city)}
          />
        ))}

        {/* Last location point marker (even if city not lighted yet, can see on map) */}
        {lastPoint && (
          <Marker
            key="last-point"
            coordinate={{ latitude: lastPoint.latitude, longitude: lastPoint.longitude }}
            title="Current Location"
            pinColor="#FF6B6B"
          />
        )}
      </MapView>

      {/* Drawer: Upper part always visible (stats + enable tracking), lower part is expandable city list */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.drawer,
            {
              height: DRAWER_HEIGHT,
              transform: [{ translateY: drawerTranslateY }],
            },
          ]}>
          {/* Drawer gradient background: transparent at top, theme color at bottom */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(0, 122, 140, 0.0)',   // Top almost fully transparent
              'rgba(0, 122, 140, 0.6)',   // Upper middle starts showing color
              'rgba(0, 122, 140, 0.95)',  // Lower part mostly opaque
            ]}
            locations={[0.0, 0.25, 0.7]}
            start={{ x: 0.5, y: 0.0 }}
            end={{ x: 0.5, y: 1.0 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top draggable area (controls open/close): only responds to drawer gesture when dragging "Visited Cities" and above */}
          <View {...panResponder.panHandlers}>
            {/* Drawer top: only drag handle (controls switch) */}
            <TouchableOpacity activeOpacity={0.9} onPress={toggleDrawer}>
              <View style={styles.drawerHandle} />
            </TouchableOpacity>

            {/* Map control button group (locate, zoom in, zoom out) */}
            <View style={styles.mapControlsContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.mapControlButton}
                onPress={() => {
                  if (lastPoint) {
                    setMapRegion((prev) => ({
                      ...prev,
                      latitude: lastPoint.latitude,
                      longitude: lastPoint.longitude,
                      latitudeDelta: 0.5,
                      longitudeDelta: 0.5,
                    }));
                  } else if (trajectoryCoordinates.length > 0) {
                    const p = trajectoryCoordinates[trajectoryCoordinates.length - 1];
                    setMapRegion((prev) => ({
                      ...prev,
                      latitude: p.latitude,
                      longitude: p.longitude,
                      latitudeDelta: 0.5,
                      longitudeDelta: 0.5,
                    }));
                  } else {
                    Alert.alert('Tip', 'No location points available yet. Please enable location tracking and try again.');
                  }
                }}>
                <Image
                  source={require('@/assets/icons/location/locate-target.png')}
                  style={[styles.mapControlIcon, { tintColor: '#007A8C' }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.mapControlButton}
                onPress={handleZoomIn}>
                <MaterialIcons name="add" size={20} color="#007A8C" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.mapControlButton}
                onPress={handleZoomOut}>
                <MaterialIcons name="remove" size={20} color="#007A8C" />
              </TouchableOpacity>
            </View>

            {/* Drawer content: upper part is stats + enable tracking, lower part is title */}
            <View style={styles.statsContainer}>
              {stats && (
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <ThemedText type="title" style={styles.statValue}>
                      {cities.length}
                    </ThemedText>
                    <ThemedText style={styles.statLabel}>Visited Cities</ThemedText>
                  </View>
                  <View style={styles.statCard}>
                    <ThemedText type="title" style={styles.statValue}>
                      {stats.totalProvinces}
                    </ThemedText>
                    <ThemedText style={styles.statLabel}>Visited Provinces</ThemedText>
                  </View>
                  <View style={styles.statCard}>
                    <ThemedText type="title" style={styles.statValue}>
                      {stats.trackingDays}
                    </ThemedText>
                    <ThemedText style={styles.statLabel}>Total Travel Days</ThemedText>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.trackingButton,
                  trackingEnabled && styles.trackingButtonActive,
                ]}
                onPress={handleToggleTracking}>
                <ThemedText
                  style={[
                    styles.trackingButtonText,
                    trackingEnabled && styles.trackingButtonTextActive,
                  ]}>
                  {trackingEnabled ? '✓ Location Tracking Enabled' : 'Enable Location Tracking'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Title area: placed below enable tracking button, can drag to expand/collapse drawer */}
            <View style={styles.drawerHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Visited Cities ({cities.length})
              </ThemedText>
              <ThemedText style={styles.drawerHint}>
                {drawerExpanded ? 'Swipe down to collapse' : 'Swipe up to expand'}
              </ThemedText>
            </View>
          </View>

          <ScrollView
            style={styles.drawerScroll}
            contentContainerStyle={styles.drawerContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {cities.length === 0 ? (
              <ThemedView style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>
                  No visit records yet{'\n'}After enabling location tracking, the system will automatically record your traces
                </ThemedText>
              </ThemedView>
            ) : (
              cities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[
                    styles.cityCard,
                    city.isLighted && styles.cityCardLighted,
                    selectedCity?.id === city.id && styles.cityCardSelected,
                  ]}
                  onPress={() => handleCityPress(city)}>
                  <View style={styles.cityInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.cityName}>
                      {city.cityName}
                    </ThemedText>
                    <ThemedText style={styles.provinceName}>
                      {city.provinceName}
                    </ThemedText>
                    <View style={styles.cityMeta}>
                      <ThemedText style={styles.cityMetaText}>
                        Visited {city.visitCount} times
                      </ThemedText>
                      <ThemedText style={styles.cityMetaText}>
                        • Stayed {city.totalStayHours.toFixed(1)} hours
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.visitDate}>
                      First visit: {new Date(city.firstVisitDate).toLocaleDateString('en-US')}
                    </ThemedText>
                  </View>
                  {city.isLighted && (
                    <View style={styles.lightBadge}>
                      <ThemedText style={styles.lightBadgeText}>✓</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullscreenMap: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    // Reserve space for bottom TabBar height to ensure "Enable Location Tracking" button is not blocked when collapsed
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 40,
    opacity: 0.6,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 28,
    marginBottom: 4,
    color: '#000000',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 8,
    opacity: 0.9,
    color: '#000000',
    textAlign: 'center',
  },
  trackingButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    marginBottom: 20,
  },
  trackingButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  trackingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackingButtonTextActive: {
    color: '#0a7ea4',
  },
  drawer: {
    width: '100%',
    backgroundColor: 'transparent',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'visible',
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  mapControlsContainer: {
    position: 'absolute',
    left: 24,
    top: -20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapControlButton: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Android shadow
    elevation: 5,
  },
  mapControlIcon: {
    width: 22,
    height: 22,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerHint: {
    fontSize: 12,
    opacity: 0.6,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 24,
  },
  cityCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cityCardLighted: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(10, 126, 164, 0.3)',
  },
  cityCardSelected: {
    borderColor: '#0a7ea4',
    borderWidth: 2,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 18,
    marginBottom: 4,
  },
  provinceName: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  cityMeta: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cityMetaText: {
    fontSize: 12,
    opacity: 0.6,
  },
  visitDate: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
  },
  lightBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  lightBadgeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
