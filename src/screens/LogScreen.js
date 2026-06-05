import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme, shadow } from '../theme'
import Pill from '../components/Pill'
import { readLog } from '../services/storage'

export default function LogScreen({ navigation }) {
  const [log, setLog] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => { setLog(await readLog()) }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => navigation.addListener('focus', load), [navigation, load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={S.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.green} />}
      >
        <Pressable onPress={() => navigation.goBack()} style={S.back} hitSlop={10}>
          <Text style={S.backTxt}>←</Text>
        </Pressable>
        <Text style={S.kicker}>Historial</Text>
        <Text style={S.title}>Mis sets</Text>

        {log.length === 0 ? (
          <View style={[S.card, { alignItems: 'center', paddingVertical: 40 }]}>
            <Text style={S.empty}>Aún no has grabado nada</Text>
            <Text style={S.emptyDim}>Empieza una sesión para ver tu historial aquí.</Text>
          </View>
        ) : (
          log.map((e) => (
            <View key={e.id} style={S.card}>
              <View style={S.row}>
                <View style={{ flex: 1 }}>
                  <Text style={S.name}>{e.exercise}</Text>
                  <Text style={S.dim}>W{e.week} · S{e.sessionN} · {formatDate(e.at)}</Text>
                </View>
                {e.rpeObtained != null && <Pill tone="red">RPE {e.rpeObtained}</Pill>}
              </View>
              <Text style={S.meta}>
                {e.sets}×{e.reps}  ·  <Text style={S.weight}>{e.weight}kg</Text>
                {e.rpeTarget ? <Text style={S.metaDim}>{`  ·  Target RPE ${e.rpeTarget}`}</Text> : null}
              </Text>
            </View>
          ))
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function formatDate(ms) {
  const d = new Date(ms)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 20, gap: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  backTxt: { color: theme.colors.text, fontSize: 26, fontWeight: '700' },
  kicker: { color: theme.colors.textDim, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', fontSize: 11 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '900', marginBottom: 12, letterSpacing: -0.5 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 16, gap: 8,
    ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { color: theme.colors.text, fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  meta: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  metaDim: { color: theme.colors.textDim, fontWeight: '500' },
  weight: { color: theme.colors.green, fontWeight: '900' },
  dim: { color: theme.colors.textDim, fontSize: 12, marginTop: 2, letterSpacing: 0.3 },
  empty: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  emptyDim: { color: theme.colors.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' },
})
