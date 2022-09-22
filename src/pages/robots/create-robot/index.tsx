import { ApprovalState, useApproveCallback } from '../../../hooks/useApproveCallback'
import { AutoRow, RowBetween } from '../../../components/Row'
import Button, { ButtonError } from '../../../components/Button'
import { Currency, CurrencyAmount, Percent, WNATIVE, currencyEquals } from '@tangoswapcash/sdk'
import { ONE_BIPS, ZERO_PERCENT } from '../../../constants'
import React, { useCallback, useState } from 'react'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../../modals/TransactionConfirmationModal'
import { calculateGasMargin, calculateSlippageAmount, getGasPrice } from '../../../functions/trade'
import { currencyId, maxAmountSpend } from '../../../functions/currency'
import { useDerivedMintInfo, useMintActionHandlers, useMintState } from '../../../state/mint/hooks'
import { useExpertModeManager, useUserSlippageToleranceWithDefault } from '../../../state/user/hooks'

import Alert from '../../../components/Alert'
import { AutoColumn } from '../../../components/Column'
import { BigNumber } from '@ethersproject/bignumber'
import { ConfirmAddModalBottom } from '../../../features/exchange-v1/liquidity/ConfirmAddModalBottom'
import Container from '../../../components/Container'
import CurrencyInputPanel from '../../../components/CurrencyInputPanel'
import CurrencyLogo from '../../../components/CurrencyLogo'
import Dots from '../../../components/Dots'
import DoubleCurrencyLogo from '../../../components/DoubleLogo'
import DoubleGlowShadow from '../../../components/DoubleGlowShadow'
import ExchangeHeader from '../../../features/trade/Header'
import { Field } from '../../../state/mint/actions'
import Head from 'next/head'
import LiquidityHeader from '../../../features/exchange-v1/liquidity/LiquidityHeader'
import LiquidityPrice from '../../../features/exchange-v1/liquidity/LiquidityPrice'
import { MinimalPositionCard } from '../../../components/PositionCard'
import NavLink from '../../../components/NavLink'
import { PairState } from '../../../hooks/useV2Pairs'
import { Plus } from 'react-feather'
import { TransactionResponse } from '@ethersproject/providers'
import Typography from '../../../components/Typography'
import UnsupportedCurrencyFooter from '../../../features/exchange-v1/swap/UnsupportedCurrencyFooter'
import Web3Connect from '../../../components/Web3Connect'
import { t } from '@lingui/macro'
import { useActiveWeb3React } from '../../../hooks/useActiveWeb3React'
import { useCurrency } from '../../../hooks/Tokens'
import { useIsSwapUnsupported } from '../../../hooks/useIsSwapUnsupported'
import { useLingui } from '@lingui/react'
import { useRouter } from 'next/router'
import { useRouterContract } from '../../../hooks'
import { useTransactionAdder } from '../../../state/transactions/hooks'
import useTransactionDeadline from '../../../hooks/useTransactionDeadline'
import { useWalletModalToggle } from '../../../state/application/hooks'
import PanelLimitPrice from '../../../components/PanelLimitPrice'

const DEFAULT_ADD_V2_SLIPPAGE_TOLERANCE = new Percent(50, 10_000)

export default function CreateRobotPage() {
  const { i18n } = useLingui()
  const { account, chainId, library } = useActiveWeb3React()
  const router = useRouter()
  const tokens = router.query.tokens
  const [currencyIdA, currencyIdB] = (tokens as string[]) || [undefined, undefined]

  const currencyA = useCurrency(currencyIdA)
  const currencyB = useCurrency(currencyIdB)

  const [currenciesSelected, setCurrenciesSelected] = useState(null)

  const oneCurrencyIsWETH = Boolean(
    chainId &&
      ((currencyA && currencyEquals(currencyA, WNATIVE[chainId])) ||
        (currencyB && currencyEquals(currencyB, WNATIVE[chainId])))
  )

  const toggleWalletModal = useWalletModalToggle() // toggle wallet when disconnected

  const [isExpertMode] = useExpertModeManager()

  // mint state
  const { independentField, typedValue, otherTypedValue } = useMintState()
  const {
    dependentField,
    currencies,
    pair,
    pairState,
    currencyBalances,
    parsedAmounts,
    price,
    noLiquidity,
    liquidityMinted,
    poolTokenPercentage,
    error,
  } = useDerivedMintInfo(currencyA ?? undefined, currencyB ?? undefined)

  const { onFieldAInput, onFieldBInput } = useMintActionHandlers(noLiquidity)

  const isValid = !error

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  // txn values
  const deadline = useTransactionDeadline() // custom from users settings

  // const [allowedSlippage] = useUserSlippageTolerance(); // custom from users

  const allowedSlippage = useUserSlippageToleranceWithDefault(DEFAULT_ADD_V2_SLIPPAGE_TOLERANCE) // custom from users

  const [txHash, setTxHash] = useState<string>('')

  // get formatted amounts
  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: noLiquidity ? otherTypedValue : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  // get the max amounts user can add
  const maxAmounts: { [field in Field]?: CurrencyAmount<Currency> } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmountSpend(currencyBalances[field]),
      }
    },
    {}
  )

  const atMaxAmounts: { [field in Field]?: CurrencyAmount<Currency> } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? '0'),
      }
    },
    {}
  )

  const routerContract = useRouterContract()

  // check whether the user has approved the router on the tokens
  const [approvalA, approveACallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_A], routerContract?.address)
  const [approvalB, approveBCallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_B], routerContract?.address)

  const addTransaction = useTransactionAdder()

  async function onAdd() {
    if (!chainId || !library || !account || !routerContract) return

    const { [Field.CURRENCY_A]: parsedAmountA, [Field.CURRENCY_B]: parsedAmountB } = parsedAmounts

    console.log({ parsedAmountA, parsedAmountB, currencyA, currencyB, deadline })

    if (!parsedAmountA || !parsedAmountB || !currencyA || !currencyB || !deadline) {
      return
    }

    const amountsMin = {
      [Field.CURRENCY_A]: calculateSlippageAmount(parsedAmountA, noLiquidity ? ZERO_PERCENT : allowedSlippage)[0],
      [Field.CURRENCY_B]: calculateSlippageAmount(parsedAmountB, noLiquidity ? ZERO_PERCENT : allowedSlippage)[0],
    }

    let estimate,
      method: (...args: any) => Promise<TransactionResponse>,
      args: Array<string | string[] | number>,
      value: BigNumber | null
    if (currencyA.isNative || currencyB.isNative) {
      const tokenBIsETH = currencyB.isNative
      estimate = routerContract.estimateGas.addLiquidityETH
      method = routerContract.addLiquidityETH
      args = [
        (tokenBIsETH ? currencyA : currencyB)?.wrapped?.address ?? '', // token
        (tokenBIsETH ? parsedAmountA : parsedAmountB).quotient.toString(), // token desired
        amountsMin[tokenBIsETH ? Field.CURRENCY_A : Field.CURRENCY_B].toString(), // token min
        amountsMin[tokenBIsETH ? Field.CURRENCY_B : Field.CURRENCY_A].toString(), // eth min
        account,
        deadline.toHexString(),
      ]
      value = BigNumber.from((tokenBIsETH ? parsedAmountB : parsedAmountA).quotient.toString())
    } else {
      estimate = routerContract.estimateGas.addLiquidity
      method = routerContract.addLiquidity
      args = [
        currencyA?.wrapped?.address ?? '',
        currencyB?.wrapped?.address ?? '',
        parsedAmountA.quotient.toString(),
        parsedAmountB.quotient.toString(),
        amountsMin[Field.CURRENCY_A].toString(),
        amountsMin[Field.CURRENCY_B].toString(),
        account,
        deadline.toHexString(),
      ]
      value = null
    }

    setAttemptingTxn(true)
    try {
      const estimatedGasLimit = await estimate(...args, {
        ...(value ? { value } : {}),
        gasPrice: getGasPrice(),
      })

      const response = await method(...args, {
        ...(value ? { value } : {}),
        gasLimit: calculateGasMargin(estimatedGasLimit),
        gasPrice: getGasPrice(),
      })

      setAttemptingTxn(false)

      addTransaction(response, {
        summary: i18n._(
          t`Add ${parsedAmounts[Field.CURRENCY_A]?.toSignificant(3)} ${
            currencies[Field.CURRENCY_A]?.symbol
          } and ${parsedAmounts[Field.CURRENCY_B]?.toSignificant(3)} ${currencies[Field.CURRENCY_B]?.symbol}`
        ),
      })

      setTxHash(response.hash)
    } catch (error) {
      setAttemptingTxn(false)
      // we only care if the error is something _other_ than the user rejected the tx
      if (error?.code !== 4001) {
        console.error(error)
      }
    }
  }

  const handleCurrencyASelect = (currencyA: Currency) => {
    setCurrenciesSelected({...currenciesSelected, currencyA: currencyA})
  }
  const handleCurrencyBSelect = (currencyB: Currency) => {
    console.log(currenciesSelected)
    setCurrenciesSelected({...currenciesSelected, currencyB: currencyB})      
  }

  const addIsUnsupported = useIsSwapUnsupported(currencies?.CURRENCY_A, currencies?.CURRENCY_B)

  // console.log(
  //   { addIsUnsupported, isValid, approvaonFieldBInputlA, approvalB },
  //   approvalA === ApprovalState.APPROVED && approvalB === ApprovalState.APPROVED
  // )
  return (
    <>
      <Head>
        <title>Create Robots | Orders.Cash</title>
        <meta
          key="description"
          name="description"
          content="Add liquidity to the TANGOswap AMM to enable gas optimised and low slippage trades across countless networks"
        />
      </Head>

      <Container id="create-robot-page" className="py-4 space-y-6 md:py-8 lg:py-12" maxWidth="2xl">
        <div className="flex items-center justify-between mb-5">
          <NavLink href="/robots/robots-list?filter=portfolio">
            <a className="flex items-center space-x-2 text-base font-medium text-center cursor-pointer text-secondary hover:text-high-emphesis">
              <span>{i18n._(t`View Orders Robots`)}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </NavLink>
        </div>

        <DoubleGlowShadow>
          <div className="p-4 space-y-4 rounded bg-dark-900" style={{ zIndex: 1 }}>
            <div className="flex flex-col space-y-4">
              {pair && pairState !== PairState.INVALID && (
                <LiquidityHeader input={currencies[Field.CURRENCY_A]} output={currencies[Field.CURRENCY_B]} />
              )}
              <div>
                <CurrencyInputPanel
                  value={formattedAmounts[Field.CURRENCY_A]}
                  onUserInput={onFieldAInput}
                  onMax={() => {
                    onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '')
                  }}
                  onCurrencySelect={handleCurrencyASelect}
                  showMaxButton={!atMaxAmounts[Field.CURRENCY_A]}
                  currency={currenciesSelected && currenciesSelected.currencyA && currenciesSelected.currencyA}
                  id="add-liquidity-input-tokena"
                  showCommonBases
                />

                <AutoColumn justify="space-between" className="py-2.5">
                  <AutoRow justify={isExpertMode ? 'space-between' : 'flex-start'} style={{ padding: '0 1rem' }}>
                    <button className="z-10 -mt-6 -mb-6 rounded-full cursor-default bg-dark-900 p-3px">
                      <div className="p-3 rounded-full bg-dark-800">
                        <Plus size="32" />
                      </div>
                    </button>
                  </AutoRow>
                </AutoColumn>

                <CurrencyInputPanel
                  value={formattedAmounts[Field.CURRENCY_B]}
                  onUserInput={onFieldBInput}
                  onCurrencySelect={handleCurrencyBSelect}
                  onMax={() => {
                    onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')
                  }}
                  showMaxButton={!atMaxAmounts[Field.CURRENCY_B]}
                  currency={currenciesSelected && currenciesSelected.currencyB && currenciesSelected.currencyB}
                  id="add-liquidity-input-tokenb"
                  showCommonBases
                />
              </div>

              {currencies[Field.CURRENCY_A] && currencies[Field.CURRENCY_B] && pairState !== PairState.INVALID && (
                <div className="p-1 rounded bg-dark-800">
                  <LiquidityPrice
                    currencies={currencies}
                    price={price}
                    noLiquidity={noLiquidity}
                    poolTokenPercentage={poolTokenPercentage}
                    className="bg-dark-900"
                  />
                </div>
              )}

              {
                currenciesSelected && currenciesSelected?.currencyA && currenciesSelected?.currencyB && (
                  <div className='flex justify-center gap-5'>
                    <PanelLimitPrice label='Max price to Sell' currencyA={'BCH'} currencyB={'TANGO'}/>
                    <PanelLimitPrice label='Min price to Buy' currencyA={'TANGO'} currencyB={'BCH'}/>
                  </div>
                )
              }

              {addIsUnsupported ? (
                <Button color="gradient" size="lg" disabled>
                  {i18n._(t`Unsupported Asset`)}
                </Button>
              ) : !account ? (
                <Web3Connect size="lg" color="blue" className="w-full" />
              ) : (
                <Button color="blue" size="lg" disabled={!currenciesSelected}>
                  {i18n._(t`Create Robot`)}
                </Button>
              )}
            </div>

            {!addIsUnsupported ? (
              pair && !noLiquidity && pairState !== PairState.INVALID ? (
                <MinimalPositionCard showUnwrapped={oneCurrencyIsWETH} pair={pair} />
              ) : null
            ) : (
              <UnsupportedCurrencyFooter
                show={addIsUnsupported}
                currencies={[currencies.CURRENCY_A, currencies.CURRENCY_B]}
              />
            )}
          </div>
        </DoubleGlowShadow>
      </Container>
    </>
  )
}
