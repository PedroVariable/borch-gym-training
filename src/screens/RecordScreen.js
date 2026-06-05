import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'
import { theme } from '../theme'
import Button from '../components/Button'
import { buildCaption } from '../utils/caption'

export default function RecordScreen({ route, navigation }) {
  const { week, sessionN, exercise, weight, repNumber } = route.params

  const [cameraPerm, requestCameraPerm] = useCameraPermissions()
  const [micPerm,    requestMicPerm]    = useMicrophonePermissions()
  const cameraRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [facing, setFacing] = useState('back')

  // Tick recording timer
  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [recording])

  // Ensure permissions before showing camera
  if (!cameraPerm) {
    return <SafeAreaView style={S.safe}><View style={S.center}><ActivityIndicator color={theme.colors.green} /></View></SafeAreaView>
  }
  if (!cameraPerm.granted) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.center}>
          <Text style={S.title}>Necesitamos la cámara</Text>
          <Text style={S.dim}>Para grabar tus sets y mandarlos al coach.</Text>
          <View style={{ height: 16 }} />
          <Button label="Dar permiso" onPress={async () => {
            const c = await requestCameraPerm()
            if (!micPerm?.granted) await requestMicPerm()
            if (!c.granted) Alert.alert('Permiso denegado', 'Actívalo desde Ajustes para grabar.')
          }} />
        </View>
      </SafeAreaView>
    )
  }
  if (!micPerm?.granted) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.center}>
          <Text style={S.title}>Necesitamos el micrófono</Text>
          <Text style={S.dim}>Para que el coach escuche cómo respiras / la barra al final.</Text>
          <View style={{ height: 16 }} />
          <Button label="Dar permiso" onPress={requestMicPerm} />
        </View>
      </SafeAreaView>
    )
  }

  const caption = buildCaption({
    week, session: sessionN, exercise: exercise.name,
    sets: exercise.sets, reps: exercise.reps, weight,
    repNumber, rpeTarget: exercise.rpe,
  })

  const onStartStop = async () => {
    if (!cameraRef.current) return
    if (recording) {
      // Stop will resolve via the recordAsync promise; stopRecording triggers it.
      cameraRef.current.stopRecording()
      return
    }
    try {
      setRecording(true)
      setElapsed(0)
      setBusy(true)
      const result = await cameraRef.current.recordAsync({ maxDuration: 60 })
      setRecording(false)
      setBusy(false)
      if (!result?.uri) return
      navigation.replace('PostRecord', {
        videoUri: result.uri,
        caption,
        week, sessionN, exercise, weight, repNumber,
      })
    } catch (err) {
      setRecording(false)
      setBusy(false)
      Alert.alert('Error grabando', String(err?.message || err))
    }
  }

  return (
    <View style={S.safe}>
      <CameraView
        ref={cameraRef}
        style={S.cam}
        facing={facing}
        mode="video"
        videoQuality="720p"
      />

      {/* Top overlay */}
      <SafeAreaView style={S.topBar} pointerEvents="box-none">
        <Pressable onPress={() => navigation.goBack()} style={S.closeBtn}>
          <Text style={S.closeTxt}>✕</Text>
        </Pressable>
        <View style={S.captionBox}>
          <Text style={S.captionTxt} numberOfLines={2}>{caption}</Text>
        </View>
        <Pressable
          onPress={() => !recording && setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          style={[S.flipBtn, recording && S.flipBtnDisabled]}
          disabled={recording}
        >
          <Text style={S.flipTxt}>⇆</Text>
        </Pressable>
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView style={S.bottom} edges={['bottom']} pointerEvents="box-none">
        {recording && (
          <View style={S.timerBox}>
            <View style={S.recDot} />
            <Text style={S.timerTxt}>{formatTime(elapsed)}</Text>
          </View>
        )}
        <Pressable
          onPress={onStartStop}
          style={[S.recBtn, recording && S.recBtnActive]}
          disabled={busy && !recording}
        >
          <View style={[S.recBtnInner, recording && S.recBtnInnerActive]} />
        </Pressable>
        <Text style={S.tap}>{recording ? 'Tap para detener' : 'Tap para grabar'}</Text>
      </SafeAreaView>
    </View>
  )
}

function formatTime(s) {
  const m = Math.floor(s / 60), r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  cam: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.bg },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  dim: { color: theme.colors.textDim, textAlign: 'center' },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#fff', fontSize: 18, fontWeight: '700' },
  flipBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  flipBtnDisabled: { opacity: 0.4 },
  flipTxt: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  captionBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(225, 29, 45, 0.6)',
  },
  captionTxt: { color: '#ffffff', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },

  bottom: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', gap: 12 },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.red },
  timerTxt: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
  recBtn: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  recBtnActive: { borderColor: theme.colors.red },
  recBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.red },
  recBtnInnerActive: { width: 28, height: 28, borderRadius: 6, backgroundColor: theme.colors.red },
  tap: { color: '#fff', opacity: 0.8, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
})
