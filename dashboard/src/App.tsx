import './App.css'
import DashboardStats from './components/DashboardStats'
import MostReviewedGames from './components/MostReviewedGames'
import GameSearch from './components/GameSearch'
import DashboardAnalytics from './components/DashboardAnalytics'

function App() {

  return (
    <>
      <header>
        <h1>Game Database Dashboard</h1>
      </header>
      <main>
        <GameSearch />
        <DashboardStats />
        <DashboardAnalytics />
        <MostReviewedGames />
      </main>
    </>
  )
}

export default App
