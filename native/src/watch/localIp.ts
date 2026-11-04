import { ipv4SubnetBase, isPrivateIpv4 } from './index'

export async function nativeLocalIpv4(): Promise<string | null> {
  try {
    const Network = require('expo-network') as {
      getIpAddressAsync?: () => Promise<string>
    }
    const ip = await Network.getIpAddressAsync?.()
    if (ip && isPrivateIpv4(ip)) return ip
    return null
  } catch {
    return null
  }
}

export async function nativeSubnetBases(): Promise<{ ip: string | null; bases: string[] }> {
  const ip = await nativeLocalIpv4()
  const base = ip ? ipv4SubnetBase(ip) : null
  return { ip, bases: base ? [base] : [] }
}
