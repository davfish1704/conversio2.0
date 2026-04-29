import { Nango } from "@nangohq/node"

const NANGO_SECRET_KEY = process.env.NANGO_SECRET_KEY
const NANGO_HOST = process.env.NANGO_HOST || "https://api.nango.dev"

export const nango = NANGO_SECRET_KEY 
  ? new Nango({ secretKey: NANGO_SECRET_KEY, host: NANGO_HOST })
  : null

export async function getNangoConnection(provider: string, connectionId: string) {
  if (!nango) throw new Error("Nango not configured")
  return await nango.getConnection(provider, connectionId)
}

export async function listNangoConnections() {
  if (!nango) throw new Error("Nango not configured")
  return await nango.listConnections()
}

export async function triggerNangoSync(provider: string, connectionId: string) {
  if (!nango) throw new Error("Nango not configured")
  // triggerSync braucht: providerConfigKey, syncs?, connectionId?
  return await nango.triggerSync(provider, undefined, connectionId)
}
