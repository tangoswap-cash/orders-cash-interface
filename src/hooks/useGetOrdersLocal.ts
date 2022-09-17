
import { useEffect, useRef, useState } from 'react'

export default function useGetOrdersLocal() {
  const orders = useRef([]);

  let storageOrders = localStorage.getItem('orders');
  if(storageOrders){
    orders.current = [...JSON.parse(storageOrders)]
  }else{
    orders.current = []
  }

  return orders.current;
} 