import { Pressable, Text, View, StyleSheet } from 'react-native'
import { theme, shadow } from '../theme'

export default function Button({ label, onPress, variant = 'primary', icon, disabled, style }) {
  const styles = variant === 'primary' ? S.primary : variant === 'ghost' ? S.ghost : variant === 'black' ? S.black : S.danger
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        S.base,
        styles.bg,
        pressed && S.pressed,
        disabled && S.disabled,
        style,
      ]}
    >
      {icon ? <View style={S.icon}>{icon}</View> : null}
      <Text style={[S.label, styles.label]}>{label}</Text>
    </Pressable>
  )
}

const S = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 24,
    borderRadius: theme.radius.md,
    gap: 10,
    minHeight: 52,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  disabled: { opacity: 0.35 },
  icon: {},
  label: { fontWeight: '800', fontSize: 15, letterSpacing: 0.8 },
  primary: {
    bg: { backgroundColor: theme.colors.green, ...shadow.glow },
    label: { color: '#ffffff' },
  },
  ghost: {
    bg: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.text },
    label: { color: theme.colors.text },
  },
  black: {
    bg: { backgroundColor: theme.colors.text },
    label: { color: '#ffffff' },
  },
  danger: {
    bg: { backgroundColor: theme.colors.red, ...shadow.glow },
    label: { color: '#ffffff' },
  },
})
