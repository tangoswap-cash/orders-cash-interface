import { Currency } from '@tangoswapcash/sdk'
import React, { useCallback, useState } from 'react'
import CurrencyLogo from '../CurrencyLogo'
import { InformationCircleIcon } from '@heroicons/react/solid'
import Tooltip from '../Tooltip'
import Popover from '../Popover'

export interface PopoverProps {
  currency: Currency
  parsedAmount: string
  tokenAddress: string
}

function LabelTokenCurrency({ currency, parsedAmount, tokenAddress}: PopoverProps){

  const [show, setShow] = useState<boolean>(false)

  const open = useCallback(() => setShow(true), [setShow])
  const close = useCallback(() => setShow(false), [setShow])

  return (
    <div className="flex items-start">
      <div className="flex items-center gap-2">
        <CurrencyLogo size={40} currency={currency} />

        <div className="text-xl font-bold text-white">{parsedAmount}</div>
        <div className="text-xl text-white">{currency?.symbol}</div>
      </div>
      <Popover
        content={
          <div 
            className="px-2 py-1 font-medium bg-dark-700 border border-gray-600 rounded text-sm"
          >
            {tokenAddress}
          </div>
        }
        show={show}
        placement={'bottom'}
      >
        <div
          className="flex items-center justify-center outline-none hover:text-primary ml-1"
          onClick={open}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <InformationCircleIcon width={15} height={15}/>
        </div>
      </Popover>
    </div>
  )
}

export default LabelTokenCurrency