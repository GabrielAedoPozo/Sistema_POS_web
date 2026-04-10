import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import Menu from './components/Menu.jsx'
import Orden from './components/Orden.jsx'
import './styles/style.css'
import '@fontsource/onest/300.css';
import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/600.css';



function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css" />
        </head>
      <body className='bg-gray-200'>
        <Menu />
        <Orden />
      </body>
    </>
  )
}

export default App
