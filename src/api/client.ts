import { createConnectTransport } from '@connectrpc/connect-web'
import { createClient } from '@connectrpc/connect'

export const transport = createConnectTransport({
  baseUrl: '/api',
})

export { createClient }
