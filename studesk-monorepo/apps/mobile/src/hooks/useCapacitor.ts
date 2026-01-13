import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

export function useCapacitor() {
  const [isNative, setIsNative] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web')

  useEffect(() => {
    const native = Capacitor.isNativePlatform()
    const plat = Capacitor.getPlatform() as 'ios' | 'android' | 'web'

    setIsNative(native)
    setPlatform(plat)

    console.log(`📱 Plataforma: ${plat} (isNative: ${native})`)
  }, [])

  return {
    isNative,
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
  }
}
