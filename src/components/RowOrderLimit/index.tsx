import { Currency } from '@tangoswapcash/sdk'
import React, { Key, useCallback, useState } from 'react'
import CurrencyLogo from '../CurrencyLogo'
import { InformationCircleIcon } from '@heroicons/react/solid'
import { Popover } from '@headlessui/react'
import { ClipboardCopyIcon } from '@heroicons/react/solid'
import useCopyClipboard from '../../hooks/useCopyClipboard'
import Button from '../Button'
import { i18n } from '@lingui/core'
import { t } from '@lingui/macro'
import useGetOrdersLocal from '../../hooks/useGetOrdersLocal'

function RowOrderLimit({order, deleteOrderLocal}){
  const [isCopied, setCopied] = useCopyClipboard(1000)

  const cancelOrder = (order) => {
    deleteOrderLocal(order.id) //esto solo lo borra del localstorage, no cancela la orden realmente

    //TODO cancel Order

  }

  return (
    <div className="block rounded text-high-emphesis bg-dark-800">
      <div className="grid items-center grid-flow-col grid-cols-3 gap-4 px-4 py-3 text-sm md:grid-cols-4 align-center text-primary">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 font-bold">
            <div className="min-w-[32px] flex items-center">
              <CurrencyLogo size={32} currency={order.output.currency} />
            </div>
            <div className="flex flex-col text-left ">
              <div>{order.output.value}</div>
              <div className="flex text-xs text-left text-secondary">
                {order.output.currency.symbol}
                <Popover className="relative hidden md:block">
                  <Popover.Button>
                    <InformationCircleIcon width={15} height={15} className='ml-2'/>
                  </Popover.Button>
                  <Popover.Panel className="absolute z-50">
                  {({ close }) => {
                    isCopied && close()
                    return (
                      <div 
                        className="text-primary flex px-2 py-1 font-medium bg-dark-700 border border-gray-600 rounded text-sm cursor-pointer"
                        onClick={() => setCopied(order.output.currency.address)}
                      >
                        {order.output.currency.address} <ClipboardCopyIcon  width={16} height={16} className='ml-2'/>
                      </div>
                    )}
                  }
                  </Popover.Panel>
                </Popover>
              </div>
            </div>
          </div>
          
        </div>
        <div className="flex items-center gap-4 font-bold text-left">
          <div className="min-w-[32px] flex items-center">
            <CurrencyLogo size={32} currency={order.input.currency} />
          </div>
          <div className="flex flex-col">
            <div>{order.input.value}</div>
            <div className="flex text-xs text-left text-secondary">
              {order.input.currency.symbol}
              <Popover className="relative hidden md:block">
                <Popover.Button>
                  <InformationCircleIcon width={15} height={15} className='ml-2'/>
                </Popover.Button>
                <Popover.Panel className="absolute z-50">
                {({ close }) => {
                  isCopied && close()
                  return (
                    <div 
                      className="text-primary flex px-2 py-1 font-medium bg-dark-700 border border-gray-600 rounded text-sm cursor-pointer"
                      onClick={() => setCopied(order.input.currency.address)}
                    >
                      {order.input.currency.address} <ClipboardCopyIcon  width={16} height={16} className='ml-2'/>
                    </div>
                  )}
                }
                </Popover.Panel>
              </Popover>
            </div>
          </div>
        </div>
        <div className="hidden font-bold text-left md:block">
          <div>{order.rate}</div>
          <div className="text-xs text-secondary">
          {order.output.currency.symbol ? order.output.currency.symbol : order.output.currency.tokenInfo.symbol} per {order.input.currency.symbol}
          </div>
        </div>
        <div className="font-bold text-right">
          {/* <div className="mb-1">
            {order.filledPercent}% {i18n._(t`Filled`)}
          </div> */}
          <div>
            <Button
              color="pink"
              variant="outlined"
              size="xs"
              onClick={() => cancelOrder(order)}
            >
              {i18n._(t`Cancel Order`)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RowOrderLimit