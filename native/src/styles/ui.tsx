import { readableGradient } from '../../../shared/utils/contrast'
import { Dialog } from '../components/Dialog'
import { LinearGradient } from 'expo-linear-gradient'
import { Children, Fragment, isValidElement, type ReactNode, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View, type StyleProp, type ViewStyle, type AccessibilityState } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import styled, { css, useTheme } from 'styled-components/native'
import { useLayout } from '../layout/useLayout'
import { controlRadius, inputRadius, isAndroid, surfaceRadius } from './chrome'
import { FeedbackPressable } from './press'
import { Surface } from './Surface'

export { FeedbackPressable } from './press'
export { Surface } from './Surface'
export type { SurfaceLevel } from './chrome'

export function Screen(args: {
  children: ReactNode
  scroll?: boolean
  keyboard?: boolean
}) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const layout = useLayout()
  const padBottom = Math.max(insets.bottom, 16) + 24
  const contentStyle = {
    paddingHorizontal: layout.padH,
    paddingTop: layout.isLandscape ? 8 : 12,
    paddingBottom: padBottom,
    maxWidth: layout.contentMaxWidth,
    width: '100%' as const,
    alignSelf: 'center' as const,
    flexGrow: 1,
  }
  const inner =
    args.scroll === false ? (
      <View style={{ flex: 1, ...contentStyle }}>{args.children}</View>
    ) : (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentStyle}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        {args.children}
      </ScrollView>
    )
  const body = args.keyboard ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  )
  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0.08, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      {body}
    </LinearGradient>
  )
}

export function TwoPane(args: { a: ReactNode; b: ReactNode }) {
  const { twoPane } = useLayout()
  if (!twoPane) {
    return (
      <View style={{ gap: 16 }}>
        {args.a}
        {args.b}
      </View>
    )
  }
  return (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
      <View style={{ flex: 1 }}>{args.a}</View>
      <View style={{ flex: 1 }}>{args.b}</View>
    </View>
  )
}

export const Brand = styled.Text.attrs({
  maxFontSizeMultiplier: 1.25,
  allowFontScaling: true,
})`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 56px;
  line-height: 56px;
  color: ${(p) => p.theme.accent};
  letter-spacing: 1px;
`

const TitleText = styled.Text.attrs({
  maxFontSizeMultiplier: 1.3,
  allowFontScaling: true,
})`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 38px;
  line-height: 42px;
  letter-spacing: 0.8px;
  color: ${(p) => p.theme.text};
`

export function Title(args: { children: ReactNode; style?: object }) {
  const { titleSize } = useLayout()
  return (
    <TitleText style={[{ fontSize: titleSize, lineHeight: titleSize + 4 }, args.style]}>
      {args.children}
    </TitleText>
  )
}

export const Heading = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 22px;
  line-height: 26px;
  letter-spacing: 0.6px;
  color: ${(p) => p.theme.text};
  margin-bottom: 10px;
`

export const Sub = styled.Text`
  color: ${(p) => p.theme.textMuted};
  margin-top: 6px;
  margin-bottom: 24px;
  font-size: 15px;
  font-family: ${(p) => p.theme.fontUi};
  line-height: 22px;
`

export const Muted = styled.Text`
  color: ${(p) => p.theme.textMuted};
  font-size: 13px;
  font-family: ${(p) => p.theme.fontUi};
`

export const BodyText = styled.Text`
  color: ${(p) => p.theme.text};
  font-size: 16px;
  font-family: ${(p) => p.theme.fontUi};
`

export const Stack = styled.View<{ $gap?: number }>`
  gap: ${(p) => p.$gap ?? 12}px;
`

export const Row = styled.View<{ $gap?: number; $wrap?: boolean }>`
  flex-direction: row;
  gap: ${(p) => p.$gap ?? 8}px;
  flex-wrap: ${(p) => (p.$wrap ? 'wrap' : 'nowrap')};
  align-items: center;
`

type Variant = 'primary' | 'ghost' | 'danger' | 'warning' | 'accent'

const buttonShape = css`
  border-radius: ${controlRadius}px;
  overflow: hidden;
`

const ButtonPressable = styled(FeedbackPressable)<{ $disabled?: boolean }>`
  ${buttonShape}
  opacity: ${(p) => (p.$disabled ? 0.45 : 1)};
`

const ButtonGradient = styled(LinearGradient)`
  padding: 14px 18px;
  align-items: center;
  justify-content: center;
  min-height: 48px;
`

const ButtonBase = styled(FeedbackPressable)<{ $variant: Variant; $disabled?: boolean }>`
  ${buttonShape}
  padding: 14px 18px;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  opacity: ${(p) => (p.$disabled ? 0.45 : 1)};
  border-width: 1px;
  border-color: ${(p) =>
    p.$variant === 'danger'
      ? p.theme.danger
      : p.$variant === 'warning'
        ? p.theme.warning
        : p.theme.line};
  background-color: ${(p) =>
    p.$variant === 'danger'
      ? 'rgba(232, 93, 106, 0.22)'
      : p.$variant === 'warning'
        ? 'rgba(240, 160, 75, 0.22)'
        : p.$variant === 'ghost'
          ? 'transparent'
          : p.theme.bgElevated};
`

const ButtonLabel = styled.Text<{ $variant: Variant }>`
  font-family: ${(p) => p.theme.fontUiSemiBold};
  font-size: 16px;
  text-align: center;
  color: ${(p) =>
    p.$variant === 'accent'
      ? '#0a1208'
      : p.$variant === 'danger'
        ? p.theme.danger
        : p.$variant === 'warning'
          ? p.theme.warning
          : p.theme.text};
`

export function AppButton(args: {
  variant?: Variant
  onPress?: () => void
  disabled?: boolean
  children: ReactNode
  testID?: string
  style?: object
  minHeight?: number
  accessibilityState?: AccessibilityState
}) {
  const theme = useTheme()
  const variant = args.variant ?? 'ghost'
  const minHeight = args.minHeight
  const readable = readableGradient(variant === 'primary' ? theme.purpleBright : theme.accent, variant === 'primary' ? theme.purple : theme.greenBright)
  const content =
    typeof args.children === 'string' || typeof args.children === 'number' ? (
      <ButtonLabel $variant={variant} style={variant === 'primary' || variant === 'accent' ? {color:readable.text} : undefined}>{args.children}</ButtonLabel>
    ) : (
      args.children
    )
  if (variant === 'primary' || variant === 'accent') {
    const colors: [string,string] = [readable.start,readable.end]
    return (
      <ButtonPressable
        onPress={args.onPress}
        disabled={args.disabled}
        $disabled={!!args.disabled}
        darkRipple={variant === 'accent'}
        testID={args.testID}
        style={[
          args.style,
          isAndroid && !args.disabled ? { elevation: 2 } : null,
        ]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ ...args.accessibilityState, disabled: !!args.disabled }}
      >
        <ButtonGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={minHeight ? { minHeight } : undefined}
        >
          {content}
        </ButtonGradient>
      </ButtonPressable>
    )
  }
  return (
    <ButtonBase
      $variant={variant}
      onPress={args.onPress}
      disabled={args.disabled}
      $disabled={!!args.disabled}
      testID={args.testID}
      style={[args.style, minHeight ? { minHeight } : undefined]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ ...args.accessibilityState, disabled: !!args.disabled }}
    >
      {content}
    </ButtonBase>
  )
}

/** Compact top-left nav control (Home / Cancel / Back). */
export function ScreenTopBar(args: {
  label: string
  onPress: () => void
  testID?: string
}) {
  return (
    <Row style={{ marginBottom: 10, alignItems: 'center' }}>
      <AppButton variant="ghost" onPress={args.onPress} testID={args.testID}>
        {args.label}
      </AppButton>
    </Row>
  )
}

export const MatchStatus = styled.Text<{ $complete: boolean }>`
  font-size: 11px;
  font-family: ${(p) => p.theme.fontUiBold};
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding: 3px 8px;
  overflow: hidden;
  border-radius: 999px;
  ${(p) =>
    p.$complete
      ? css`
          color: ${p.theme.textMuted};
          background-color: rgba(255, 255, 255, 0.08);
          border-width: 1px;
          border-color: ${p.theme.line};
        `
      : css`
          color: #0a1208;
          background-color: ${p.theme.accent};
        `}
`

export const FieldLabel = styled.Text`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${(p) => p.theme.textMuted};
  font-family: ${(p) => p.theme.fontUiSemiBold};
  margin-bottom: 6px;
`

export const FieldBox = styled.View`
  gap: 6px;
`

export const Input = styled.TextInput.attrs((p) => ({
  placeholderTextColor: p.theme.textMuted,
  selectionColor: p.theme.accent,
}))`
  border-width: 1px;
  border-color: ${(p) => p.theme.line};
  border-radius: ${inputRadius}px;
  padding: 12px 14px;
  background-color: rgba(0, 0, 0, 0.25);
  color: ${(p) => p.theme.text};
  font-size: 16px;
  font-family: ${(p) => p.theme.fontUi};
`

export function Field(args: { label: string; children: ReactNode }) {
  return (
    <FieldBox>
      <FieldLabel>{args.label}</FieldLabel>
      {args.children}
    </FieldBox>
  )
}

export function SelectField<T extends string | number>(args: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  testID?: string
}) {
  const [open, setOpen] = useState(false)
  const current = args.options.find((o) => o.value === args.value)
  return (
    <FieldBox>
      <FieldLabel>{args.label}</FieldLabel>
      <SelectTrigger onPress={() => setOpen(true)} testID={args.testID}>
        <SelectValue>{current?.label ?? String(args.value)}</SelectValue>
        <SelectChevron>▾</SelectChevron>
      </SelectTrigger>
      <Dialog
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      >
        <SelectBackdrop onPress={() => setOpen(false)}>
          <Surface
            level="sheet"
            outlined={false}
            onStartShouldSetResponder={() => true}
            style={{ padding: 18, maxHeight: '80%' }}
          >
            <SelectSheetTitle>{args.label}</SelectSheetTitle>
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {args.options.map((option) => {
                const selected = option.value === args.value
                return (
                  <SelectOption
                    key={String(option.value)}
                    onPress={() => {
                      args.onChange(option.value)
                      setOpen(false)
                    }}
                    $selected={selected}
                  >
                    <SelectOptionLabel $selected={selected}>{option.label}</SelectOptionLabel>
                  </SelectOption>
                )
              })}
            </ScrollView>
            <View style={{ height: 8 }} />
            <AppButton variant="ghost" onPress={() => setOpen(false)}>
              Cancel
            </AppButton>
          </Surface>
        </SelectBackdrop>
      </Dialog>
    </FieldBox>
  )
}

const SelectTrigger = styled(FeedbackPressable)`
  border-width: 1px;
  border-color: ${(p) => p.theme.line};
  border-radius: ${inputRadius}px;
  padding: 12px 14px;
  background-color: rgba(0, 0, 0, 0.25);
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`

const SelectValue = styled.Text`
  color: ${(p) => p.theme.text};
  font-size: 16px;
  font-family: ${(p) => p.theme.fontUi};
  flex: 1;
`

const SelectChevron = styled.Text`
  color: ${(p) => p.theme.accentSoft};
  font-size: 16px;
`

const SelectBackdrop = styled.Pressable`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.72);
  justify-content: center;
  padding: 24px;
`

const SelectSheetTitle = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 22px;
  color: ${(p) => p.theme.text};
  margin-bottom: 12px;
`

const SelectOption = styled(FeedbackPressable)<{ $selected: boolean }>`
  padding: 12px 10px;
  border-radius: 10px;
  background-color: ${(p) => (p.$selected ? 'rgba(204, 255, 0, 0.12)' : 'transparent')};
`

const SelectOptionLabel = styled.Text<{ $selected: boolean }>`
  color: ${(p) => (p.$selected ? p.theme.accent : p.theme.text)};
  font-family: ${(p) => (p.$selected ? p.theme.fontUiSemiBold : p.theme.fontUi)};
  font-size: 16px;
`

export function Card(args: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Surface level="card" style={[{ padding: 14 }, args.style]}>
      {args.children}
    </Surface>
  )
}

const STAT_GUTTER = 10

function flattenStatChildren(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  Children.forEach(children, (child) => {
    if (child == null || typeof child === 'boolean') return
    if (isValidElement(child) && child.type === Fragment) {
      out.push(...flattenStatChildren((child.props as { children?: ReactNode }).children))
      return
    }
    out.push(child)
  })
  return out
}

export function StatGrid(args: { children: ReactNode }) {
  const { statColumns } = useLayout()
  const items = flattenStatChildren(args.children)
  return (
    <StatGridWrap>
      {items.map((child, index) => (
        <StatSlot
          key={isValidElement(child) && child.key != null ? String(child.key) : `stat-${index}`}
          $columns={statColumns}
        >
          {child}
        </StatSlot>
      ))}
    </StatGridWrap>
  )
}

const StatGridWrap = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-horizontal: ${-STAT_GUTTER / 2}px;
  margin-bottom: ${-STAT_GUTTER}px;
`

const StatSlot = styled.View<{ $columns: number }>`
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: ${(p) => `${100 / p.$columns}%`};
  max-width: ${(p) => `${100 / p.$columns}%`};
  padding-horizontal: ${STAT_GUTTER / 2}px;
  padding-bottom: ${STAT_GUTTER}px;
`

export function StatCard(args: {
  children: ReactNode
  $highlight?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const theme = useTheme()
  return (
    <Surface
      level="card"
      tone={args.$highlight ? 'rgba(204, 255, 0, 0.14)' : theme.bgElevated}
      style={[{ padding: 14, width: '100%' }, args.style]}
    >
      {args.children}
    </Surface>
  )
}

export const StatSmall = styled.Text`
  color: ${(p) => p.theme.textMuted};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 4px;
  font-family: ${(p) => p.theme.fontUi};
`

export const StatStrong = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 26px;
  color: ${(p) => p.theme.text};
`

export const OverlayBackdrop = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.72);
  align-items: center;
  justify-content: center;
  padding: 20px;
`

export function OverlayCard(args: { children: ReactNode; style?: StyleProp<ViewStyle>; accessibilityViewIsModal?: boolean }) {
  return (
    <Surface
      level="overlay"
      accessibilityViewIsModal
      outlined={false}
      style={[{ width: '100%', maxWidth: 520, padding: 24, alignItems: 'center' }, args.style]}
    >
      {args.children}
    </Surface>
  )
}

export const OverlayTitle = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 38px;
  color: ${(p) => p.theme.text};
  margin-bottom: 6px;
  text-align: center;
`

export const OverlaySub = styled.Text`
  color: ${(p) => p.theme.textMuted};
  margin-bottom: 16px;
  text-align: center;
  font-family: ${(p) => p.theme.fontUi};
  font-size: 15px;
`

export const PlayerRow = styled.View`
  flex-direction: row;
  align-items: stretch;
  gap: 8px;
`

export const ReorderButtons = styled.View`
  flex-direction: column;
  gap: 4px;
`

export const ReorderBtn = styled(FeedbackPressable)<{ $disabled?: boolean }>`
  width: 44px;
  flex: 1;
  min-height: 28px;
  border-width: 1px;
  border-color: ${(p) => p.theme.line};
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.25);
  align-items: center;
  justify-content: center;
  opacity: ${(p) => (p.$disabled ? 0.3 : 1)};
`

export const ReorderBtnText = styled.Text`
  color: ${(p) => p.theme.text};
  font-size: 11px;
`

export function Accordion(args: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Surface level="card" interactive>
      <AccordionHeader onPress={() => setOpen((value) => !value)}>
        <AccordionTitle>{args.title}</AccordionTitle>
        <AccordionPlus>{open ? '−' : '+'}</AccordionPlus>
      </AccordionHeader>
      {open && <AccordionBody>{args.children}</AccordionBody>}
    </Surface>
  )
}

const AccordionHeader = styled(FeedbackPressable)`
  min-height: 48px;
  padding: 14px 16px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`

const AccordionTitle = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 22px;
  letter-spacing: 0.6px;
  color: ${(p) => p.theme.text};
`

const AccordionPlus = styled.Text`
  font-size: 20px;
  color: ${(p) => p.theme.accentSoft};
`

const AccordionBody = styled.View`
  gap: 14px;
  padding: 0 16px 16px;
`

export const ServeStrip = styled.View<{ $pulse?: boolean }>`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
`

export const ServeBadge = styled.View<{ $kind: 'serve' | 'receive' }>`
  flex: 1;
  min-width: 140px;
  border-radius: ${surfaceRadius('card')}px;
  padding: 10px 12px;
  background-color: ${(p) =>
    p.$kind === 'serve' ? 'rgba(204,255,0,0.12)' : 'rgba(142,197,255,0.12)'};
  border-width: 1px;
  border-color: ${(p) => (p.$kind === 'serve' ? p.theme.serve : p.theme.receive)};
  elevation: ${isAndroid ? 1 : 0};
`

export const ServeBadgeSmall = styled.Text<{ $kind: 'serve' | 'receive' }>`
  font-size: 10px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: ${(p) => (p.$kind === 'serve' ? p.theme.serve : p.theme.receive)};
  margin-bottom: 2px;
  font-family: ${(p) => p.theme.fontUiBold};
`

export const ServeBadgeName = styled.Text`
  font-size: 16px;
  font-family: ${(p) => p.theme.fontUiSemiBold};
  color: ${(p) => p.theme.text};
`

export const PressureBanner = styled.View<{
  $kind: 'break' | 'game' | 'set' | 'match' | 'deuce'
}>`
  align-self: center;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 5px 10px;
  border-radius: 4px;
  border-left-width: 3px;
  border-left-color: ${(p) =>
    p.$kind === 'match'
      ? p.theme.accent
      : p.$kind === 'set'
        ? p.theme.purpleBright
        : p.$kind === 'break'
          ? p.theme.danger
          : p.$kind === 'deuce'
            ? p.theme.textMuted
            : p.theme.line};
  background-color: rgba(0, 0, 0, 0.55);
`

export const PressureLine = styled.Text<{ $muted?: boolean }>`
  font-family: ${(p) => p.theme.fontUiBold};
  font-size: 11px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  line-height: 14px;
  color: ${(p) => (p.$muted ? p.theme.textMuted : p.theme.text)};
`

export const AlertBox = styled.View`
  padding: 10px 12px;
  border-width: 1px;
  border-color: ${(p) => p.theme.danger};
  border-radius: ${inputRadius}px;
  background-color: rgba(232, 93, 106, 0.12);
`

export const AlertText = styled.Text`
  color: ${(p) => p.theme.danger};
  font-size: 15px;
  font-family: ${(p) => p.theme.fontUi};
`

export const DisplayScore = styled.Text`
  font-family: ${(p) => p.theme.fontDisplay};
  font-size: 28px;
  color: ${(p) => p.theme.text};
`
