import Header from "@/components/header";
import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import HowItWorksSection from "@/components/how-it-works-section";
import FaqSection from "@/components/faq-section";
import Footer from "@/components/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <FaqSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
