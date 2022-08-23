import React, { FC, useEffect, useState } from 'react'

import Badge from '../../../components/Badge'
import Button from '../../../components/Button'
import CurrencyLogo from '../../../components/CurrencyLogo'
import { LimitOrder } from '@tangoswapcash/sdk'
import Lottie from 'lottie-react'
import NavLink from '../../../components/NavLink'
import Pagination from './Pagination'
import TransactionConfirmationModal from '../../../modals/TransactionConfirmationModal'
import loadingCircle from '../../../animation/loading-circle.json'
import { t } from '@lingui/macro'
import { useActiveWeb3React, useLimitOrderContract } from '../../../hooks'
import useLimitOrders from '../../../hooks/useLimitOrders'
import { useLingui } from '@lingui/react'
import { useTransactionAdder } from '../../../state/transactions/hooks'
import useGetOrdersLocal from '../../../hooks/useGetOrdersLocal'
import RowOrderLimit from '../../../components/RowOrderLimit'

const OpenOrders = ({orders, setOrders}) => {
  const { i18n } = useLingui()
  const [hash, setHash] = useState('')
  const totalCompleted = orders.reduce((a,b) => b.status == 'open' ? a + 1 : a, 0)

  const deleteOrderLocal = (id) => {
    const ordersFilter = orders.map(or => or.id == id ? {...or, status: 'cancelled'} : or)
    setOrders(ordersFilter)
    localStorage.setItem('orders', JSON.stringify(ordersFilter))
  }

  useEffect(() => {
  }, [orders])

  // const cancelOrder = async (limitOrder: LimitOrder, summary: string) => {
  //   const tx = await limitOrderContract.cancelOrder(limitOrder.getTypeHash())
  //   addTransaction(tx, {
  //     summary,
  //   })

  //   setHash(tx.hash)

  //   await tx.wait()
  //   await mutate((data) => ({ ...data }))
  // }

  const cancelOrder = (order) => {
    console.log('TODO cancel order', order) //TODO cancel Order
  }

  return (
    <>
      <TransactionConfirmationModal
        isOpen={!!hash}
        onDismiss={() => setHash('')}
        hash={hash}
        content={() => <div />}
        attemptingTxn={false}
        pendingText={''}
      />
      <div className="flex items-center gap-2 pb-4 text-xl border-b text-high-emphesis border-dark-800">
        {i18n._(t`Open Orders`)}{' '}
        <span className="inline-flex">
          <Badge color="blue" size="medium">
            {totalCompleted}
          </Badge>
        </span>
      </div>
      <div className="text-center text-secondary">
        {/* {orders.loading ? (
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
              <div className="flex items-center justify-end cursor-pointer hover:text-primary" />
            </div>
            <div className="flex flex-col gap-2 md:gap-5">
              {orders?.map((order, index) => (
                order && order?.status == 'open' &&
                  <RowOrderLimit key={index} order={order} deleteOrderLocal={deleteOrderLocal}/>
              ))}
            </div>
            {/* <Pagination
              onChange={pending.setPage}
              totalPages={pending.maxPages}
              currentPage={pending.page}
              pageNeighbours={2}
            /> */}
          </>
        ) : (
          <span>
            No open limit orders. Why not{' '}
            <NavLink href="/limit-order">
              <a className="text-sm underline cursor-pointer text-blue">place one?</a>
            </NavLink>
          </span>
        )}
      </div>
    </>
  )
}

export default OpenOrders
