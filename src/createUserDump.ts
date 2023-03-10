import {
  addEdgeCorePlugins,
  EdgeFakeUser,
  lockEdgeCorePlugins,
  makeFakeEdgeWorld
} from 'edge-core-js'
import fs from 'fs'

import abPlugins from 'edge-currency-accountbased'

const DUMP_USER_FILE = './src/fakeUserDump.json'

async function main(): Promise<void> {
  const allPlugins = {
    ...abPlugins
  }

  addEdgeCorePlugins(allPlugins)
  lockEdgeCorePlugins()

  const fakeUsers: EdgeFakeUser[] = []

  const world = await makeFakeEdgeWorld(fakeUsers, {})
  const context = await world.makeEdgeContext({
    apiKey: '',
    appId: '',
    plugins: {
      ethereum: true,
      ripple: true
    }
  })
  const account = await context.createAccount('bob', 'bob123', '1111')
  await account.createCurrencyWallet('wallet:ripple', {
    fiatCurrencyCode: 'iso:USD',
    name: 'My Fake XRP'
  })
  const ethWallet = await account.createCurrencyWallet('wallet:ethereum', {
    fiatCurrencyCode: 'iso:EUR',
    name: 'My Fake Bitcoin'
  })
  // const avaxWallet = await account.createCurrencyWallet('wallet:avalanche', {
  //   fiatCurrencyCode: 'iso:EUR',
  //   name: 'My Fake Avalanche'
  // })
  const ethEnabledTokens = ethWallet.currencyInfo.metaTokens.map(
    token => token.currencyCode
  )
  await ethWallet.enableTokens(ethEnabledTokens)

  // const avaxEnabledTokens = avaxWallet.currencyInfo.metaTokens.map(
  //   token => token.currencyCode
  // )
  // await avaxWallet.enableTokens(avaxEnabledTokens)

  const data = await world.dumpFakeUser(account)
  const dump = {
    loginKey: account.loginKey,
    data
  }
  fs.writeFileSync(DUMP_USER_FILE, JSON.stringify(dump, null, 2), {
    encoding: 'utf8'
  })
  process.exit(0)
}

main().catch(e => {
  console.log(e.message)
  process.exit(-1)
})
