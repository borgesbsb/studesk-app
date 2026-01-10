import { registerLicense } from '@syncfusion/ej2-base'

const SYNCFUSION_LICENSE = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY

if (SYNCFUSION_LICENSE) {
  registerLicense(SYNCFUSION_LICENSE)
}

export {}
