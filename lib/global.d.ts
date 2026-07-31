export {}

declare global {
  interface Global {
    __affiliateCache?: { ts: number; data: any }
  }

  interface GlobalThis {
    __affiliateCache?: { ts: number; data: any }
  }

  var __affiliateCache: { ts: number; data: any } | undefined
}
