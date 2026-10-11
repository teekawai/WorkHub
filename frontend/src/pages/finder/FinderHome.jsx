import NavBar from '../../components/shared/NavBar'
import Footer from '../../components/shared/Footer'
import HeroSection from '../../components/finder/HeroSection'
import CategoryGrid from '../../components/finder/CategoryGrid'
import JobListings from '../../components/finder/JobListings'
import CompanyMarquee from '../../components/finder/CompanyMarquee'
import StatsRow from '../../components/finder/StatsRow'

function FinderHome({ currentUser }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* transparent=true → fixed, chồng lên HeroSection */}
      <NavBar currentUser={currentUser} transparent />

      <main className="flex-1">
        {/* HeroSection đã có pt-36 để tránh bị navbar che nội dung */}
        <HeroSection />
        <CategoryGrid />
        <JobListings />
        <CompanyMarquee />
        <StatsRow />
      </main>

      <Footer />
    </div>
  )
}

export default FinderHome
