import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Linking, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { theme, shadow } from '../theme'
import Button from '../components/Button'
import Pill from '../components/Pill'
import { savePrefs } from '../services/storage'
import { validateCsvUrl } from '../services/sheets'

export default function SetupScreen({ navigation, route }) {
  const editing = route?.params?.editing === true
  const [url, setUrl] = useState(route?.params?.currentUrl || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const onPaste = async () => {
    const v = await Clipboard.getStringAsync()
    if (v) setUrl(v.trim())
  }

  const onTest = async () => {
    setTesting(true)
    setTestResult(null)
    const r = await validateCsvUrl(url.trim())
    setTesting(false)
    setTestResult(r)
  }

  const onSave = async () => {
    if (!testResult?.ok) {
      const r = await onTest()
      if (!r?.ok) return
    }
    await savePrefs({ csvUrl: url.trim() })
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
  }

  const onUseBundled = async () => {
    await savePrefs({ csvUrl: '' })
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">
        {editing && (
          <Pressable onPress={() => navigation.goBack()} style={S.back}>
            <Text style={S.backTxt}>‹ Volver</Text>
          </Pressable>
        )}

        <View style={S.hero}>
          <Text style={S.kicker}>Conecta tu plan</Text>
          <Text style={S.title}>Pega la URL de tu Google Sheet</Text>
          <Text style={S.dim}>
            La app jala las sesiones, pesos y RPE de tu plan en vivo. Cuando tu coach
            actualice el Sheet, los cambios aparecen al refrescar.
          </Text>
        </View>

        {/* Steps */}
        <View style={S.steps}>
          <Step n={1} title="Sube tu Excel a Google Drive y ábrelo con Google Sheets.">
            <Pressable onPress={() => Linking.openURL('https://drive.google.com')}>
              <Text style={S.link}>drive.google.com →</Text>
            </Pressable>
          </Step>
          <Step n={2} title='Archivo → Compartir → "Publicar en la web"' />
          <Step n={3} title='Elige hoja "Meso" y formato CSV. Click "Publicar".' />
          <Step n={4} title="Copia la URL larga y pégala aquí." />
        </View>

        {/* URL input */}
        <View style={S.card}>
          <Text style={S.label}>URL pública del Sheet</Text>
          <TextInput
            style={S.input}
            placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?gid=...&output=csv"
            placeholderTextColor={theme.colors.textDim}
            value={url}
            onChangeText={(v) => { setUrl(v); setTestResult(null) }}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <View style={{ height: 8 }} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Button label="📋 Pegar" variant="ghost" onPress={onPaste} />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Button label={testing ? 'Probando…' : 'Probar conexión'} variant="ghost" onPress={onTest} disabled={!url || testing} />
            </View>
          </View>

          {testing && (
            <View style={[S.row, { marginTop: 14, alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator color={theme.colors.green} />
              <View style={{ width: 8 }} />
              <Text style={S.dim}>Leyendo tu Sheet…</Text>
            </View>
          )}

          {testResult && testResult.ok && (
            <View style={[S.testBox, S.testOk]}>
              <Pill>Conectado ✓</Pill>
              <Text style={S.testTxt}>
                Encontré {testResult.sessionsCount} sesiones y {testResult.exercisesCount} ejercicios.
              </Text>
            </View>
          )}

          {testResult && !testResult.ok && (
            <View style={[S.testBox, S.testFail]}>
              <Pill tone="gold">No se pudo</Pill>
              <Text style={S.testTxt}>{testResult.reason}</Text>
            </View>
          )}
        </View>

        <Button label={testResult?.ok ? 'Guardar y entrar' : 'Probar y guardar'} onPress={onSave} disabled={!url} />
        <View style={{ height: 10 }} />
        {!editing && (
          <Pressable onPress={onUseBundled}>
            <Text style={S.skipTxt}>Usar plan de ejemplo (mi mesociclo de Pedro)</Text>
          </Pressable>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function Step({ n, title, children }) {
  return (
    <View style={S.step}>
      <View style={S.stepNum}><Text style={S.stepNumTxt}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={S.stepTitle}>{title}</Text>
        {children}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 18, gap: 16 },
  back: { paddingVertical: 4 },
  backTxt: { color: theme.colors.green, fontSize: 16, fontWeight: '700' },

  hero: { marginTop: 6, marginBottom: 4 },
  kicker: { color: theme.colors.gold, fontWeight: '800', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '900', marginTop: 6 },
  dim: { color: theme.colors.textDim, fontSize: 13, marginTop: 10 },

  steps: { gap: 12 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: theme.colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumTxt: { color: '#041204', fontWeight: '900', fontSize: 13 },
  stepTitle: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },
  link: { color: theme.colors.green, fontWeight: '700', marginTop: 4 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 14, gap: 6,
    ...shadow.card,
  },
  label: { color: theme.colors.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: '800', textTransform: 'uppercase' },
  input: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1, borderColor: theme.colors.border,
    color: theme.colors.text, fontSize: 14,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: theme.radius.md,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row' },

  testBox: { marginTop: 14, padding: 12, borderRadius: theme.radius.md, gap: 8 },
  testOk:  { backgroundColor: 'rgba(43, 232, 43, 0.08)', borderWidth: 1, borderColor: theme.colors.borderStrong },
  testFail:{ backgroundColor: 'rgba(212, 162, 58, 0.08)', borderWidth: 1, borderColor: 'rgba(212, 162, 58, 0.5)' },
  testTxt: { color: theme.colors.text, fontSize: 13 },

  skipTxt: { color: theme.colors.textDim, textAlign: 'center', textDecorationLine: 'underline', fontSize: 13 },
})
