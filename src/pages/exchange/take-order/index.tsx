import React, { FC, useCallback } from 'react'
import { useBlockNumber } from '../../../state/application/hooks'
import Button from '../../../components/Button'
import { ButtonConfirmed, ButtonError } from '../../../components/Button'
import Alert from '../../../components/Alert'
import { ArrowLeftIcon, ClipboardCheckIcon, ClipboardCopyIcon } from '@heroicons/react/solid'
import { ChainId, Price } from '@tangoswapcash/sdk'
import Container from '../../../components/Container'
import DoubleGlowShadow from '../../../components/DoubleGlowShadow'
import Head from 'next/head'
import NavLink from '../../../components/NavLink'
import NetworkGuard from '../../../guards/Network'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { useActiveWeb3React } from '../../../hooks/useActiveWeb3React'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import useParsedQueryString from '../../../hooks/useParsedQueryString'
import { useExpertModeManager } from '../../../state/user/hooks'
import SUSHI_ABI from '../../../constants/abis/sushi.json'
import { useEffect, useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { getAddress } from '@ethersproject/address'
import { parseUnits } from '@ethersproject/units'
import { arrayify, hexlify, splitSignature } from '@ethersproject/bytes'
import { useCurrency } from '../../../hooks/Tokens'
import CurrencyLogo from '../../../components/CurrencyLogo'
import { tryParseAmount } from '../../../functions/parse'
import { CurrencyAmount, JSBI, ORDERS_CASH_V1_ADDRESS, SEP206_ADDRESS, LimitOrder } from '@tangoswapcash/sdk'
import {
  useV2TradeExactIn as useTradeExactIn,
  useV2TradeExactOut as useTradeExactOut,
} from '../../../hooks/useV2Trades'
import { Currency } from '@tangoswapcash/sdk'
import { ApprovalState, useApproveCallback, useContract, useLimitOrderContract } from '../../../hooks'
import Dots from '../../../components/Dots'
import { useWalletModalToggle } from '../../../state/application/hooks'
import PriceRatio2 from '../../../features/exchange-v1/limit-order/PriceRatio2'
import { Field } from '../../../state/limit-order/actions'
import { useLimitOrderCallback } from '../../../hooks/useLimitOrderCallback'
import { useCurrencyBalances } from '../../../state/wallet/hooks'
import { useMemo } from 'react'
import { useSingleCallResult } from '../../../state/multicall/hooks'
import LabelTokenCurrency from '../../../components/LabelTokenCurrency'
import useCopyClipboard from '../../../hooks/useCopyClipboard'
import Typography from '../../../components/Typography'
import { getBalanceOf } from '../../../functions/getBalanceOf'
import useGetOrdersLocal from '../../../hooks/useGetOrdersLocal'

function b64ToUint6(nChr) {
  return nChr > 64 && nChr < 91
    ? nChr - 65
    : nChr > 96 && nChr < 123
    ? nChr - 71
    : nChr > 47 && nChr < 58
    ? nChr + 4
    : nChr === 45
    ? 62
    : nChr === 95
    ? 63
    : 0
}

function base64DecToArr(sBase64, nBlocksSize: number | undefined) {
  var sB64Enc = sBase64.replace(/=/g, ''),
    nInLen = sB64Enc.length,
    nOutLen = nBlocksSize ? Math.ceil(((nInLen * 3 + 1) >> 2) / nBlocksSize) * nBlocksSize : (nInLen * 3 + 1) >> 2,
    taBytes = new Uint8Array(nOutLen)

  for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
    nMod4 = nInIdx & 3
    nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << (6 * (3 - nMod4))
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
        taBytes[nOutIdx] = (nUint24 >>> ((16 >>> nMod3) & 24)) & 255
      }
      nUint24 = 0
    }
  }

  return taBytes
}

// updates the swap state to use the defaults for a given network
function useDefaultsFromURLSearch():
  | {
      oParam: string | undefined
    }
  | undefined {
  const { chainId, account } = useActiveWeb3React()
  const parsedQs = useParsedQueryString()

  if (!chainId) return

  return {
    oParam: parsedQs.o,
  }
}

function formatDateTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString()
}

function timeDiff(dueTime: number, now: number) {
  if (now > dueTime) return '(expired)'

  const diff = dueTime - now

  let msec = diff

  const dd = Math.floor(msec / 1000 / 60 / 60 / 24)
  if (dd > 0) return `(in ~${dd} days)`
  msec -= dd * 1000 * 60 * 60 * 24

  const hh = Math.floor(msec / 1000 / 60 / 60)
  if (hh > 0) return `(in ~${hh} hours)`
  msec -= hh * 1000 * 60 * 60

  const mm = Math.floor(msec / 1000 / 60)
  if (mm > 0) return `(in ~${mm} minutes)`
  msec -= mm * 1000 * 60

  const ss = Math.floor(msec / 1000)
  if (dd > 0) msec -= ss * 1000
  return `(in ~${ss} seconds)`
}

export function useGetSigner(
  coinsToMaker: string,
  coinsToTaker: string,
  dueTime80: string,
  r: string,
  s: string
): string | undefined {
  const limitOrderContract = useLimitOrderContract()

  const args = useMemo(() => {
    if (!coinsToMaker || !coinsToTaker || !dueTime80 || !r || !s || !limitOrderContract) return
    const { methodName, args, value } = LimitOrder.getSignerCallParameters(coinsToMaker, coinsToTaker, dueTime80, r, s)
    return args
  }, [coinsToMaker, coinsToTaker, dueTime80, r, s])

  const result = useSingleCallResult(args ? limitOrderContract : null, 'getSigner', args)?.result
  // console.log('****** result: ', result)
  return result?.at(0)
}

export function useIsReplay(makerAddress: string, dueTime: string): boolean | undefined {
  const limitOrderContract = useLimitOrderContract()

  const args = useMemo(() => {
    if (!makerAddress || !dueTime || !limitOrderContract) return
    const { methodName, args, value } = LimitOrder.isReplayCallParameters(makerAddress, dueTime)
    return args
  }, [makerAddress, dueTime])

  const result = useSingleCallResult(args ? limitOrderContract : null, 'isReplay', args)?.result
  // console.log('****** result: ', result)
  return result?.at(0)
}

function bnToHex(n: bigint) {
  return '0x' + n.toString(16)
}

function TakeOrderPage() {
  const { oParam } = useDefaultsFromURLSearch()
  const u8arr = base64DecToArr(oParam, undefined)
  const toggleWalletModal = useWalletModalToggle()
  const [isCopied, setCopied] = useCopyClipboard(10000)

  const CoinTypeToMakerStart = 1
  const AmountToMakerStart = 1 + 20
  const CoinTypeToTakerStart = 1 + 20 + 12
  const AmountToTakerStart = 1 + 20 + 12 + 20
  const DueTimeStart = 1 + 20 + 12 + 20 + 12
  const SigRStart = 1 + 20 + 12 + 20 + 12 + 10
  const SigSStart = 1 + 20 + 12 + 20 + 12 + 10 + 32
  const SigVStart = 1 + 20 + 12 + 20 + 12 + 10 + 32 + 32

  const order = {
    coinTypeToMaker: getAddress(hexlify(u8arr.slice(CoinTypeToMakerStart, AmountToMakerStart))),
    amountToMakerBN: BigNumber.from(hexlify(u8arr.slice(AmountToMakerStart, CoinTypeToTakerStart))),
    coinsToMaker: hexlify(u8arr.slice(CoinTypeToMakerStart, CoinTypeToTakerStart)),

    coinTypeToTaker: getAddress(hexlify(u8arr.slice(CoinTypeToTakerStart, AmountToTakerStart))),
    amountToTakerBN: BigNumber.from(hexlify(u8arr.slice(AmountToTakerStart, DueTimeStart))),
    coinsToTaker: hexlify(u8arr.slice(CoinTypeToTakerStart, DueTimeStart)),

    dueTime: BigNumber.from(hexlify(u8arr.slice(DueTimeStart, SigRStart))),
    r: BigNumber.from(hexlify(u8arr.slice(SigRStart, SigSStart))).toHexString(),
    s: BigNumber.from(hexlify(u8arr.slice(SigSStart, SigVStart))).toHexString(),
    v: BigNumber.from(hexlify(u8arr.slice(SigVStart))),
  }

  const { i18n } = useLingui()
  const limitOrderContract = useLimitOrderContract()
  const { account, chainId, library } = useActiveWeb3React()
  let coinTypeToMaker = order.coinTypeToMaker
  if (coinTypeToMaker == SEP206_ADDRESS[chainId]) {
    coinTypeToMaker = 'BCH'
  }

  const [orders, setOrders] = useState(useGetOrdersLocal())

  const inputCurrency = useCurrency(coinTypeToMaker)
  const inputAmountTemp = parseUnits(order.amountToMakerBN.toString(), 0)

  let coinTypeToTaker = order.coinTypeToTaker
  if (coinTypeToTaker == SEP206_ADDRESS[chainId]) {
    coinTypeToTaker = 'BCH'
  }
  const outputCurrency = useCurrency(coinTypeToTaker)

  const currencies: { [field in Field]?: Currency } = {
    [Field.INPUT]: inputCurrency ?? undefined,
    [Field.OUTPUT]: outputCurrency ?? undefined,
  }

  const parsedInputAmount = CurrencyAmount.fromRawAmount(inputCurrency, JSBI.BigInt(inputAmountTemp.toString()))
  const outputAmountTemp = parseUnits(order.amountToTakerBN.toString(), 0)
  const parsedOutputAmount = CurrencyAmount.fromRawAmount(outputCurrency, JSBI.BigInt(outputAmountTemp.toString()))

  const parsedAmounts = {
    [Field.INPUT]: parsedInputAmount,
    [Field.OUTPUT]: parsedOutputAmount,
  }

  const limitPrice = new Price(
    parsedInputAmount.currency,
    parsedOutputAmount.currency,
    parsedInputAmount.quotient,
    parsedOutputAmount.quotient
  )

  const blockNumber = useBlockNumber()
  const [expiration, setExpiration] = useState<string>(null)
  const [isExpired, setIsExpired] = useState<boolean>(null)

  const [{ showConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  const [balanceOfMaker, setBalanceOfMaker] = useState(0);

  const dueTime = Math.floor(Number(order.dueTime.toString()) / 1_000_000_000)

  useEffect(() => {
    const now = new Date().getTime()
    setExpiration(timeDiff(dueTime, now))
    setIsExpired(now > dueTime)
  }, [blockNumber])

  const [tokenApprovalState, tokenApprove] = useApproveCallback(
    parsedInputAmount,
    chainId && ORDERS_CASH_V1_ADDRESS[chainId]
  )

  const currency = inputCurrency
  const showTokenApprove =
    chainId &&
    currency &&
    !currency.isNative &&
    parsedInputAmount &&
    (tokenApprovalState === ApprovalState.NOT_APPROVED || tokenApprovalState === ApprovalState.PENDING)

  // TODO(BitcoinIsCash): ver de donde sacamos el VERSION
  const version = 1

  // the callback to execute the swap
  const { callback: swapCallback, error: swapCallbackError } = useLimitOrderCallback(
    parsedInputAmount,
    parsedOutputAmount,
    order.coinsToMaker,
    order.coinsToTaker,
    order.dueTime.toString(),
    order.r,
    order.s,
    Number(order.v.toString()),
    version
  )

  const dueTime80 = order.dueTime.toString()
  const dueTime80_v8_version8 = bnToHex(
    (BigInt(dueTime80) << 16n) | (BigInt(order.v.toString()) << 8n) | BigInt(version)
  )

  const makerAddress = useGetSigner(order.coinsToMaker, order.coinsToTaker, dueTime80_v8_version8, order.r, order.s)
  // console.log('makerAddress: ', makerAddress)

  const handleSwap = useCallback(() => {
    if (!swapCallback) {
      return
    }
    setSwapState({
      attemptingTxn: true,
      showConfirm,
      swapErrorMessage: undefined,
      txHash: undefined,
    })
    swapCallback()
      .then((hash) => {
        setSwapState({
          attemptingTxn: false,
          showConfirm,
          swapErrorMessage: undefined,
          txHash: hash,
        })
        fillOrderLocal()
      })
      .catch((error) => {
        setSwapState({
          attemptingTxn: false,
          showConfirm,
          swapErrorMessage: error.message,
          txHash: undefined,
        })
      })
  }, [swapCallback, showConfirm, account, parsedInputAmount?.currency?.symbol, parsedOutputAmount?.currency?.symbol])

  const relevantTokenBalances = useCurrencyBalances(account ?? undefined, [
    inputCurrency ?? undefined,
    outputCurrency ?? undefined,
  ])

  const walletBalances = {
    [Field.INPUT]: relevantTokenBalances[0],
    [Field.OUTPUT]: relevantTokenBalances[1],
  }

  let inputError: string | undefined
  if (!account) {
    inputError = 'Connect Wallet'
  }

  // compare input balance to max input based on version
  const [balanceIn, amountIn] = [walletBalances[Field.INPUT], parsedAmounts[Field.INPUT]]

  if (!balanceIn) {
    inputError = i18n._(t`Loading balance`)
  }

  if (balanceIn && amountIn && balanceIn.lessThan(amountIn)) {
    inputError = i18n._(t`Insufficient ${currencies[Field.INPUT]?.symbol} balance`)
  }

  if (isExpired) {
    inputError = i18n._(t`Order Expired`)
  }

  const isReplayed = useIsReplay(makerAddress, order.dueTime.toString())
  // console.log('isReplayed: ', isReplayed)
  if (isReplayed) {
    inputError = i18n._(t`Order Fulfilled`)
  }


  const disabled = !!inputError || tokenApprovalState === ApprovalState.PENDING

  let sufficientAmount = false;
  const WBCHADDRESS = '0x3743ec0673453e5009310c727ba4eaf7b3a1cc04'
  const BCHADDRESS = '0x0000000000000000000000000000000000002711'
  const makerPayment = Number(parsedOutputAmount?.toSignificant(6));

  let address = chainId && outputCurrency?.wrapped?.address

  if (outputCurrency?.symbol == "BCH") {
    address = chainId && BCHADDRESS
  } else if (outputCurrency?.symbol == "WBCH") {
    address = chainId && WBCHADDRESS;
  }
  const outputTokenContract = useContract(chainId && address, SUSHI_ABI, true) 
  getBalanceOf(outputTokenContract, makerAddress).then((balance) => {
    setBalanceOfMaker(balance)
  })
  sufficientAmount = balanceOfMaker >= makerPayment
    
  const [isCanceled, setIsCanceled] = useState(false)

  const cancelOrderCall = async () => {
    await limitOrderContract.addNewDueTime(order.dueTime.toString())
    setIsCanceled(true)
    orders.map(order => {
      const id = order.id
      const ordersFilter = orders.map(or => or.id == id ? {...or, status: 'cancelled'} : or)
      setOrders(ordersFilter)
      localStorage.setItem('orders', JSON.stringify(ordersFilter))
    })
  }

  function fillOrderLocal() {
    orders.map(order => {
      const id = order.id
      const ordersFilter = orders.map(or => or.id == id ? {...or, status: 'filled'} : or)
      setOrders(ordersFilter)
      localStorage.setItem('orders', JSON.stringify(ordersFilter))
    })
  }

  let button = (
    <Button disabled={true} color={true ? 'gray' : 'pink'} className="mb-4">
      (<Dots>{i18n._(t`Loading order`)}</Dots>)
    </Button>
  )
  if (!account)
    button = (
      <Button color="pink" onClick={toggleWalletModal}>
        {i18n._(t`Connect Wallet`)}
      </Button>
    )
  else if (makerAddress || inputError == `Insufficient ${currencies[Field.INPUT]?.symbol} balance`) 
    if (account == makerAddress && inputError !== "Order Fulfilled") {
      !isCanceled ? 
      button = (
      <Button color='pink' onClick={cancelOrderCall}>
        {i18n._(t`Cancel Order`)} 
      </Button>
      )
      : button = (
        <Button disabled={true} color='gray'>
          {i18n._(t`Order Canceled`)}
        </Button>
      )
    }
  else if (inputError)
    button = (
      <Button disabled={true} color="gray">
        {inputError}
      </Button>
    )
  else if (showTokenApprove)
    button = (
      <Button disabled={disabled} onClick={tokenApprove} color={disabled ? 'gray' : 'pink'} className="mb-4">
        {tokenApprovalState === ApprovalState.PENDING ? (
          <Dots>{i18n._(t`Approving ${currency.symbol}`)}</Dots>
        ) : (
          i18n._(t`Approve ${currency.symbol}`)
        )}
      </Button>
    )
  else if (sufficientAmount == false)
    button = (
      <Button disabled={true} color="gray">
        {i18n._(t`Maker's Balance Is Not Enough`)}
      </Button>
    )
  else {
    button = (
      <ButtonError onClick={handleSwap} id="swap-button" disabled={disabled} error={disabled}>
        {i18n._(t`Take Limit Order`)}
      </ButtonError>
    )
  }

  let buttonCoppy = isCopied ?
    <ClipboardCheckIcon width={16} height={16} onClick={() => setCopied(makerAddress)} className="cursor-pointer ml-1"/> :
    <ClipboardCopyIcon width={16} height={16} onClick={() => setCopied(makerAddress)} className="cursor-pointer ml-1"/>
  return (
    <Container id="take-order-page" className="py-4 md:py-8 lg:py-12" maxWidth="lg">
      <Head>
        <title>Take Order | Orders.Cash</title>
        <meta name="description" content="Take order..." />
      </Head>

      <DoubleGlowShadow>
        <div className="p-4 space-y-4 rounded bg-dark-900 z-1">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="text-xl font-bold text-white">{i18n._(t`You pay:`)}</div>
              <LabelTokenCurrency
                currency={inputCurrency}
                parsedAmount={parsedInputAmount?.toSignificant(6)}
                tokenAddress={inputCurrency?.wrapped?.address}
              />
            </div>
            <div className="flex justify-between px-5 py-3 rounded bg-dark-800 items-center">
              <span className="font-bold text-secondary">{i18n._(t`Rate`)}</span>
              <span className="text-primary">
                <PriceRatio2 currentPrice={limitPrice} currencies={currencies} parsedAmounts={parsedAmounts} />
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 text-xl font-bold text-white">{i18n._(t`You receive:`)}</div>
              <LabelTokenCurrency
                currency={outputCurrency}
                parsedAmount={parsedOutputAmount?.toSignificant(6)}
                tokenAddress={outputCurrency?.wrapped?.address}
               />
            </div>
          </div>
          <div className="flex justify-between px-5 py-3 rounded bg-dark-800">
            <span className="font-bold text-secondary">{i18n._(t`Order Expiration`)}</span>
            <span className="text-primary">{formatDateTime(dueTime) + ' ' + expiration}</span>
          </div>

          <div className='flex flex-col rounded bg-dark-800'>
            <div className="flex justify-between px-5 py-1 items-center">
              <span className="font-bold text-secondary">{i18n._(t`Maker address`)}</span>
              <div className="flex items-center">
                {
                  makerAddress ?
                    <Typography variant="sm" className="flex text-primary truncate">
                      {makerAddress.substring(0, 23) + '...'} {buttonCoppy}
                    </Typography> :
                    <Dots><span/></Dots>
                }
              </div>
            </div>
            <div className="flex justify-between px-5 py-1">
              <span className="font-bold text-secondary">{i18n._(t`Order status`)}</span>
              <span className="text-primary ">
                {isCanceled ? 
                  i18n._(t`Order Canceled`) 
                :
                inputError ? 
                 inputError !== `Insufficient ${currencies[Field.INPUT]?.symbol} balance` ?
                  inputError
                : i18n._(t`Available`) 
                :
                makerAddress ? 
                  sufficientAmount ?
                     i18n._(t`Available`)
                   : i18n._(t`Maker's Balance Is Not Enough`)
                   : <Dots><span/></Dots>
                }
              </span>
            </div>
          </div>

          {button}
        </div>
      </DoubleGlowShadow>
    </Container>
  )
}

export default TakeOrderPage
