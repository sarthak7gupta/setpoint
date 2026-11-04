import 'styled-components/native'
import type { AppTheme } from '../themes'

declare module 'styled-components/native' {
  export interface DefaultTheme extends AppTheme {}
}

declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}
