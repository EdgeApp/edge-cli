# Wallet CLI Commands

Proposed CLI commands for wallet management based on EdgeAccount and EdgeCurrencyWallet APIs.

## Supported Currencies

The CLI supports two types of currency plugins:

### UTXO-Based (edge-currency-plugins)
Bitcoin, Litecoin, Dogecoin, and other UTXO-based currencies are enabled by default. Configure API keys in `keys.json` as needed.

### Account-Based (edge-currency-accountbased)
Ethereum, Solana, and other account-based currencies require explicit opt-in due to longer initialization times. Enable specific plugins in `keys.json`:

```json
{
  "pluginApiKeys": {
    "ethereum": {
      "enabled": true,
      "evmScanApiKey": ["YOUR_API_KEY"]
    },
    "solana": {
      "enabled": true,
      "heliusApiKey": "YOUR_API_KEY"
    }
  }
}
```

Available account-based plugins include: `ethereum`, `polygon`, `arbitrum`, `optimism`, `base`, `avalanche`, `binancesmartchain`, `fantom`, `solana`, `ripple`, `stellar`, `tron`, `algorand`, `cardano`, `hedera`, `fio`, `tezos`, `filecoin`, `ton`, `polkadot`, `sui`, `cosmoshub`, `osmosis`, `eos`, `telos`, `wax`, and more.

## Wallet Lifecycle Commands

### wallet-create

Create a new currency wallet.

```
edge-cli wallet-create <walletType> [--name <name>]
```

**Arguments:**
- `walletType` - Wallet type (e.g., `wallet:bitcoin`, `wallet:ethereum`)
- `--name` - Optional wallet name

**Output:** Wallet ID

---

### wallet-list

List all wallets with their status.

```
edge-cli wallet-list [--active|--archived|--hidden]
```

**Output:** Table of wallet IDs, names, types, and states

---

### wallet-info

Get detailed info about a specific wallet.

```
edge-cli wallet-info <walletId>
```

**Output:** Name, type, created date, sync status, block height

---

### wallet-rename

Rename a wallet.

```
edge-cli wallet-rename <walletId> <newName>
```

---

### wallet-archive / wallet-unarchive

Change wallet archived state.

```
edge-cli wallet-archive <walletId>
edge-cli wallet-unarchive <walletId>
```

---

### wallet-delete

Delete a wallet (marks as deleted).

```
edge-cli wallet-delete <walletId>
```

---

### wallet-resync

Resync wallet blockchain from scratch.

```
edge-cli wallet-resync <walletId>
```

---

## Balance Commands

### balance

Get wallet balance(s).

```
edge-cli balance <walletId> [--token <tokenId>]
```

**Output:** Balance in both native and exchange denomination for main currency and/or specified token

---

### balance-all

Get balances for all active wallets.

```
edge-cli balance-all
```

**Output:** Table of all wallets with their balances

---

## Address Commands

### address

Get receive address(es) for a wallet.

```
edge-cli address <walletId> [--count <n>]
```

**Arguments:**
- `--count` - Number of addresses to return (default: 1)

**Output:** Address(es) with any associated metadata

---

### address-parse

Parse a payment URI or address.

```
edge-cli address-parse <walletId> <uri>
```

**Output:** Parsed address, amount (native), label, message, etc.

---

### address-encode

Encode payment details into a URI.

```
edge-cli address-encode <walletId> <address> [--amount <amount>] [--label <label>]
```

**Arguments:**
- `--amount` - Amount in exchange denomination (e.g., "0.001" for 0.001 BTC)

**Output:** Payment URI string (e.g., `bitcoin:1ABC...?amount=0.001`)

---

## Transaction Commands

### tx-list

List transactions for a wallet.

```
edge-cli tx-list <walletId> [--limit <n>] [--start <date>] [--end <date>] [--token <tokenId>]
```

**Output:** Table of transactions with date, amount (exchange denomination), confirmations, txid

---

### tx-count

Get transaction count.

```
edge-cli tx-count <walletId> [--token <tokenId>]
```

---

### tx-info

Get detailed transaction information.

```
edge-cli tx-info <walletId> <txid>
```

**Output:** Full transaction details including metadata, fees, confirmations

---

## Spending Commands

### spend

Create, sign, and broadcast a transaction.

```
edge-cli spend <walletId> <address> <amount> [--token <tokenId>] [--memo <memo>]
```

**Arguments:**
- `amount` - Amount in exchange denomination (e.g., "0.001" BTC, "1.5" ETH)
- `--token` - Token ID for token transfers
- `--memo` - Optional memo/note
- `--native` - Interpret amount as native units (satoshis, wei, etc.)

**Options:**
- `--dry-run` - Create and sign but don't broadcast
- `--fee-rate <rate>` - Custom fee rate

**Output:** Transaction ID on success

---

### spend-max

Spend maximum available balance.

```
edge-cli spend-max <walletId> <address> [--token <tokenId>]
```

---

### max-spendable

Calculate maximum spendable amount.

```
edge-cli max-spendable <walletId> <address> [--token <tokenId>]
```

**Output:** Maximum amount that can be sent (in exchange denomination)

---

### sweep

Sweep private key into wallet.

```
edge-cli sweep <walletId> <privateKey>
```

---

## Key Export Commands

### export-public

Export public key for display.

```
edge-cli export-public <walletId>
```

**Output:** Display-formatted public key (xpub, address, etc.)

---

### export-private

Export private key for display (requires confirmation).

```
edge-cli export-private <walletId> [--confirm]
```

**Output:** Display-formatted private key (WIF, seed phrase, etc.)

---

### export-raw

Export raw key data as JSON.

```
edge-cli export-raw <walletId> [--private]
```

---

## Token Commands

### token-list

List available tokens for a wallet.

```
edge-cli token-list <walletId>
```

**Output:** Available tokens with enabled status

---

### token-enable

Enable a token on a wallet.

```
edge-cli token-enable <walletId> <tokenId>
```

---

### token-disable

Disable a token on a wallet.

```
edge-cli token-disable <walletId> <tokenId>
```

---

### token-detected

List tokens detected on-chain but not yet enabled.

```
edge-cli token-detected <walletId>
```

---

## Wallet Types Commands

### wallet-types

List available wallet types from enabled plugins.

```
edge-cli wallet-types
```

**Output:** List of wallet types (e.g., `wallet:bitcoin`, `wallet:ethereum`)

---

### wallet-split-types

List splittable wallet types for a wallet.

```
edge-cli wallet-split-types <walletId>
```

---

### wallet-split

Split a wallet into a new type (e.g., BCH from BTC).

```
edge-cli wallet-split <walletId> <newWalletType>
```

**Output:** New wallet ID

---

## Debugging Commands

### wallet-dump

Dump wallet data for debugging.

```
edge-cli wallet-dump <walletId>
```

**Output:** JSON dump of wallet internal state

---

## Implementation Priority

### Phase 1 - Core Operations
1. `wallet-create`
2. `wallet-list`
3. `wallet-info`
4. `balance`
5. `address`
6. `tx-list`
7. `spend`

### Phase 2 - Extended Operations
8. `wallet-rename`
9. `wallet-archive` / `wallet-unarchive`
10. `max-spendable`
11. `spend-max`
12. `export-public`
13. `export-private`

### Phase 3 - Token Support
14. `token-list`
15. `token-enable`
16. `token-disable`
17. `token-detected`

### Phase 4 - Advanced
18. `wallet-types`
19. `wallet-split-types`
20. `wallet-split`
21. `sweep`
22. `wallet-dump`
23. `wallet-resync`
24. `address-parse`
25. `address-encode`

---

## Amount Denominations

Edge Core uses three denomination types:

| Type | Description | Example (Bitcoin) |
|------|-------------|-------------------|
| **Native** | Smallest indivisible unit stored on-chain | `100000` satoshis |
| **Exchange** | Human-readable unit using multiplier from `EdgeDenomination` | `0.001` BTC |
| **Display** | GUI-specific formatting (EdgeReact GUI only) | "0.001 BTC" with symbol |

The CLI uses **exchange denomination** by default for all amount inputs and outputs. This is the multiplier-based conversion (e.g., 1 BTC = 100,000,000 satoshis).

To specify native amounts directly, use the `--native` flag where available.

---

## Notes

- All commands requiring a logged-in account will use the session from prior `password-login`, `pin-login`, or `key-login`
- Amounts use exchange denomination by default (e.g., "0.001" BTC, not "100000" satoshis)
- Wallet IDs can be specified by full ID or partial match if unambiguous
- JSON output available via `--json` flag for scripting
- Interactive mode: run `edge-cli` with no arguments to enter REPL with persistent session
