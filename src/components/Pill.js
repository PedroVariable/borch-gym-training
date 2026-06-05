import { Text, View, StyleSheet } from 'react-native'
import { theme } from '../theme'

export default function Pill({ children, tone = 'red' }) {
  const map = {
    red:   { bg: '#fee2e3', border: theme.colors.green, text: theme.colors.greenDeep },
    black: { bg: '#0a0a0a', border: '#0a0a0a', text: '#ffffff' },
    gold:  { bg: '#f1f1f3', border: '#0a0a0a', text: '#0a0a0a' },
    green: { bg: '#fee2e3', border: theme.colors.green, text: theme.colors.greenDeep },
  }
  const c = map[tone] || map.red
  return (
    <View style={[S.box, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[S.txt, { color: c.text }]}>{children}</Text>
    </View>
  )
}
const S = StyleSheet.create({
  box: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  txt: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
})
