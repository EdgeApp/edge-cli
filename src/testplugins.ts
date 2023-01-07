import {
  asDate,
  asMap,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'
import {
  addEdgeCorePlugins,
  lockEdgeCorePlugins,
  makeEdgeContext,
  makeFakeEdgeWorld
} from 'edge-core-js'
import fs from 'fs'

import abPlugins from 'edge-currency-accountbased'
import utxoPlugins from 'edge-currency-plugins'

const DUMP_USER_FILE = './src/fakeUserDump.json'

const asFakeUser = asObject({
  username: asString,
  lastLogin: asOptional(asDate),
  loginId: asString,
  loginKey: asString,
  repos: asMap(asMap(asUnknown)),
  server: asUnknown
})

const asUserDump = asObject({
  loginKey: asString,
  data: asFakeUser
})

async function main(): Promise<void> {
  const allPlugins = {
    ...abPlugins,
    ...utxoPlugins
  }

  addEdgeCorePlugins(allPlugins)
  lockEdgeCorePlugins()

  // const userFile = fs.readFileSync(DUMP_USER_FILE, { encoding: 'utf8' })
  // const json = JSON.parse(userFile)
  // const dump = asUserDump(json)
  // const loginKey = dump.loginKey
  // const fakeUsers = [dump.data]

  // const world = await makeFakeEdgeWorld(fakeUsers, {})
  // const context = await world.makeEdgeContext({
  const context = await makeEdgeContext({
    apiKey: '',
    appId: '',
    plugins: {
      ethereum: {      },
      ripple: true
    }
  })

  const account = await context.loginWithPassword('meetupdemo', 'Test123456')
  // const btcInfo = await account.getFirstWalletInfo('wallet:bitcoin')
  const xrpInfo = await account.getFirstWalletInfo('wallet:ripple')
  const ethInfo = await account.getFirstWalletInfo('wallet:ethereum')
  // const avaxInfo = await account.getFirstWalletInfo('wallet:avalanche')

  // await snooze(5000)

  console.log(account.currencyWallets)

  // const btcWallet = await account.waitForCurrencyWallet(btcInfo?.id ?? '')
  const ethWallet = await account.waitForCurrencyWallet(ethInfo?.id ?? '')
  const xrpWallet = await account.waitForCurrencyWallet(xrpInfo?.id ?? '')
  // const avaxWallet = await account.waitForCurrencyWallet(avaxInfo?.id ?? '')

  const ethAddress = await ethWallet.getReceiveAddress()
  const xrpAddress = await xrpWallet.getReceiveAddress()

  xrpWallet.watch('syncRatio', v => {
    console.log(`xrp syncRatio: ${v}`)
  })
  ethWallet.watch('syncRatio', v => {
    console.log(`eth syncRatio: ${v}`)
  })

  console.log(JSON.stringify(ethAddress, null, 2))
  console.log('-------------------------')
  console.log(JSON.stringify(xrpAddress, null, 2))
}

main().catch(e => {
  console.log(e.message)
  process.exit(-1)
})
