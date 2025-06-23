import './App.css'
import DashboardStats from './components/DashboardStats'
import GameSearch from './components/GameSearch'
import MostReviewedGames from './components/MostReviewedGames'
import LatestAchievements from './components/LatestAchievements'
import LastSyncedGames from './components/LastSyncedGames'
import DashboardAnalytics from './components/DashboardAnalytics'
import LatestSteamGames from './components/LatestSteamGames'

function App() {

  return (
    <>
      <header className="App-header">
        <h1>Steam Game Backlog - Dashboard</h1>
      </header>
      <main>
        <div className="dashboard-grid">
          <DashboardStats />
          <GameSearch />
          <MostReviewedGames />
          <LatestSteamGames />
          <DashboardAnalytics />
          <LatestAchievements />
          <LastSyncedGames />
        </div>
      </main>
    </>
  )
}

export default App
