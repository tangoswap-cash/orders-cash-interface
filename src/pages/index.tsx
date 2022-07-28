import Container from '../components/Container'
import Head from 'next/head'
// import Swap from './exchange/smart-swap/[[...tokens]]'
import LimitOrder from './exchange/limit-order/[[...tokens]]'

export default function Dashboard() {
  return LimitOrder()
  // return (
  //   <Container id="dashboard-page" className="py-4 md:py-8 lg:py-12" maxWidth="2xl">
  //     <Head>
  //       <title>Dashboard | Orders.Cash</title>
  //       <meta name="description" content="Tango" />
  //     </Head>
  //   </Container>
  // )
}
