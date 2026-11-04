import { NavigationContainer, DarkTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Platform } from 'react-native'
import { useTheme } from 'styled-components/native'
import { History } from '../screens/History'
import { Home } from '../screens/Home'
import { LiveMatch } from '../screens/LiveMatch'
import { MatchSummary } from '../screens/MatchSummary'
import { NewMatch } from '../screens/NewMatch'
import { Profiles } from '../screens/Profiles'
import { Settings } from '../screens/Settings'
import { WatchLive } from '../screens/WatchLive'
import { WatchMatch } from '../screens/WatchMatch'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const theme = useTheme()
  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: theme.bgDeep,
          card: theme.bgElevated,
          text: theme.text,
          border: theme.line,
          primary: theme.accent,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bgDeep },
          // iOS: system push; Android: Material predictive-back fade
          animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'slide_from_right',
          orientation: 'default',
        }}
      >
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="NewMatch" component={NewMatch} />
        <Stack.Screen name="LiveMatch" component={LiveMatch} />
        <Stack.Screen name="MatchSummary" component={MatchSummary} />
        <Stack.Screen name="History" component={History} />
        <Stack.Screen name="Profiles" component={Profiles} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="WatchMatch" component={WatchMatch} />
        <Stack.Screen name="WatchLive" component={WatchLive} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
