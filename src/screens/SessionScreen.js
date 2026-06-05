import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme, shadow } from '../theme'
import Button from '../components/Button'
import Pill from '../components/Pill'
import { getPlan } from '../services/sheets'
import { lastSetFor } from '../services/storage'
import { calculate } from '../utils/rpe'

export default function SessionScreen({ route, navigation }) {
  const { sessionN, week } = route.params
  const [plan, setPlan] = useState(null)

  useEffect(() => { getPlan().then(setPlan) }, [])

  if (!plan) {
    return <SafeAreaView style={S.safe}><View style={S.center}><Text style={S.dim}>Cargando…</Text></View></SafeAreaView>
  }
  const session = plan.sessions.find((s) => s.n === sessionN)
  if (!session) {
    return <SafeAreaView style={S.safe}><View style={S.center}><Text style={S.dim}>Sesión no encontrada.</Text></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView contentContainerStyle={S.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={S.back} hitSlop={10}>
          <Text style={S.backTxt}>←</Text>
        </Pressable>

        <View style={S.header}>
          <View style={S.headerLine}>
            <Pill tone="black">{`W${week}  ·  S${session.n}`}</Pill>
            <Text style={S.day}>{session.day}</Text>
          </View>
          <Text style={S.title}>{session.label}</Text>
        </View>

        {session.exercises.map((ex, i) => (
          <ExerciseCard
            key={i}
            exercise={ex}
            week={week}
            sessionN={session.n}
            onRecord={(weight, repNumber) =>
              navigation.navigate('Record', { week, sessionN: session.n, exercise: ex, weight, repNumber })
            }
            onCalculate={() => navigation.navigate('Rpe', { prefillReps: ex.reps, prefillRpe: ex.rpe, exerciseName: ex.name })}
          />
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function ExerciseCard({ exercise, week, sessionN, onRecord, onCalculate }) {
  const [weight, setWeight] = useState('')
  const [source, setSource] = useState(null) // 'coach' | 'log' | 'manual'
  const [repCount, setRepCount] = useState(1)

  const prescribedWeight = pickPrescribedWeight(exercise, week)

  useEffect(() => {
    if (prescribedWeight) {
      setWeight(String(prescribedWeight))
      setSource('coach')
      return
    }
    ;(async () => {
      const prev = await lastSetFor(exercise.name)
      if (prev?.weight && prev?.reps && prev?.rpeObtained) {
        const targetRpe = typeof exercise.rpe === 'number' ? exercise.rpe : 7
        const c = calculate({
          prevWeight: prev.weight, prevReps: prev.reps, prevRpe: prev.rpeObtained,
          targetReps: exercise.reps || 5, targetRpe,
        })
        setWeight(String(c.suggested))
        setSource('log')
      }
    })()
  }, [exercise, week, prescribedWeight])

  const onTapRecord = () => {
    const w = parseFloat(weight)
    if (!w || w <= 0) {
      Alert.alert('Falta peso', 'Pon el peso primero para que la descripción salga completa.')
      return
    }
    onRecord(w, repCount)
  }

  const onTapWeightChange = (v) => {
    setWeight(v)
    if (source !== 'manual') setSource('manual')
  }

  const tipo = exercise.tipo || ''
  const tipoBadge = tipo.includes('Top') ? 'TOP SET' : tipo.includes('Backdown') ? 'BACKDOWN' : tipo.includes('Multi') ? 'COMPUESTO' : tipo.includes('Aislado') ? 'AISLADO' : tipo.toUpperCase()

  return (
    <View style={S.exCard}>
      {/* Title row */}
      <View style={S.exHead}>
        <View style={{ flex: 1 }}>
          <Text style={S.exName}>{exercise.name}</Text>
          <Text style={S.exTag}>{tipoBadge}</Text>
        </View>
        <View style={S.exTargetBox}>
          <Text style={S.exTargetTxt}>{exercise.sets}<Text style={S.exTargetTxtSmall}>×</Text>{exercise.reps}</Text>
          <Text style={S.exTargetSub}>RPE {exercise.rpe}</Text>
        </View>
      </View>

      {/* Weight section */}
      <View style={S.weightSection}>
        <View style={{ flex: 1 }}>
          <Text style={S.label}>Peso (kg)</Text>
          <TextInput
            style={S.input}
            keyboardType="numeric"
            value={weight}
            onChangeText={onTapWeightChange}
            placeholder="— —"
            placeholderTextColor={theme.colors.textMuted}
          />
          <SourceHint source={source} />
        </View>
        <View style={{ width: 14 }} />
        <View style={S.repCol}>
          <Text style={S.label}>Rep #</Text>
          <View style={S.repStepper}>
            <Pressable onPress={() => setRepCount((n) => Math.max(1, n - 1))} style={S.repBtn} hitSlop={6}><Text style={S.repBtnTxt}>−</Text></Pressable>
            <Text style={S.repNum}>{repCount}</Text>
            <Pressable onPress={() => setRepCount((n) => n + 1)} style={S.repBtn} hitSlop={6}><Text style={S.repBtnTxt}>+</Text></Pressable>
          </View>
        </View>
      </View>

      {/* "Calculate weight" CTA — only when no coach weight */}
      {source !== 'coach' && (
        <Pressable onPress={onCalculate} style={S.calcBtn}>
          <Text style={S.calcTxt}>🧮  Calcular con RPE</Text>
          <Text style={S.calcChev}>›</Text>
        </Pressable>
      )}

      <Button label="🎥  Grabar rep" onPress={onTapRecord} />
    </View>
  )
}

function SourceHint({ source }) {
  if (!source) return null
  const msg = {
    coach:  '✓  Peso del coach',
    log:    '↳  Sugerido por tu último set',
    manual: '↳  Peso manual',
  }[source]
  const color = source === 'coach' ? theme.colors.green : theme.colors.textDim
  return <Text style={[S.hint, { color }]}>{msg}</Text>
}

function pickPrescribedWeight(exercise, week) {
  if (exercise.peso_sugerido) return exercise.peso_sugerido
  if (week === 1 && exercise.peso_w1) return exercise.peso_w1
  return null
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8, marginBottom: 4 },
  backTxt: { color: theme.colors.text, fontSize: 26, fontWeight: '700' },

  header: { marginBottom: 6 },
  headerLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  day: { color: theme.colors.textDim, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 },

  exCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 18,
    ...shadow.card,
  },
  exHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  exName: { color: theme.colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  exTag: { color: theme.colors.textDim, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 4 },
  exTargetBox: {
    backgroundColor: theme.colors.bg2,
    borderRadius: theme.radius.md,
    paddingVertical: 8, paddingHorizontal: 12,
    alignItems: 'center', minWidth: 78,
  },
  exTargetTxt: { color: theme.colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  exTargetTxtSmall: { fontSize: 14, color: theme.colors.textDim, fontWeight: '700' },
  exTargetSub: { color: theme.colors.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 2 },

  weightSection: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  label: { color: theme.colors.textDim, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.bg2,
    borderWidth: 1.5, borderColor: theme.colors.border,
    color: theme.colors.text, fontSize: 22, fontWeight: '900',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: theme.radius.md,
    letterSpacing: -0.5,
  },
  hint: { fontSize: 11, fontWeight: '600', marginTop: 6 },

  repCol: { width: 110 },
  repStepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: 4, paddingVertical: 6, backgroundColor: theme.colors.bg2,
  },
  repBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  repBtnTxt: { color: theme.colors.text, fontSize: 22, fontWeight: '900' },
  repNum: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },

  calcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff5f5',
    borderWidth: 1, borderColor: '#ffd5d6',
    borderRadius: theme.radius.md,
    paddingVertical: 12, paddingHorizontal: 14,
    marginBottom: 12,
  },
  calcTxt: { color: theme.colors.greenDeep, fontWeight: '800', fontSize: 14 },
  calcChev: { color: theme.colors.greenDeep, fontSize: 18, fontWeight: '700' },

  dim: { color: theme.colors.textDim, fontSize: 13 },
})
