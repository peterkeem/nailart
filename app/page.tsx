import AetherHero from '@/components/main/Hero';
import Navbar from '@/components/main/Navbar';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <AetherHero
          title="Nailart AI"
          subtitle="Create Perfect YouTube Thumbnails with AI. Generate click-worthy thumbnails in seconds."
          ctaLabel="Get Started Free"
          ctaHref="#start"
          secondaryCtaLabel="See How It Works"
          secondaryCtaHref="#how-it-works"
        />

        {/* 추가 섹션들이 여기에 들어갈 예정 */}
      </main>
    </>
  );
}