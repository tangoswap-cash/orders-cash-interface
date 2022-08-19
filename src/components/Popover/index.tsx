import React, { useCallback, useState } from 'react'

import { Placement } from '@popperjs/core'
import useInterval from '../../hooks/useInterval'
import { usePopper } from 'react-popper'
import { classNames } from '../../functions'
import { Popover as HeadlessuiPopover } from '@headlessui/react'

export interface PopoverProps {
  content: React.ReactNode
  show: boolean
  children: React.ReactNode
  placement?: Placement
}

export default function Popover({ content, show, children, placement = 'auto' }: PopoverProps) {
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null)
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null)
  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null)
  const { styles, update, attributes } = usePopper(referenceElement, popperElement, {
    placement,
    strategy: 'fixed',
    modifiers: [
      { name: 'offset', options: { offset: [0, 0] } },
      { name: 'arrow', options: { element: arrowElement } },
    ],
  })
  const updateCallback = useCallback(() => {
    update && update()
  }, [update])
  useInterval(updateCallback, show ? 100 : null)

  return (
    <HeadlessuiPopover className="relative">
      <div ref={setReferenceElement as any}>{children}</div>
      <HeadlessuiPopover.Panel
        static 
        className={classNames(!show && 'hidden opacity-0', 'absolute z-50 animate-fade')}
        ref={setPopperElement as any}
        {...attributes.popper}
      >
        {content}
        <div
          className={classNames('w-2 h-2 z-50')}
          ref={setArrowElement as any}
          style={styles.arrow}
          {...attributes.arrow}
        />
      </HeadlessuiPopover.Panel>
    </HeadlessuiPopover>
  )
}
