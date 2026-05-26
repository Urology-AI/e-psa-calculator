import React, { useState, useCallback } from 'react';
import { MapPinIcon, PhoneIcon, SearchIcon, UserCheckIcon, ExternalLinkIcon, MailIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { findUrologists } from '../services/npiRegistryService';
import './UrologistFinder.css';

const SINAI_UROLOGY = {
  dept: 'Mount Sinai Department of Urology',
  url: 'https://www.mountsinai.org/care/urology',
  phone: '(212) 241-4812',
  address: '625 Madison Ave, New York, NY 10022',
};

function ReferralTemplate({ provider }) {
  const [open, setOpen] = useState(false);
  const addr = provider.address;
  const addrLine = addr ? `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.city}, ${addr.state} ${addr.zip}` : '';

  const body = `Dear Dr. ${provider.name},

I am a patient who recently completed a prostate cancer risk assessment using the ePSA screening tool (ePSA.org). Based on my assessment results, my primary care physician or I would like to discuss an evaluation by a board-certified urologist.

I am located near ${addrLine} and would appreciate knowing if you are accepting new patients.

Could you please let me know your availability for a consultation?

Thank you for your time.

Sincerely,
[Your Name]
[Your Phone Number]`;

  const subject = encodeURIComponent('Urology Consultation Request — ePSA Risk Assessment');
  const encodedBody = encodeURIComponent(body);

  return (
    <div className="uf-referral-template">
      <button
        type="button"
        className="uf-referral-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <MailIcon size={13} />
        <span>Draft referral letter</span>
        {open ? <ChevronUpIcon size={13} /> : <ChevronDownIcon size={13} />}
      </button>
      {open && (
        <div className="uf-referral-body">
          <pre className="uf-referral-text">{body}</pre>
          <a
            className="uf-btn uf-btn--outline"
            href={`mailto:?subject=${subject}&body=${encodedBody}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MailIcon size={13} />
            Open in email client
          </a>
        </div>
      )}
    </div>
  );
}

function ProviderCard({ provider }) {
  const addr = provider.address;
  const addrStr = addr
    ? [addr.line1, addr.line2, `${addr.city}, ${addr.state} ${addr.zip}`].filter(Boolean).join(', ')
    : null;

  const mapsUrl = addrStr
    ? `https://www.google.com/maps/search/${encodeURIComponent(addrStr)}`
    : null;

  const distLabel =
    provider.distanceMiles !== null
      ? provider.distanceMiles < 1
        ? '< 1 mile away'
        : `${provider.distanceMiles.toFixed(1)} miles away`
      : null;

  return (
    <div className="uf-card">
      <div className="uf-card-header">
        <div className="uf-card-name">
          <UserCheckIcon size={15} className="uf-card-icon" />
          <span>{provider.name}{provider.credential ? `, ${provider.credential}` : ''}</span>
        </div>
        {distLabel && <span className="uf-card-dist">{distLabel}</span>}
      </div>

      <div className="uf-card-specialty">{provider.taxonomyDesc}</div>

      {addr && (
        <div className="uf-card-addr">
          <MapPinIcon size={12} />
          <span>{addrStr}</span>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="uf-maps-link">
              Map <ExternalLinkIcon size={11} />
            </a>
          )}
        </div>
      )}

      {addr?.phone && (
        <div className="uf-card-phone">
          <PhoneIcon size={12} />
          <a href={`tel:${addr.phone.replace(/\D/g, '')}`}>{addr.phone}</a>
        </div>
      )}

      <ReferralTemplate provider={provider} />
    </div>
  );
}

export default function UrologistFinder({ flowMode = 'public' }) {
  const isSinai = flowMode === 'sinai';

  // Mount Sinai gate
  const [sinaiAnswer, setSinaiAnswer] = useState(null); // null | 'yes' | 'no'

  // Zip search state
  const [zip, setZip] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [providers, setProviders] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [patientGeo, setPatientGeo] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const PREVIEW_COUNT = 5;

  const handleSearch = useCallback(async () => {
    if (zip.trim().length !== 5) return;
    setStatus('loading');
    setProviders([]);
    setErrorMsg('');
    setShowAll(false);
    const result = await findUrologists(zip);
    if (result.error) {
      setStatus('error');
      setErrorMsg(result.error);
    } else {
      setProviders(result.providers);
      setPatientGeo(result.patientGeo);
      setStatus('done');
    }
  }, [zip]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ── Mount Sinai gate ──────────────────────────────────────────────
  if (isSinai && sinaiAnswer === null) {
    return (
      <div className="uf-root">
        <div className="uf-sinai-gate">
          <p className="uf-sinai-question">
            Are you currently receiving care at the <strong>Mount Sinai Health System</strong>?
          </p>
          <div className="uf-sinai-btns">
            <button className="uf-btn uf-btn--solid" onClick={() => setSinaiAnswer('yes')}>
              Yes, I'm a Mount Sinai patient
            </button>
            <button className="uf-btn uf-btn--outline" onClick={() => setSinaiAnswer('no')}>
              No, search near me
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSinai && sinaiAnswer === 'yes') {
    return (
      <div className="uf-root">
        <div className="uf-sinai-result">
          <p>
            Please share these results with your <strong>Mount Sinai urologist</strong> or contact
            the Department of Urology directly to discuss next steps.
          </p>
          <div className="uf-card">
            <div className="uf-card-header">
              <div className="uf-card-name">
                <UserCheckIcon size={15} className="uf-card-icon" />
                <span>{SINAI_UROLOGY.dept}</span>
              </div>
            </div>
            <div className="uf-card-addr">
              <MapPinIcon size={12} />
              <span>{SINAI_UROLOGY.address}</span>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(SINAI_UROLOGY.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="uf-maps-link"
              >
                Map <ExternalLinkIcon size={11} />
              </a>
            </div>
            <div className="uf-card-phone">
              <PhoneIcon size={12} />
              <a href="tel:2122414812">{SINAI_UROLOGY.phone}</a>
            </div>
            <div style={{ marginTop: '10px' }}>
              <a className="uf-btn uf-btn--outline" href={SINAI_UROLOGY.url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon size={13} />
                Visit mountsinai.org/care/urology
              </a>
            </div>
          </div>
          <button className="uf-link-btn" onClick={() => setSinaiAnswer('no')}>
            Or search for another urologist near me →
          </button>
        </div>
      </div>
    );
  }

  // ── Zip search (public or Sinai 'no') ────────────────────────────
  const visibleProviders = showAll ? providers : providers.slice(0, PREVIEW_COUNT);

  return (
    <div className="uf-root">
      <p className="uf-desc">
        Enter your ZIP code to find board-certified urologists in your area from the{' '}
        <strong>CMS National Provider Registry</strong>. Results include practitioners registered
        under the Urology specialty (taxonomy 208800000X).
      </p>

      <div className="uf-search-row">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={5}
          className="uf-zip-input"
          placeholder="Enter ZIP code"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          onKeyDown={handleKeyDown}
          aria-label="Your ZIP code"
        />
        <button
          className="uf-btn uf-btn--solid"
          onClick={handleSearch}
          disabled={zip.length !== 5 || status === 'loading'}
        >
          <SearchIcon size={14} />
          {status === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </div>

      {status === 'loading' && (
        <div className="uf-loading">
          <div className="uf-spinner" />
          <span>Looking up board-certified urologists near {zip}…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="uf-error">{errorMsg}</div>
      )}

      {status === 'done' && providers.length === 0 && (
        <div className="uf-empty">
          No board-certified urologists found near ZIP {zip}. Try a nearby ZIP code, or search the{' '}
          <a href="https://www.auanet.org/find-a-urologist" target="_blank" rel="noopener noreferrer">
            AUA's Find a Urologist directory
          </a>.
        </div>
      )}

      {status === 'done' && providers.length > 0 && (
        <>
          <p className="uf-result-count">
            Found <strong>{providers.length}</strong> board-certified urologist{providers.length !== 1 ? 's' : ''}{' '}
            {patientGeo ? `near ZIP ${zip}` : `in ZIP ${zip}`}, sorted by distance.
          </p>
          <div className="uf-grid">
            {visibleProviders.map((p) => (
              <ProviderCard key={p.npi} provider={p} />
            ))}
          </div>
          {providers.length > PREVIEW_COUNT && (
            <button className="uf-show-more" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `Show all ${providers.length} results`}
              {showAll ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
            </button>
          )}
          <p className="uf-aua-cta">
            Looking for more options? Search the full{' '}
            <a href="https://www.auanet.org/find-a-urologist" target="_blank" rel="noopener noreferrer">
              American Urological Association physician directory <ExternalLinkIcon size={11} />
            </a>.
          </p>
        </>
      )}
    </div>
  );
}
