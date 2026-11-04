import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue'
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppProvider, useApp } from './src/context/AppContext'
import { RootNavigator } from './src/navigation/RootNavigator'

void SystemUI.setBackgroundColorAsync('#0a0610')

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden in Expo Go.
})

function AppShell(args: { fontsReady: boolean }) {
  const { ready } = useApp()

  useEffect(() => {
    if (args.fontsReady && ready) {
      void SplashScreen.hideAsync()
    }
  }, [args.fontsReady, ready])

  if (!args.fontsReady || !ready) return null

  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
    </>
  )
}

export default function App() {
  const [loaded] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  })

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0610' }}>
      <SafeAreaProvider>
        <AppProvider>
          <AppShell fontsReady={loaded} />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
