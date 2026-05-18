import { NavLink } from 'react-router-dom'

export default function NavBar() {
  return (
    <nav className="navbar" data-test="navbar">
      <NavLink to="/" className="navbar-brand" data-test="nav-brand">
        Aisle Checker
      </NavLink>
      <NavLink
        to="/"
        className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        data-test="nav-products"
        end
      >
        Products
      </NavLink>
      <NavLink
        to="/stores"
        className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        data-test="nav-stores"
      >
        Stores
      </NavLink>
    </nav>
  )
}
