import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors } from '../theme/colors';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
}

export const GlassCard = ({ children, style, ...props }: GlassCardProps) => {
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glassBackground,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    // Elevation for Android
    elevation: 8,
  },
});
