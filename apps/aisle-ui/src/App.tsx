import { createHashRouter, RouterProvider } from 'react-router-dom'
import NavBar from './components/NavBar'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import StoresPage from './pages/StoresPage'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  )
}

const router = createHashRouter([
  {
    path: '/',
    element: <Layout><ProductsPage /></Layout>,
  },
  {
    path: '/products/:id',
    element: <Layout><ProductDetailPage /></Layout>,
  },
  {
    path: '/stores',
    element: <Layout><StoresPage /></Layout>,
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
