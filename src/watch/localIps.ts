import { ipv4SubnetBase, isPrivateIpv4 } from './index'

function hostFromCandidate(candidate: string): string | null {
  const v4 = /(?:^| )(\d{1,3}(?:\.\d{1,3}){3})(?: |$)/.exec(candidate)
  if (v4 && isPrivateIpv4(v4[1])) return v4[1]
  return null
}

/** Best-effort LAN IPv4s (page host + WebRTC host candidates). */
export async function discoverLocalIpv4s(): Promise<string[]> {
  const found = new Set<string>()
  if (typeof window !== 'undefined' && isPrivateIpv4(window.location.hostname)) {
    found.add(window.location.hostname)
  }
  if (typeof RTCPeerConnection === 'undefined') return [...found]
  const pc = new RTCPeerConnection({ iceServers: [] })
  try {
    pc.createDataChannel('setpoint-watch')
    await pc.setLocalDescription(await pc.createOffer())
    await new Promise<void>((resolve) => {
      const done = () => resolve()
      const timer = window.setTimeout(done, 700)
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') {
          window.clearTimeout(timer)
          done()
        }
      })
      pc.addEventListener('icecandidate', (event) => {
        const host = event.candidate?.candidate
          ? hostFromCandidate(event.candidate.candidate)
          : null
        if (host) found.add(host)
        if (!event.candidate) {
          window.clearTimeout(timer)
          done()
        }
      })
    })
  } catch {
    /* WebRTC can be blocked; scan still works if the user types an IP. */
  } finally {
    pc.close()
  }
  return [...found]
}

export function subnetBasesFromIps(ips: string[]): string[] {
  const bases = new Set<string>()
  for (const ip of ips) {
    const base = ipv4SubnetBase(ip)
    if (base) bases.add(base)
  }
  return [...bases]
}
