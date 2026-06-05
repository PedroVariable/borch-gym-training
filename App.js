import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, DefaultTheme as NavLight } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Updates from 'expo-updates'
import AsyncStorage from '@react-native-async-storage/async-storage'

import HomeScreen from './src/screens/HomeScreen'
import SessionScreen from './src/screens/SessionScreen'
import RecordScreen from './src/screens/RecordScreen'
import PostRecordScreen from './src/screens/PostRecordScreen'
import RpeCalculatorScreen from './src/screens/RpeCalculatorScreen'
import LogScreen from './src/screens/LogScreen'
import SetupScreen from './src/screens/SetupScreen'
import SettingsScreen from './src/screens/SettingsScreen'

import { theme } from './src/theme'

const Stack = createNativeStackNavigator()

const navTheme = {
  ...NavLight,
  colors: {
    ...NavLight.colors,
    background: theme.colors.bg,
    card: theme.colors.bg,
    text: theme.colors.text,
    primary: theme.colors.green,
    border: theme.colors.border,
  },
}

const PREFS_KEY = 'prefs-v1'
const ONBOARDED_KEY = 'onboarded-v1'

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null) // 'Setup' | 'Home'

  // Decide initial route + silently check for OTA updates on launch
  useEffect(() => {
    ;(async () => {
      try {
        const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY)
        const prefsRaw  = await AsyncStorage.getItem(PREFS_KEY)
        const prefs = prefsRaw ? JSON.parse(prefsRaw) : {}
        if (!onboarded && !prefs.csvUrl) {
          setInitialRoute('Setup')
          await AsyncStorage.setItem(ONBOARDED_KEY, '1')
        } else {
          setInitialRoute('Home')
        }
      } catch {
        setInitialRoute('Home')
      }

      // Background: check for OTA update silently. If found, apply on next launch.
      if (!__DEV__ && Updates.isEnabled) {
        try {
          const r = await Updates.checkForUpdateAsync()
          if (r.isAvailable) {
            await Updates.fetchUpdateAsync()
          }
        } catch {}
      }
    })()
  }, [])

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.green} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Session" component={SessionScreen} />
            <Stack.Screen name="Record" component={RecordScreen} options={{ animation: 'fade_from_bottom' }} />
            <Stack.Screen name="PostRecord" component={PostRecordScreen} />
            <Stack.Screen name="Rpe" component={RpeCalculatorScreen} />
            <Stack.Screen name="Log" component={LogScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
