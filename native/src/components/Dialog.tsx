import { useReducedMotion } from '../hooks/useReducedMotion'
import { Modal, type ModalProps, View } from 'react-native'

/** Native modal adapter: OS focus isolation and Back dismissal, shared policy. */
export function Dialog({ children, animationType, ...props }: ModalProps) {
  const reduceMotion = useReducedMotion()
  return <Modal supportedOrientations={['portrait','landscape','landscape-left','landscape-right']} {...props} animationType={reduceMotion ? 'none' : animationType}>
    <View style={{ flex: 1 }} accessibilityViewIsModal importantForAccessibility="yes">{children}</View>
  </Modal>
}
