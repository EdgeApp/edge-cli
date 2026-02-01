import { EdgeAccount, EdgeContext, EdgeCurrencyWallet } from 'edge-core-js'

export interface CommandOptions {
  name?: string
  token?: string
  limit?: string
  dryRun?: boolean
}

export interface Session {
  context: EdgeContext
  account: EdgeAccount
  wallet: EdgeCurrencyWallet
  commandOptions: CommandOptions
}
