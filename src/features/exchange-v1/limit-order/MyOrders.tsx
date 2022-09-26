import React, { FC, useState } from 'react'

import Badge from '../../../components/Badge'
import { ClipboardListIcon } from '@heroicons/react/outline'
import NavLink from '../../../components/NavLink'
import { t } from '@lingui/macro'
import useLimitOrders from '../../../hooks/useLimitOrders'
import { useLingui } from '@lingui/react'
import useGetOrdersLocal from '../../../hooks/useGetOrdersLocal'

const MyOrders: FC = () => {
  const { i18n } = useLingui()
  const { pending } = useLimitOrders()
  const [orders, setOrders] = useState(useGetOrdersLocal())
  const totalCompleted = orders.reduce((a,b) => b.status == 'open' ? a + 1 : a, 0)  

  return (
    <NavLink href="/open-order">
      <a className="text-green hover:text-high-emphesis">
        <div className="md:flex hidden gap-3 items-center">
          <div>{i18n._(t`My Orders`)}</div>
          <Badge color="blue">{totalCompleted}</Badge>
        </div>
        <div className="flex md:hidden text-primary">
          <ClipboardListIcon className="w-[26px] h-[26px]" />
        </div>
      </a>
    </NavLink>
  )
}

export default MyOrders
