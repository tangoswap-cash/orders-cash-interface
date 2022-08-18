import { useEffect, useRef, useState } from 'react'

export default function useGetOrdersLocal() {
  const orders = useRef({orders: []});

  useEffect(() => {
    let storageOrders = localStorage.getItem('orders');
    console.log('storageOrders: ', storageOrders)
    if(storageOrders){
      orders.current = {...JSON.parse(storageOrders)}
    }else{
      orders.current = {orders: []}
    }
  }, [])

  console.log('orders current: ', orders.current)
  return orders.current;
}