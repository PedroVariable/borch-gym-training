import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, Pressable, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useVideoPlayer, VideoView } from 'expo-video'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import * as Linking from 'expo-linking'
import * as MediaLibrary from 'expo-media-library'
import { theme, shadow } from '../theme'
import Button from '../components/Button'
import Pill from '../components/Pill'
import { appendSet, readPrefs } from '../services/storage'

// Trim lib — only available in dev/preview/production builds (not Expo Go).
let videoTrim = null
try { videoTrim = require('react-native-video-trim') } catch {}

export default function PostRecordScreen({ route, navigation }) {
  const { videoUri: initialUri, caption, week, sessionN, exercise, weight, repNumber } = route.params

  const [videoUri, setVideoUri] = useState(initialUri)
  const [trimming, setTrimming] = useState(false)
  const [reps, setReps] = useState(String(exercise.reps || ''))
  const [rpe, setRpe]   = useState(typeof exercise.rpe === 'number' ? String(exercise.rpe) : '')
  const [coachPhone, setCoachPhone] = useState('')
  const [saved, setSaved] = useState(false)

  const player = useVideoPlayer(videoUri, (p) => { p.loop = false; p.muted = false })

  useEffect(() => { readPrefs().then((p) => setCoachPhone(p.coachPhone || '')) }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync()
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(initialUri)
          setSaved(true)
        }
      } catch {}
    })()
  }, [initialUri])

  const finalCaption = () => {
    const r = parseInt(reps) || 0
    const obtainedRpe = parseFloat(rpe) || null
    let cap = caption
    if (r) cap = cap.replace(/REP \d+/, `RX ${r}`)
    if (obtainedRpe) cap += ` (RPE obtenido ${obtainedRpe})`
    return cap
  }

  const logIt = async () => {
    await appendSet({
      week, sessionN,
      exercise: exercise.name,
      sets: exercise.sets, reps: parseInt(reps) || exercise.reps,
      weight, rpeTarget: exercise.rpe,
      rpeObtained: parseFloat(rpe) || null,
      videoUri,
    })
  }

  const onTrim = async () => {
    if (!videoTrim || !videoTrim.showEditor) {
      Alert.alert(
        'Trim solo en build nativa',
        'El recortador no está disponible en Expo Go. Funcionará después de hacer "eas build". Mientras, recorta dentro de WhatsApp después de adjuntar.'
      )
      return
    }
    try {
      setTrimming(true)
      const result = await videoTrim.showEditor(videoUri, {
        maxDuration: 120,
        saveToPhoto: false,
        cancelButtonText: 'Cancelar',
        saveButtonText: 'Guardar',
      })
      setTrimming(false)
      if (result?.outputPath) setVideoUri(result.outputPath)
    } catch (err) {
      setTrimming(false)
      if (String(err?.message).toLowerCase().includes('cancel')) return
      Alert.alert('No se pudo recortar', err?.message || 'Error desconocido')
    }
  }

  const onSendWhatsApp = async () => {
    const cap = finalCaption()
    await Clipboard.setStringAsync(cap)
    await logIt()

    const ok = await Sharing.isAvailableAsync()
    if (!ok) {
      Alert.alert('No se puede compartir', 'El sistema no permitió abrir el panel de compartir.')
      return
    }
    await Sharing.shareAsync(videoUri, {
      mimeType: 'video/mp4',
      dialogTitle: 'Mandar al coach',
      UTI: 'public.movie',
    })

    if (coachPhone) {
      const url = Platform.select({
        ios: `whatsapp://send?phone=${coachPhone}&text=${encodeURIComponent(cap)}`,
        android: `whatsapp://send?phone=${coachPhone}&text=${encodeURIComponent(cap)}`,
      })
      try { await Linking.openURL(url) } catch {}
    }
  }

  const onCopyOnly = async () => {
    await Clipboard.setStringAsync(finalCaption())
    await logIt()
    Alert.alert('Listo', 'Descripción copiada al portapapeles. Video guardado en galería.')
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView contentContainerStyle={S.scroll}>
        <Pressable onPress={() => navigation.popToTop()} style={S.back} hitSlop={10}>
          <Text style={S.backTxt}>×</Text>
        </Pressable>

        {/* Video */}
        <View style={S.preview}>
          <VideoView
            player={player}
            style={S.video}
            contentFit="contain"
            allowsFullscreen
            allowsPictureInPicture={false}
            nativeControls
          />
        </View>

        {/* Trim button */}
        <Pressable onPress={onTrim} style={S.trimBtn} disabled={trimming}>
          <Text style={S.trimIcon}>✂</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.trimTitle}>{trimming ? 'Abriendo recortador…' : 'Recortar video'}</Text>
            <Text style={S.trimSub}>Quitar inicio y final antes de mandar</Text>
          </View>
          <Text style={S.trimChev}>›</Text>
        </Pressable>

        {/* Caption */}
        <View style={S.captionCard}>
          <Text style={S.captionLabel}>Descripción</Text>
          <Text style={S.captionTxt}>{finalCaption()}</Text>
        </View>

        {/* Reps + RPE actually done */}
        <View style={S.card}>
          <Text style={S.label}>¿Qué pasó realmente en este set?</Text>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={S.sub}>Reps logrados</Text>
              <TextInput style={S.input} keyboardType="numeric" value={reps} onChangeText={setReps} placeholder="4" placeholderTextColor={theme.colors.textMuted} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={S.sub}>RPE obtenido</Text>
              <TextInput style={S.input} keyboardType="numeric" value={rpe} onChangeText={setRpe} placeholder="7" placeholderTextColor={theme.colors.textMuted} />
            </View>
          </View>
        </View>

        <Button label="📲  Mandar al coach" onPress={onSendWhatsApp} />
        <View style={{ height: 10 }} />
        <Button label="Solo copiar descripción" variant="ghost" onPress={onCopyOnly} />

        {saved && <Text style={S.savedNote}>✓  Video guardado en tu galería</Text>}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 20, gap: 14 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  backTxt: { color: theme.colors.text, fontSize: 26, fontWeight: '300' },

  preview: { borderRadius: theme.radius.lg, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 9/16, maxHeight: 360, alignSelf: 'center', width: '100%' },
  video: { width: '100%', height: '100%' },

  trimBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.text,
    borderRadius: theme.radius.md,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  trimIcon: { color: '#ffffff', fontSize: 22 },
  trimTitle: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  trimSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  trimChev: { color: '#ffffff', fontSize: 22, opacity: 0.7 },

  captionCard: {
    backgroundColor: '#fff5f5',
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: '#ffd5d6',
    padding: 14,
  },
  captionLabel: { color: theme.colors.greenDeep, fontWeight: '800', letterSpacing: 1.5, fontSize: 10, textTransform: 'uppercase' },
  captionTxt: { color: theme.colors.text, fontSize: 17, fontWeight: '900', letterSpacing: -0.3, marginTop: 6 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 14, gap: 6,
    ...shadow.card,
  },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  sub: { color: theme.colors.textDim, fontSize: 11, letterSpacing: 1.2, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  row: { flexDirection: 'row' },
  input: {
    backgroundColor: theme.colors.bg2,
    borderWidth: 1.5, borderColor: theme.colors.border,
    color: theme.colors.text, fontSize: 22, fontWeight: '900',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: theme.radius.md,
    letterSpacing: -0.5,
  },
  savedNote: { color: theme.colors.textDim, textAlign: 'center', marginTop: 14, fontSize: 12, fontWeight: '600' },
})
