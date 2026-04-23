import React, { useRef, useState } from 'react';
import './DemoShowcase.css';
import { PlayIcon, ArrowRightIcon } from 'lucide-react';


const STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/epsa-30d0b.firebasestorage.app/o';

const DEMOS = [
  {
    id: 'pre-screen',
    label: 'Part 1',
    title: 'Pre-Screen Assessment',
    description: 'Lifestyle, demographics, family history, and symptoms — see how ePSA determines whether a PSA blood test is recommended.',
    src: `${STORAGE_BASE}/media1.mp4?alt=media`,
  },
  {
    id: 'with-psa',
    label: 'Part 2',
    title: 'With PSA Values',
    description: 'Once a PSA result is available, ePSA stratifies cancer risk and guides next steps based on PSA level.',
    src: `${STORAGE_BASE}/media2.mp4?alt=media`,
  },
  {
    id: 'with-mri',
    label: 'Part 3',
    title: 'With MRI Results',
    description: 'Adding PI-RADS score from MRI refines risk stratification and personalizes the clinical recommendation.',
    src: `${STORAGE_BASE}/media3.mp4?alt=media`,
  },
];

function VideoCard({ demo, index }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const handleOverlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="ds-card" id={demo.id}>
      <div className="ds-card-meta">
        <span className="ds-label">{demo.label}</span>
        <h2 className="ds-card-title">{demo.title}</h2>
        <p className="ds-card-desc">{demo.description}</p>
      </div>
      <div className="ds-video-wrap">
        {!playing && (
          <button className="ds-play-overlay" onClick={handleOverlayClick} aria-label={`Play ${demo.title} demo`}>
            <span className="ds-play-icon"><PlayIcon size={28} /></span>
            <span className="ds-play-label">Watch demo</span>
          </button>
        )}
        <video
          ref={videoRef}
          className="ds-video"
          controls
          preload="metadata"
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        >
          <source src={demo.src} type="video/mp4" />
          Your browser does not support video playback.
        </video>
      </div>
    </div>
  );
}

export default function DemoShowcase() {
  return (
    <div className="ds-root">
      <header className="ds-header">
        <div className="ds-header-inner">
          <div className="ds-brand">
            <img src="/logo.png" alt="ePSA" className="ds-logo" onError={e => { e.target.style.display = 'none'; }} />
            <span className="ds-brand-name">ePSA</span>
          </div>
        </div>
      </header>

      <main className="ds-main">
        <div className="ds-hero">
          <p className="ds-kicker">Live Demo</p>
          <h1 className="ds-hero-title">See ePSA in Action</h1>
          <p className="ds-hero-body">
            ePSA is a prostate cancer risk stratification tool developed at Mount Sinai.
            Watch the three-part walkthrough below to see how it identifies which male patients
            should be screened and guides clinical decision-making.
          </p>
          <div className="ds-jump-links">
            {DEMOS.map(d => (
              <a key={d.id} href={`#${d.id}`} className="ds-jump">{d.label}: {d.title}</a>
            ))}
          </div>
        </div>

        <div className="ds-cards">
          {DEMOS.map((demo, i) => <VideoCard key={demo.id} demo={demo} index={i} />)}
        </div>

        <div className="ds-bottom-cta">
          <p className="ds-bottom-cta-text">Ready to assess a patient?</p>
          <a href="/" className="ds-btn-primary">
            Open ePSA <ArrowRightIcon size={16} />
          </a>
          <p className="ds-disclaimer">
            For educational and clinical decision-support use only. Does not replace physician judgment.
            Developed at Mount Sinai Health System.
          </p>
        </div>
      </main>
    </div>
  );
}
