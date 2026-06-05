import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme, shadow } from '../theme'
import Pill from '../components/Pill'
import Button from '../components/Button'
import { getPlan } from '../services/sheets'
import { pickSessionForDay, weekOfMeso, dayLabel } from '../utils/dates'

export default function HomeScreen({ navigation }) {
  const [plan, setPlan] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async ({ force = false } = {}) => {
    const p = await getPlan({ force })
    setPlan(p)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => navigation.addListener('focus', () => load()), [navigation, load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load({ force: true })
    setRefreshing(false)
  }

  const today = new Date()
  const week = plan ? weekOfMeso(today, plan.meta.fecha_inicio) : 0
  const pick = plan ? pickSessionForDay(plan.sessions, today) : null
  const weeksOut = plan ? Math.max(0, Math.ceil((new Date(plan.meta.fecha_competicion) - today) / (1000*60*60*24*7))) : null

  if (!plan) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.center}><Text style={S.dim}>Cargando plan…</Text></View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={S.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.green} />}
      >
        {/* HEADER */}
        <View style={S.header}>
          <View style={{ flex: 1 }}>
            <Text style={S.greetingDim}>{dayLabel(today)}</Text>
            <Text style={S.greeting}>Hola, {plan.athlete.split(' ')[0]}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Settings')} style={S.gear} hitSlop={10}>
            <Text style={S.gearTxt}>⚙</Text>
          </Pressable>
        </View>

        {/* META STRIP */}
        <View style={S.metaStrip}>
          <View style={S.metaItem}>
            <Text style={S.metaNum}>{week}</Text>
            <Text style={S.metaLabel}>Semana</Text>
          </View>
          <View style={S.metaDivider} />
          <View style={S.metaItem}>
            <Text style={S.metaNum}>{plan.meta.duracion_semanas}</Text>
            <Text style={S.metaLabel}>Total</Text>
          </View>
          <View style={S.metaDivider} />
          <View style={S.metaItem}>
            <Text style={[S.metaNum, { color: theme.colors.green }]}>{weeksOut}</Text>
            <Text style={S.metaLabel}>Faltan</Text>
          </View>
        </View>

        {/* TODAY HERO CARD */}
        {pick?.match === 'today' ? (
          <View style={S.todayCard}>
            <View style={S.todayHead}>
              <Pill tone="red">Hoy</Pill>
              <Text style={S.todaySession}>S{pick.session.n}</Text>
            </View>
            <Text style={S.todayTitle}>{pick.session.label}</Text>
            <View style={S.exList}>
              {pick.session.exercises.slice(0, 4).map((ex, i) => (
                <View key={i} style={S.exRow}>
                  <View style={S.exBullet} />
                  <Text style={S.exTxt}>
                    <Text style={S.exName}>{ex.name}</Text>
                    <Text style={S.exDim}>  ·  {ex.sets}×{ex.reps} · RPE {ex.rpe}</Text>
                  </Text>
                </View>
              ))}
              {pick.session.exercises.length > 4 && (
                <Text style={S.exMore}>+ {pick.session.exercises.length - 4} más</Text>
              )}
            </View>
            <View style={{ height: 14 }} />
            <Button label="Empezar sesión" onPress={() => navigation.navigate('Session', { sessionN: pick.session.n, week })} />
          </View>
        ) : pick?.nextSession ? (
          <View style={[S.todayCard, S.restCard]}>
            <Pill tone="black">Descanso</Pill>
            <Text style={S.restTitle}>Hoy es día libre</Text>
            <Text style={S.dim}>Siguiente: {pick.nextSession.day} — {pick.nextSession.label}</Text>
            <View style={{ height: 14 }} />
            <Button label="Ver siguiente sesión" variant="black" onPress={() => navigation.navigate('Session', { sessionN: pick.nextSession.n, week })} />
          </View>
        ) : null}

        {/* WEEK PLAN */}
        <Text style={S.sectionTitle}>Tu semana</Text>
        <View style={{ gap: 10 }}>
          {plan.sessions.map((s) => {
            const isToday = pick?.match === 'today' && pick.session.n === s.n
            return (
              <Pressable
                key={s.n}
                style={({ pressed }) => [S.dayCard, pressed && { opacity: 0.65 }, isToday && S.dayCardToday]}
                onPress={() => navigation.navigate('Session', { sessionN: s.n, week })}
              >
                <View style={S.dayCardLeft}>
                  <Text style={[S.dayNum, isToday && { color: theme.colors.green }]}>S{s.n}</Text>
                  <View style={S.dayDivider} />
                  <View>
                    <Text style={S.dayName}>{s.day}</Text>
                    <Text style={S.dayLabel} numberOfLines={1}>{s.label}</Text>
                  </View>
                </View>
                <Text style={S.dayChev}>›</Text>
              </Pressable>
            )
          })}
        </View>

        <View style={{ height: 12 }} />

        {/* QUICK ACTIONS */}
        <View style={S.quickRow}>
          <View style={{ flex: 1 }}>
            <Button label="Calculadora RPE" variant="ghost" onPress={() => navigation.navigate('Rpe')} />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <Button label="Historial" variant="ghost" onPress={() => navigation.navigate('Log')} />
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 20, gap: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetingDim: { color: theme.colors.textDim, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  greeting: { color: theme.colors.text, fontSize: 28, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
  gear: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg2, borderWidth: 1, borderColor: theme.colors.border },
  gearTxt: { color: theme.colors.text, fontSize: 18 },

  metaStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.bg2,
    borderRadius: theme.radius.lg,
    paddingVertical: 14, paddingHorizontal: 6,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaNum: { color: theme.colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  metaLabel: { color: theme.colors.textDim, fontSize: 10, marginTop: 2, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  metaDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },

  todayCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 2, borderColor: theme.colors.text,
    padding: 22,
    ...shadow.cardStrong,
  },
  restCard: { borderColor: theme.colors.border, borderWidth: 1 },
  todayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todaySession: { color: theme.colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  todayTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '900', marginTop: 10, letterSpacing: -0.5 },
  restTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '900', marginTop: 10, letterSpacing: -0.5 },

  exList: { marginTop: 14, gap: 8 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exBullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.colors.green },
  exTxt: { color: theme.colors.text, fontSize: 14, flex: 1 },
  exName: { fontWeight: '700' },
  exDim: { color: theme.colors.textDim },
  exMore: { color: theme.colors.textDim, fontSize: 12, marginTop: 2, marginLeft: 15 },

  sectionTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 6 },

  dayCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.border,
    paddingVertical: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  dayCardToday: { borderColor: theme.colors.green, borderWidth: 1.5 },
  dayCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  dayNum: { color: theme.colors.text, fontSize: 18, fontWeight: '900', width: 32 },
  dayDivider: { width: 1, height: 32, backgroundColor: theme.colors.border },
  dayName: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  dayLabel: { color: theme.colors.textDim, fontSize: 12, marginTop: 2 },
  dayChev: { color: theme.colors.textDim, fontSize: 24, fontWeight: '300' },

  quickRow: { flexDirection: 'row' },

  dim: { color: theme.colors.textDim, fontSize: 14 },
})
