import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export const Skeleton = ({ width, height, borderRadius = 4, style }) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.isV3 ? theme.colors.surfaceVariant : '#444',
          opacity,
        },
        style,
      ]}
    />
  );
};

export const CardSkeleton = () => {
    return (
        <View style={styles.cardSkeleton}>
            <Skeleton width={60} height={90} borderRadius={4} />
            <View style={styles.cardInfo}>
                <Skeleton width="80%" height={20} style={{ marginBottom: 10 }} />
                <Skeleton width="40%" height={15} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardSkeleton: {
        flexDirection: 'row',
        padding: 10,
        marginBottom: 12,
        backgroundColor: 'transparent',
    },
    cardInfo: {
        marginLeft: 15,
        flex: 1,
        justifyContent: 'center'
    }
});
