import { MemoryRouter } from "react-router-dom"

import { Routing } from "~routes"
import { ToastContainer } from 'react-toastify';

function IndexPopup() {
  return (
    <MemoryRouter>
      <Routing />
      <ToastContainer autoClose={2000} />
    </MemoryRouter>
  )
}

export default IndexPopup