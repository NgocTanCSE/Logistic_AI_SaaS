import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface NeonButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const NeonButton = ({ title, loading, variant = 'primary', style, disabled, ...props }: NeonButtonProps) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'secondary': return colors.surfaceMuted;
      case 'danger': return colors.error + '33'; // 20% opacity
      default: return colors.primary + '33'; // 20% opacity
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'secondary': return colors.border;
      case 'danger': return colors.error;
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'secondary': return colors.text;
      case 'danger': return colors.error;
      default: return colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor(), borderColor: getBorderColor() },
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, typography.button, { color: getTextColor() }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
