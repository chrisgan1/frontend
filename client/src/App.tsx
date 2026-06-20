import Nav from './components/Nav';
import Hero from './components/Hero';
import Pillars from './components/Pillars';
import CoreLoop from './components/CoreLoop';
import BlendBreak from './components/BlendBreak';
import Roles from './components/Roles';
import Objectives from './components/Objectives';
import MatchFlow from './components/MatchFlow';
import MapSection from './components/MapSection';
import TechStack from './components/TechStack';
import Roadmap from './components/Roadmap';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-npc-bg text-npc-text font-mono">
      <Nav />
      <Hero />
      <Pillars />
      <CoreLoop />
      <BlendBreak />
      <Roles />
      <Objectives />
      <MatchFlow />
      <MapSection />
      <TechStack />
      <Roadmap />
      <Footer />
    </div>
  );
}
