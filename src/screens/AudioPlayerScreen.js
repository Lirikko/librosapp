import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Text, IconButton, useTheme, ActivityIndicator, FAB, Button } from 'react-native-paper';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');

export default function AudioPlayerScreen({ route, navigation }) {
  const { book } = route.params;
  const theme = useTheme();
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = `audio_progress_${book.id}`;

  useEffect(() => {
    loadAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  async function loadAudio() {
    try {
      setLoading(true);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: book.localUri || book.uri },
        { shouldPlay: false, rate: rate, shouldCorrectPitch: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      
      const savedPosition = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedPosition) {
        await newSound.setPositionAsync(parseInt(savedPosition, 10));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading audio', error);
      setLoading(false);
    }
  }

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        AsyncStorage.removeItem(STORAGE_KEY);
      } else if (status.positionMillis % 5000 < 500) {
        AsyncStorage.setItem(STORAGE_KEY, status.positionMillis.toString());
      }
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleSeek = async (value) => {
    if (sound) {
      await sound.setPositionAsync(value);
    }
  };

  const handleRateChange = async () => {
    const nextRate = rate >= 2.0 ? 0.5 : rate + 0.25;
    setRate(nextRate);
    if (sound) {
      await sound.setRateAsync(nextRate, true);
    }
  };

  const formatTime = (millis) => {
    if (!millis || millis < 0) return "0:00";
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <IconButton 
          icon="chevron-down" 
          size={30} 
          onPress={() => navigation.goBack()} 
        />
        <Text variant="titleMedium">Reproduciendo</Text>
        <IconButton icon="dots-vertical" size={24} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.artworkContainer}>
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.placeholderArtwork]}>
              <IconButton icon="headphones" size={100} iconColor="#333" />
            </View>
          )}
        </View>

        <Text variant="headlineSmall" style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text variant="titleMedium" style={styles.author}>{book.authors?.[0]?.name || 'Autor Desconocido'}</Text>

        {loading ? (
            <ActivityIndicator style={styles.loader} size="large" />
        ) : (
            <View style={styles.controls}>
                <View style={styles.sliderContainer}>
                    <Text variant="labelSmall" style={styles.timeLabel}>{formatTime(position)}</Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={duration || 1}
                        value={position}
                        onSlidingComplete={handleSeek}
                        minimumTrackTintColor="#FF9800"
                        maximumTrackTintColor="rgba(255,255,255,0.2)"
                        thumbTintColor="#FF9800"
                    />
                    <Text variant="labelSmall" style={styles.timeLabel}>{formatTime(duration)}</Text>
                </View>

                <View style={styles.mainControls}>
                    <IconButton icon="rewind-15" size={40} onPress={() => handleSeek(Math.max(0, position - 15000))} />
                    <FAB
                        icon={isPlaying ? "pause" : "play"}
                        style={styles.playButton}
                        onPress={handlePlayPause}
                        color="white"
                    />
                    <IconButton icon="fast-forward-15" size={40} onPress={() => handleSeek(Math.min(duration, position + 15000))} />
                </View>

                <View style={styles.secondaryControls}>
                    <Button 
                      mode="outlined" 
                      compact 
                      onPress={handleRateChange}
                      style={{ borderColor: theme.colors.primary }}
                    >
                        {rate}x Velocidad
                    </Button>
                </View>
            </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 10
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  artworkContainer: {
    width: width * 0.7,
    height: width * 0.7,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  artwork: { width: '100%', height: '100%' },
  placeholderArtwork: { backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center' },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 5 },
  author: { opacity: 0.6, marginBottom: 30 },
  controls: { width: '100%' },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 10 },
  slider: { flex: 1, height: 40 },
  timeLabel: { width: 45, textAlign: 'center', opacity: 0.7 },
  mainControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  playButton: { backgroundColor: '#FF9800', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  secondaryControls: { alignItems: 'center' },
  loader: { marginTop: 40 }
});
