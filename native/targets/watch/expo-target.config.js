/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'SetPointWatch',
  displayName: 'SetPoint',
  icon: '../../assets/icon.png',
  deploymentTarget: '10.0',
  colors: {
    $accent: '#CCFF00',
    background: '#0a0610',
  },
  frameworks: ['SwiftUI', 'WatchConnectivity'],
}
