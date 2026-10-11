import NavBar from '../../components/shared/NavBar'
import EmployerHeroSection from '../../components/employer/EmployerHeroSection'
import EmployerStatsRow from '../../components/employer/EmployerStatsRow'
import EmployerFeatureGrid from '../../components/employer/EmployerFeatureGrid'
import EmployerHowItWorks from '../../components/employer/EmployerHowItWorks'
import EmployerFinalCTA from '../../components/employer/EmployerFinalCTA'
import Footer from '../../components/Footer'

function EmployerHome({ currentUser }) {
  return (
    <div className="min-h-screen bg-[#0f1f3d] flex flex-col">
      <NavBar currentUser={currentUser} isEmployer={true} />
      <div className="flex-1">
        <EmployerHeroSection />
        <EmployerStatsRow />
        <EmployerFeatureGrid />
        <EmployerHowItWorks />
        <EmployerFinalCTA />
      </div>
      <Footer />
    </div>
  )
}

export default EmployerHome
