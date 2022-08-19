import { Currency } from '@tangoswapcash/sdk'
import React, { useCallback, useState } from 'react'
import CurrencyLogo from '../CurrencyLogo'
import { InformationCircleIcon } from '@heroicons/react/solid'
import { Popover } from '@headlessui/react'
import { ClipboardCopyIcon } from '@heroicons/react/solid'
import useCopyClipboard from '../../hooks/useCopyClipboard'

export interface PopoverProps {
  currency: Currency
  parsedAmount: string
  tokenAddress: string
}

function LabelTokenCurrency({ currency, parsedAmount, tokenAddress}: PopoverProps){
  const [isCopied, setCopied] = useCopyClipboard(1000)
  const [show, setShow] = useState<boolean>(false)

  const handleClickPopover = () => setShow(!show)

  return (
    <div className="flex items-start">
      <div className="flex items-center gap-2">
        <CurrencyLogo size={40} currency={currency} />
        <div className="text-xl font-bold text-white">{parsedAmount}</div>
        <div className="text-xl text-white">{currency?.symbol}</div>
      </div>
      <Popover className="relative">
        <Popover.Button>
          <InformationCircleIcon width={15} height={15} className='ml-2'/>
        </Popover.Button>
        <Popover.Panel className="absolute z-10">
        {({ close }) => {
          isCopied && close()
          return (
            <div 
              className="flex px-2 py-1 font-medium bg-dark-700 border border-gray-600 rounded text-sm cursor-pointer"
              onClick={() => setCopied(tokenAddress)}
            >
              {tokenAddress} <ClipboardCopyIcon  width={16} height={16} className='ml-2'/>
            </div>
          )}
        }
        </Popover.Panel>
      </Popover>
    </div>
  )
}

export default LabelTokenCurrency