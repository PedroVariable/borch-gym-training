import { useMemo, useState, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme, shadow } from '../theme'
import Pill from '../components/Pill'
import { calculate } from '../utils/rpe'

const RPE_OPTS = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5]
const REP_OPTS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15]

export default function RpeCalculatorScreen({ navigation, route }) {
  const prefillReps = route?.params?.prefillReps
  const prefillRpe  = route?.params?.prefillRpe
  const exerciseName = route?.params?.exerciseName

  const [prevWeight, setPrevWeight] = useState('')
  const [prevReps, setPrevReps]     = useState(4)
  const [prevRpe, setPrevRpe]       = useState(8)
  const [targetReps, setTargetReps] = useState(prefillReps && REP_OPTS.includes(prefillReps) ? prefillReps : 4)
  const [targetRpe, setTargetRpe]   = useState(typeof prefillRpe === 'number' && RPE_OPTS.includes(prefillRpe) ? prefillRpe : 7)

  const out = useMemo(() => {
    const w = parseFloat(prevWeight)
    if (!w) return null
    return calculate({ prevWeight: w, prevReps, prevRpe, targetReps, targetRpe })
  }, [prevWeight, prevReps, prevRpe, targetReps, targetRpe])

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView contentContainerStyle={S.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={S.back} hitSlop={10}>
          <Text style={S.backTxt}>←</Text>
        </Pressable>

        <Text style={S.kicker}>Calculadora RPE</Text>
        <Text style={S.title}>¿Cuánto va el siguiente set?</Text>

        {exerciseName && (
          <View style={S.contextStrip}>
            <Pill tone="black">Para</Pill>
            <Text style={S.contextTxt}>{exerciseName}</Text>
          </View>
        )}

        {/* RESULT (top — most visible) */}
        <View style={[S.resultCard, !out && S.resultCardEmpty]}>
          {out ? (
            <>
              <Text style={S.resultKicker}>Te toca</Text>
              <Text style={S.resultWeight}>{out.suggested}<Text style={S.resultUnit}>kg</Text></Text>
              <Text style={S.resultSub}>1RM estimado: {Math.round(out.estimatedOneRm)} kg</Text>
            </>
          ) : (
            <Text style={S.resultEmpty}>Llena tu set anterior abajo para ver el peso sugerido</Text>
          )}
        </View>

        {/* PREVIOUS SET */}
        <View style={S.card}>
          <Pill tone="black">Tu set anterior</Pill>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={S.label}>Peso (kg)</Text>
              <TextInput style={S.inputBig} keyboardType="numeric" value={prevWeight} onChangeText={setPrevWeight} placeholder="150" placeholderTextColor={theme.colors.textMuted} />
            </View>
          </View>

          <Text style={S.label}>Reps que hiciste</Text>
          <Picker options={REP_OPTS} value={prevReps} onChange={setPrevReps} />

          <Text style={S.label}>RPE que sentiste</Text>
          <Picker options={RPE_OPTS} value={prevRpe} onChange={setPrevRpe} />
        </View>

        {/* TARGET */}
        <View style={S.card}>
          <Pill>Tu siguiente set</Pill>
          <Text style={S.label}>Reps objetivo</Text>
          <Picker options={REP_OPTS} value={targetReps} onChange={setTargetReps} />

          <Text style={S.label}>RPE objetivo</Text>
          <Picker options={RPE_OPTS} value={targetRpe} onChange={setTargetRpe} />
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function Picker({ options, value, onChange }) {
  return (
    <View style={S.pickerRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {options.map((o) => {
          const active = o === value
          return (
            <Pressable key={o} onPress={() => onChange(o)} style={[S.chip, active && S.chipActive]}>
              <Text style={[S.chipTxt, active && S.chipTxtActive]}>{o}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 20, gap: 14 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  backTxt: { color: theme.colors.text, fontSize: 26, fontWeight: '700' },
  kicker: { color: theme.colors.textDim, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', fontSize: 11 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
  contextStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  contextTxt: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },

  resultCard: {
    backgroundColor: theme.colors.green,
    borderRadius: theme.radius.xl,
    padding: 24, alignItems: 'center',
    ...shadow.glow,
    marginTop: 8,
  },
  resultCardEmpty: { backgroundColor: theme.colors.bg2, ...shadow.card },
  resultKicker: { color: '#ffffff', fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', fontSize: 11, opacity: 0.9 },
  resultWeight: { color: '#ffffff', fontSize: 72, fontWeight: '900', letterSpacing: -2, marginTop: 4 },
  resultUnit: { fontSize: 32, color: '#ffffff', opacity: 0.85, fontWeight: '800', letterSpacing: -1 },
  resultSub: { color: '#ffffff', fontSize: 13, fontWeight: '600', opacity: 0.9, marginTop: 4 },
  resultEmpty: { color: theme.colors.textDim, fontSize: 14, textAlign: 'center', fontWeight: '600' },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 16, gap: 8,
    ...shadow.card,
  },
  label: { color: theme.colors.textDim, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', textTransform: 'uppercase', marginTop: 10 },
  inputBig: {
    backgroundColor: theme.colors.bg2,
    borderWidth: 1.5, borderColor: theme.colors.border,
    color: theme.colors.text, fontSize: 24, fontWeight: '900',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: theme.radius.md,
    letterSpacing: -0.5,
  },
  row: { flexDirection: 'row' },
  pickerRow: { marginTop: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: theme.colors.bg2, borderWidth: 1.5, borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  chipTxt: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  chipTxtActive: { color: '#ffffff' },
})
