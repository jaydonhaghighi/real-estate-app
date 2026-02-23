import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface CardProps extends PropsWithChildren {
  tone?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, tone = 'light', style }: CardProps): JSX.Element {
  return <View style={[styles.base, tone === 'dark' ? styles.dark : styles.light, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#040915',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  light: {
    backgroundColor: '#F7F9FC',
    borderColor: '#D4DEEE'
  },
  dark: {
    backgroundColor: '#101A2E',
    borderColor: '#213452'
  }
});
