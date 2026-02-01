import {
  EdgeCurrencyWallet,
  EdgeSpendInfo,
  EdgeWalletStates
} from 'edge-core-js'

import { command, UsageError } from '../command'
import { Session } from '../util/session'

// ============================================================================
// Utility functions for amount conversion
// ============================================================================

/**
 * Get the exchange denomination multiplier for a wallet's native currency or token.
 */
function getMultiplier(
  wallet: EdgeCurrencyWallet,
  tokenId: string | null
): string {
  if (tokenId == null) {
    // Native currency - use first denomination (exchange denomination)
    const denom = wallet.currencyInfo.denominations[0]
    return denom?.multiplier ?? '1'
  } else {
    // Token - look up in currencyConfig
    const token = wallet.currencyConfig.allTokens[tokenId]
    if (token == null) {
      throw new Error(`Unknown token: ${tokenId}`)
    }
    const denom = token.denominations[0]
    return denom?.multiplier ?? '1'
  }
}

/**
 * Get the currency code for a wallet's native currency or token.
 */
function getCurrencyCode(
  wallet: EdgeCurrencyWallet,
  tokenId: string | null
): string {
  if (tokenId == null) {
    return wallet.currencyInfo.currencyCode
  } else {
    const token = wallet.currencyConfig.allTokens[tokenId]
    if (token == null) {
      throw new Error(`Unknown token: ${tokenId}`)
    }
    return token.currencyCode
  }
}

/**
 * Convert exchange amount (e.g., "0.001" BTC) to native amount (e.g., "100000" satoshis).
 */
function exchangeToNative(exchangeAmount: string, multiplier: string): string {
  const exchange = parseFloat(exchangeAmount)
  const mult = parseFloat(multiplier)
  return Math.round(exchange * mult).toString()
}

/**
 * Convert native amount to exchange amount.
 */
function nativeToExchange(nativeAmount: string, multiplier: string): string {
  const native = parseFloat(nativeAmount)
  const mult = parseFloat(multiplier)
  return (native / mult).toString()
}

/**
 * Find a wallet by ID (supports partial matching).
 */
function findWallet(
  session: Session,
  walletIdPrefix: string
): EdgeCurrencyWallet {
  const { account } = session
  const walletIds = Object.keys(account.currencyWallets)

  // Try exact match first
  if (account.currencyWallets[walletIdPrefix] != null) {
    return account.currencyWallets[walletIdPrefix]
  }

  // Try partial match
  const matches = walletIds.filter(id => id.startsWith(walletIdPrefix))
  if (matches.length === 0) {
    throw new Error(`No wallet found matching: ${walletIdPrefix}`)
  }
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous wallet ID "${walletIdPrefix}" matches: ${matches.join(', ')}`
    )
  }

  return account.currencyWallets[matches[0]]
}

// ============================================================================
// Phase 1 Commands
// ============================================================================

command(
  'wallet-create',
  {
    usage: '<walletType> [-n <name>]',
    help: 'Create a new currency wallet (e.g., wallet:bitcoin)',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)

    const walletType = argv[0]
    const name = session.commandOptions.name

    const wallet = await session.account.createCurrencyWallet(walletType, {
      name
    })

    console.log({
      walletId: wallet.id,
      type: wallet.type,
      name: wallet.name,
      currencyCode: wallet.currencyInfo.currencyCode
    })
  }
)

command(
  'wallet-list',
  {
    help: 'Lists the currency wallets in an account',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 0) throw new UsageError(this)

    const { account } = session

    // Wait for wallets to load
    await account.waitForAllWallets()

    const wallets = []
    for (const walletId of account.activeWalletIds) {
      const wallet = account.currencyWallets[walletId]
      if (wallet == null) continue

      wallets.push({
        id: walletId,
        name: wallet.name ?? '(unnamed)',
        type: wallet.type,
        currencyCode: wallet.currencyInfo.currencyCode,
        syncRatio: `${Math.round(wallet.syncRatio * 100)}%`
      })
    }

    if (wallets.length === 0) {
      console.log('No wallets found. Use wallet-create to create one.')
    } else {
      console.log(wallets)
    }
  }
)

command(
  'wallet-info',
  {
    usage: '<walletId>',
    help: 'Get detailed info about a specific wallet',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, argv[0])

    console.log({
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      currencyCode: wallet.currencyInfo.currencyCode,
      pluginId: wallet.currencyInfo.pluginId,
      created: wallet.created?.toISOString(),
      blockHeight: wallet.blockHeight,
      syncRatio: `${Math.round(wallet.syncRatio * 100)}%`,
      paused: wallet.paused,
      fiatCurrencyCode: wallet.fiatCurrencyCode,
      enabledTokenIds: wallet.enabledTokenIds
    })
  }
)

command(
  'balance',
  {
    usage: '<walletId> [--token <tokenId>]',
    help: 'Get wallet balance in native and exchange denomination',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, argv[0])
    const tokenId = session.commandOptions.token ?? null

    const nativeBalance = wallet.balanceMap.get(tokenId) ?? '0'
    const multiplier = getMultiplier(wallet, tokenId)
    const exchangeBalance = nativeToExchange(nativeBalance, multiplier)
    const currencyCode = getCurrencyCode(wallet, tokenId)

    console.log({
      walletId: wallet.id,
      tokenId,
      currencyCode,
      nativeBalance,
      exchangeBalance,
      exchangeDenomination: `${exchangeBalance} ${currencyCode}`
    })
  }
)

command(
  'address',
  {
    usage: '<walletId>',
    help: 'Get receive address for a wallet',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, argv[0])

    const addresses = await wallet.getAddresses({ tokenId: null })

    if (addresses.length === 0) {
      console.log('No addresses available')
    } else {
      // Format addresses by type
      const result: Record<string, string> = {
        walletId: wallet.id
      }
      for (const addr of addresses) {
        result[addr.addressType] = addr.publicAddress
      }
      console.log(result)
    }
  }
)

command(
  'tx-list',
  {
    usage: '<walletId> [-l <limit>] [--token <tokenId>]',
    help: 'List transactions for a wallet',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, argv[0])
    const tokenId = session.commandOptions.token ?? null
    const limit =
      session.commandOptions.limit != null
        ? parseInt(session.commandOptions.limit, 10)
        : 10

    const transactions = await wallet.getTransactions({
      tokenId
    })

    const multiplier = getMultiplier(wallet, tokenId)
    const currencyCode = getCurrencyCode(wallet, tokenId)

    // Limit and format transactions
    const formatted = transactions.slice(0, limit).map(tx => ({
      txid: tx.txid,
      date: tx.date != null ? new Date(tx.date * 1000).toISOString() : null,
      nativeAmount: tx.nativeAmount,
      exchangeAmount: `${nativeToExchange(
        tx.nativeAmount,
        multiplier
      )} ${currencyCode}`,
      confirmations: tx.confirmations,
      blockHeight: tx.blockHeight
    }))

    if (formatted.length === 0) {
      console.log('No transactions found')
    } else {
      console.log({
        walletId: wallet.id,
        tokenId,
        count: transactions.length,
        showing: formatted.length,
        transactions: formatted
      })
    }
  }
)

command(
  'spend',
  {
    usage: '<walletId> <address> <amount> [--token <tokenId>] [--dry-run]',
    help: 'Send funds to an address (amount in exchange denomination, e.g., 0.001 BTC)',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 3) throw new UsageError(this)

    const [walletIdPrefix, address, exchangeAmount] = argv
    const tokenId = session.commandOptions.token ?? null
    const dryRun = session.commandOptions.dryRun === true

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, walletIdPrefix)

    const multiplier = getMultiplier(wallet, tokenId)
    const nativeAmount = exchangeToNative(exchangeAmount, multiplier)
    const currencyCode = getCurrencyCode(wallet, tokenId)

    const spendInfo: EdgeSpendInfo = {
      tokenId,
      spendTargets: [
        {
          publicAddress: address,
          nativeAmount
        }
      ]
    }

    // Create the transaction
    const tx = await wallet.makeSpend(spendInfo)

    console.log({
      action: dryRun ? 'DRY RUN - not broadcast' : 'Preparing transaction',
      walletId: wallet.id,
      tokenId,
      to: address,
      amount: `${exchangeAmount} ${currencyCode}`,
      nativeAmount,
      networkFee: tx.networkFee,
      networkFeeExchange: `${nativeToExchange(
        tx.networkFee,
        getMultiplier(wallet, null)
      )} ${wallet.currencyInfo.currencyCode}`
    })

    if (dryRun) {
      return
    }

    // Sign and broadcast
    const signedTx = await wallet.signTx(tx)
    const broadcastTx = await wallet.broadcastTx(signedTx)
    await wallet.saveTx(broadcastTx)

    console.log({
      status: 'SUCCESS',
      txid: broadcastTx.txid
    })
  }
)

// ============================================================================
// Phase 2 Commands
// ============================================================================

command(
  'wallet-rename',
  {
    usage: '<walletId> <newName>',
    help: 'Rename a wallet',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 2) throw new UsageError(this)

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, argv[0])
    const newName = argv[1]

    await wallet.renameWallet(newName)

    console.log({
      walletId: wallet.id,
      name: newName,
      status: 'Wallet renamed successfully'
    })
  }
)

command(
  'wallet-archive',
  {
    usage: '<walletId>',
    help: 'Archive a wallet (hide from active list)',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, argv[0])

    const opts: EdgeWalletStates = {}
    opts[wallet.id] = { archived: true }
    await session.account.changeWalletStates(opts)

    console.log({
      walletId: wallet.id,
      status: 'Wallet archived'
    })
  }
)

command(
  'wallet-unarchive',
  {
    usage: '<walletId>',
    help: 'Unarchive a wallet (restore to active list)',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)

    // Need to find wallet by ID directly since it may be archived
    const walletId = argv[0]

    const opts: EdgeWalletStates = {}
    opts[walletId] = { archived: false }
    await session.account.changeWalletStates(opts)

    console.log({
      walletId,
      status: 'Wallet unarchived'
    })
  }
)

command(
  'max-spendable',
  {
    usage: '<walletId> <address> [--token <tokenId>]',
    help: 'Calculate maximum spendable amount',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 2) throw new UsageError(this)

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, argv[0])
    const address = argv[1]
    const tokenId = session.commandOptions.token ?? null

    const maxNative = await wallet.getMaxSpendable({
      tokenId,
      spendTargets: [{ publicAddress: address }]
    })

    const multiplier = getMultiplier(wallet, tokenId)
    const maxExchange = nativeToExchange(maxNative, multiplier)
    const currencyCode = getCurrencyCode(wallet, tokenId)

    console.log({
      walletId: wallet.id,
      tokenId,
      currencyCode,
      maxNativeAmount: maxNative,
      maxExchangeAmount: maxExchange,
      formatted: `${maxExchange} ${currencyCode}`
    })
  }
)

command(
  'spend-max',
  {
    usage: '<walletId> <address> [--token <tokenId>] [--dry-run]',
    help: 'Send maximum available balance to an address',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 2) throw new UsageError(this)

    const [walletIdPrefix, address] = argv
    const tokenId = session.commandOptions.token ?? null
    const dryRun = session.commandOptions.dryRun === true

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, walletIdPrefix)

    // Get max spendable amount
    const maxNative = await wallet.getMaxSpendable({
      tokenId,
      spendTargets: [{ publicAddress: address }]
    })

    if (maxNative === '0') {
      console.log('No funds available to spend')
      return
    }

    const multiplier = getMultiplier(wallet, tokenId)
    const maxExchange = nativeToExchange(maxNative, multiplier)
    const currencyCode = getCurrencyCode(wallet, tokenId)

    const spendInfo: EdgeSpendInfo = {
      tokenId,
      spendTargets: [
        {
          publicAddress: address,
          nativeAmount: maxNative
        }
      ]
    }

    // Create the transaction
    const tx = await wallet.makeSpend(spendInfo)

    console.log({
      action: dryRun ? 'DRY RUN - not broadcast' : 'Preparing transaction',
      walletId: wallet.id,
      tokenId,
      to: address,
      amount: `${maxExchange} ${currencyCode}`,
      nativeAmount: maxNative,
      networkFee: tx.networkFee,
      networkFeeExchange: `${nativeToExchange(
        tx.networkFee,
        getMultiplier(wallet, null)
      )} ${wallet.currencyInfo.currencyCode}`
    })

    if (dryRun) {
      return
    }

    // Sign and broadcast
    const signedTx = await wallet.signTx(tx)
    const broadcastTx = await wallet.broadcastTx(signedTx)
    await wallet.saveTx(broadcastTx)

    console.log({
      status: 'SUCCESS',
      txid: broadcastTx.txid
    })
  }
)

command(
  'export-public',
  {
    usage: '<walletId>',
    help: 'Export public key for display (xpub, address, etc.)',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, argv[0])

    const publicKey = await session.account.getDisplayPublicKey(wallet.id)

    console.log({
      walletId: wallet.id,
      type: wallet.type,
      currencyCode: wallet.currencyInfo.currencyCode,
      publicKey
    })
  }
)

command(
  'export-private',
  {
    usage: '<walletId>',
    help: 'Export private key for display (WIF, seed phrase, etc.) - USE WITH CAUTION',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)

    await session.account.waitForAllWallets()
    const wallet = findWallet(session, argv[0])

    const privateKey = await session.account.getDisplayPrivateKey(wallet.id)

    console.log({
      walletId: wallet.id,
      type: wallet.type,
      currencyCode: wallet.currencyInfo.currencyCode,
      privateKey,
      warning: 'KEEP THIS SECRET - Anyone with this key can steal your funds!'
    })
  }
)

// ============================================================================
// Existing commands (preserved)
// ============================================================================

command(
  'wallet-undelete',
  {
    help: "Removes a key's deleted flag",
    usage: '<wallet-id>',
    needsAccount: true
  },
  async function (console, session, argv) {
    if (argv.length !== 1) throw new UsageError(this)
    const walletId = argv[0]

    const opts: EdgeWalletStates = {}
    opts[walletId] = { deleted: false }
    await session.account.changeWalletStates(opts)
  }
)
