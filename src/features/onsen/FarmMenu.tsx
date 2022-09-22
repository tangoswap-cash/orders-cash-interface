import { ChainId } from '@tangoswapcash/sdk'
import NavLink from '../../components/NavLink'
import React from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { useActiveWeb3React } from '../../hooks'
import { useWalletModalToggle } from '../../state/application/hooks'

const defaultOptions = [
  {
    href: `/farm?filter=portfolio`,
    label: 'Your Farms',
    exact: true
  },
  {
    divider: true
  },
  {
    href: "/farm?filter=all",
    label: 'All Farms'
  },
  {
    href: `/farm?filter=2x`,
    label: '2x Reward Farms',
    exact: true
  },
  {
    href: "/farm?filter=past",
    label: 'Past Farms'
  }
]

const Menu = ({ positionsLength, options = defaultOptions}) => {
  const { account, chainId } = useActiveWeb3React()
  const { i18n } = useLingui()
  const toggleWalletModal = useWalletModalToggle()

  return (
    <div className="space-y-4">
      {account ? (
        options.map((option, index) => (
          option.divider ? (
            <div key={index} className="hidden md:block w-full h-0 font-bold bg-transparent border border-b-0 border-transparent rounded text-high-emphesis md:border-gradient-r-blue-pink-dark-800 opacity-20" />
          ) : (
            <NavLink
              key={index}
              exact={option.exact}
              href={option.href}
              activeClassName="font-bold bg-transparent border rounded text-high-emphesis border-transparent border-gradient-r-blue-pink-dark-900"
            >
              <a className="flex items-center justify-between px-2 py-3 md:px-4 md:py-6 text-base font-bold border border-transparent rounded cursor-pointer bg-dark-900 hover:bg-dark-800">
                {option.label}
              </a>
            </NavLink>
          )
        ))
      ) : (
        <a
          className="striped-background text-secondary flex items-center justify-between px-2 py-3 md:px-4 md:py-6 text-base font-bold border border-transparent rounded cursor-pointer bg-dark-900 hover:bg-dark-800"
          onClick={toggleWalletModal}
        >
          Your Farms
        </a>
      )}
    </div>
  )
}

export default Menu



