import React, { FC, useState } from 'react'
import Badge from '../../../components/Badge'
import CurrencyLogo from '../../../components/CurrencyLogo'
import Lottie from 'lottie-react'
import { OrderStatus } from '@tangoswapcash/sdk'
import Pagination from './Pagination'
import loadingCircle from '../../../animation/loading-circle.json'
import { t } from '@lingui/macro'
import useLimitOrders from '../../../hooks/useLimitOrders'
import { useLingui } from '@lingui/react'
import { i18n } from '@lingui/core'
import useGetOrdersLocal from '../../../hooks/useGetOrdersLocal'
import { Popover } from '@headlessui/react'
import { ClipboardCopyIcon, InformationCircleIcon } from '@heroicons/react/solid'
import useCopyClipboard from '../../../hooks/useCopyClipboard'

const CompletedOrders = ({ orders, setOrders}) => {
  const { i18n } = useLingui()
  const totalCompleted = orders.reduce((a,b) => b.status && a + 1, 0)

  console.log(orders)
  console.log('totalCompleted:', totalCompleted);

  return (
    <>
      <div className="flex items-center gap-2 pb-4 text-xl border-b text-high-emphesis border-dark-800">
        {i18n._(t`Order History`)}{' '}
        <span className="inline-flex">
          <Badge color="pink" size="medium">
            {totalCompleted}
          </Badge>
        </span>
      </div>
      <div className="text-center text-secondary">
        {/* {completed.loading ? (
          <div className="w-8 m-auto">
            <Lottie animationData={loadingCircle} autoplay loop />
          </div>
        ) :  */}
        {totalCompleted > 0 ? (
          <>
            <div className="grid grid-flow-col grid-cols-3 gap-4 px-4 pb-4 text-sm font-bold md:grid-cols-4 text-secondary">
              <div className="flex items-center cursor-pointer hover:text-primary">{i18n._(t`Receive`)}</div>
              <div className="flex items-center cursor-pointer hover:text-primary">{i18n._(t`Pay`)}</div>
              <div className="flex items-center hidden text-left cursor-pointer hover:text-primary md:block">
                {i18n._(t`Rate`)}
              </div>
              <div className="flex items-center justify-end cursor-pointer hover:text-primary">{i18n._(t`Filled`)}</div>
            </div>
            <div className="flex flex-col gap-2 md:gap-5">
              {orders.map((order, index) => (
                order && order?.status !== 'open' && <RowOrderHistory key={index} order={order}/>
             ))}
            </div>
            {/* <Pagination
              onChange={completed.setPage}
              totalPages={completed.maxPages}
              currentPage={completed.page}
              pageNeighbours={2}
            /> */}
          </>
        ) : (
          <span>{i18n._(t`No order history`)}</span>
        )}
      </div>
    </>
  )
}

const RowOrderHistory = ({order}) => {
  const [isCopied, setCopied] = useCopyClipboard(1000)
  return(
    <div
      className="block overflow-hidden rounded text-high-emphesis bg-dark-800"
      style={{
        background:
          order.status == 'filled'
            ? 'linear-gradient(90deg, rgba(0, 255, 79, 0.075) 0%, rgba(0, 255, 79, 0) 50%), #202231'
            : order.status == 'cancelled'
            ? 'linear-gradient(90deg, rgba(200, 200, 200, 0.075) 0%, rgba(200, 200, 200, 0) 50%), #202231'
            : 'linear-gradient(90deg, rgba(255, 56, 56, 0.15) 0%, rgba(255, 56, 56, 0) 50%), #202231',
      }}
    >
      <div className="grid items-center grid-flow-col grid-cols-3 gap-4 px-4 py-3 text-sm md:grid-cols-4 align-center text-primary">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 font-bold">
            <div className="min-w-[32px] flex items-center">
              <CurrencyLogo size={32} currency={order.output.currency} />
            </div>
            <div className="flex flex-col">
              <div>{order.output.value} </div>
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
        </div>
        <div className="flex gap-4 font-bold text-left">
          <div className="min-w-[32px] flex items-center">
            <CurrencyLogo size={32} currency={order.input.currency} />
          </div>
          <div className="flex flex-col">
            <div>{order.input.value} </div>
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
            {order.output.currency.symbol} per {order.input.currency.symbol}
          </div>
        </div>
        <div className="text-right">
          <div className="mb-1">
            {order.status == 'filled' ? (
              <span className="text-green">{i18n._(t`Filled`)}</span>
            ) :
            order.status == undefined ? (
              <span className="text-secondary">{i18n._(t`undefined`)}</span>
            ) : 
            (
              <span className="text-red">{i18n._(t`Expired | Canceled`)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompletedOrders
