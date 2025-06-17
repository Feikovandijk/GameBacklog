import './App.css'
import DashboardStats from './components/DashboardStats'
import MostReviewedGames from './components/MostReviewedGames'

function App() {

  return (
    <>
      <header>
        <h1>Game Database Dashboard</h1>
      </header>
      <main>
        <DashboardStats />
        <MostReviewedGames />
      </main>
    </>
  )
}

export default App
