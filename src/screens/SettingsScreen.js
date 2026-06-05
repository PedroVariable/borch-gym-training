import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Updates from 'expo-updates'
import { theme, shadow } from '../theme'
import Button from '../components/Button'
import Pill from '../components/Pill'
import { readPrefs, savePrefs } from '../services/storage'

export default function SettingsScreen({ navigation }) {
  const [csvUrl, setCsvUrl]         = useState('')
  const [coachPhone, setCoachPhone] = useState('')
  const [checking, setChecking]     = useState(false)

  useEffect(() => { readPrefs().then((p) => { setCsvUrl(p.csvUrl); setCoachPhone(p.coachPhone) }) }, [])

  const saveCoach = async () => {
    if (coachPhone && !/^\d{10,15}$/.test(coachPhone)) {
      Alert.alert('Teléfono no válido', 'Usa solo dígitos con código de país. Ej: 5214771234567')
      return
    }
    await savePrefs({ coachPhone })
    Alert.alert('Guardado', coachPhone ? `Coach: +${coachPhone}` : 'Coach removido')
  }

  const onChangeUrl = () => navigation.navigate('Setup', { editing: true, currentUrl: csvUrl })

  const onCheckUpdates = async () => {
    setChecking(true)
    try {
      const r = await Updates.checkForUpdateAsync()
      if (r.isAvailable) {
        await Updates.fetchUpdateAsync()
        Alert.alert(
          'Actualización lista',
          'Hay una nueva versión. ¿Recargar ahora?',
          [{ text: 'Después' }, { text: 'Recargar', onPress: () => Updates.reloadAsync() }]
        )
      } else {
        Alert.alert('Estás al día', 'No hay actualizaciones pendientes.')
      }
    } catch (err) {
      Alert.alert('No se pudo revisar', err?.message || 'Error de red')
    }
    setChecking(false)
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView contentContainerStyle={S.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={S.back}>
          <Text style={S.backTxt}>‹ Volver</Text>
        </Pressable>
        <Text style={S.kicker}>Ajustes</Text>
        <Text style={S.title}>Tu cuenta</Text>

        <View style={S.card}>
          <Pill tone="gold">Plan</Pill>
          <Text style={S.label}>Google Sheet conectado</Text>
          {csvUrl ? (
            <Text style={S.urlTxt} numberOfLines={2}>{csvUrl}</Text>
          ) : (
            <Text style={S.dim}>Sin URL — usando plan de ejemplo (mi meso)</Text>
          )}
          <View style={{ height: 8 }} />
          <Button label={csvUrl ? 'Cambiar URL' : 'Conectar mi Sheet'} variant="ghost" onPress={onChangeUrl} />
        </View>

        <View style={S.card}>
          <Pill>Coach</Pill>
          <Text style={S.label}>WhatsApp del coach</Text>
          <Text style={S.dim}>Código de país + número. Sin '+'. Ej: 5214771234567</Text>
          <TextInput
            style={S.input}
            keyboardType="number-pad"
            value={coachPhone}
            onChangeText={setCoachPhone}
            placeholder="52..."
            placeholderTextColor={theme.colors.textDim}
          />
          <View style={{ height: 8 }} />
          <Button label="Guardar coach" variant="ghost" onPress={saveCoach} />
        </View>

        <View style={S.card}>
          <Pill>App</Pill>
          <Text style={S.label}>Actualizaciones</Text>
          <Text style={S.dim}>Revisar si hay una versión nueva de la app.</Text>
          <View style={{ height: 8 }} />
          <Button label={checking ? 'Revisando…' : '🔄 Buscar actualización'} variant="ghost" onPress={onCheckUpdates} disabled={checking} />
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 18, gap: 14 },
  back: { paddingVertical: 4 },
  backTxt: { color: theme.colors.green, fontSize: 16, fontWeight: '700' },
  kicker: { color: theme.colors.gold, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', fontSize: 11 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900', marginBottom: 6 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 14, gap: 6,
    ...shadow.card,
  },
  label: { color: theme.colors.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: '800', textTransform: 'uppercase', marginTop: 6 },
  dim: { color: theme.colors.textDim, fontSize: 12 },
  urlTxt: { color: theme.colors.text, fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1, borderColor: theme.colors.border,
    color: theme.colors.text, fontSize: 16, fontWeight: '700',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: theme.radius.md,
    marginTop: 4,
  },
})
