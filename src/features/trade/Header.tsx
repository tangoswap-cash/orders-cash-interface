import { ChainId, Currency, Percent } from '@tangoswapcash/sdk'
import React, { FC, useState, useEffect } from 'react'
import { RefreshIcon } from '@heroicons/react/outline'
import Gas from '../../components/Gas'
import MyOrders from '../exchange-v1/limit-order/MyOrders'
import NavLink from '../../components/NavLink'
import Settings from '../../components/Settings'
import { currencyId } from '../../functions'
import { t } from '@lingui/macro'
import { useActiveWeb3React } from '../../hooks'
import { useLingui } from '@lingui/react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBookOpen } from '@fortawesome/free-solid-svg-icons'

const getQuery = (input, output) => {
  if (!input && !output) return

  if (input && !output) {
    return { inputCurrency: input.address || 'BCH' }
  } else if (input && output) {
    return { inputCurrency: input.address, outputCurrency: output.address }
  }
}

interface ExchangeHeaderProps {
  input?: Currency
  output?: Currency
  allowedSlippage?: Percent
  refreshPrice?: () => void
  refreshingPrice?: boolean
}

const ExchangeHeader: FC<ExchangeHeaderProps> = ({ input, output, allowedSlippage, refreshPrice, refreshingPrice }) => {
  const { i18n } = useLingui()
  const { chainId } = useActiveWeb3React()
  const router = useRouter()
  const [animateWallet, setAnimateWallet] = useState(false)
  const isRemove = router.asPath.startsWith('/remove')
  const isLimitOrder = router.asPath.startsWith('/limit-order')

  useEffect(() => {
    const interval = setInterval(refreshPrice, 10000)
    return () => clearInterval(interval)
  }, [refreshPrice])

  return (
    <div className="flex items-center justify-between mb-4 space-x-3">
      <div className="grid grid-cols-1 rounded p-3px h-[46px]">
        <NavLink
          activeClassName="font-bold border rounded text-high-emphesis border-dark-800 from-opaque-blue to-opaque-pink hover:from-blue hover:to-pink"
          href={{
            pathname: '/',
            query: getQuery(input, output),
          }}
        >
          <a className="flex items-center justify-center px-4 text-base font-medium text-center rounded-md text-high-emphesis hover:text-secondary ">
            {i18n._(t`Limit Order`)}
          </a>
        </NavLink>
      </div>

      <div className="flex items-center">
        <div className="grid grid-flow-col gap-1">
            <div className="items-center h-full w-full cursor-pointer hover:bg-dark-800 rounded px-3 py-1.5">
              <MyOrders />
            </div>
          {refreshPrice && (
            <div
              onClick={refreshPrice}
              className="relative flex items-center justify-center rounded hover:bg-dark-800 w-8 h-8 rounded cursor-pointer"
            >
              <span className={refreshingPrice ? 'animate-spin opacity-40' : undefined}>
                <RefreshIcon className="w-[26px] h-[26px] transform" />
              </span>
            </div>
          )}
          <a href='/open-order'><FontAwesomeIcon className='mr-2 mt-2 ml-3' icon={faBookOpen} size="lg"/></a>
          {/* <div className="relative flex items-center w-full h-full rounded hover:bg-dark-800">
            <Settings placeholderSlippage={allowedSlippage} />
          </div> */}
        </div>
      </div>
    </div>
  )
}

export default ExchangeHeader
