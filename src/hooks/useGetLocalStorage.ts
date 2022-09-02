import { useEffect, useRef, useState } from 'react'

export default function useGetlocalStorage(item: string) {  
  let ret = localStorage.getItem(item);

  if(ret){
    return ret
  }
  
  return null;
}