import { formatDate } from '../../lib/format';
import { assetUrl } from '../../lib/api';

export const OFFER_STYLES = [
  { key: 'modern_corporate', name: 'Modern Corporate', primary: '#1d4ed8', accent: '#38bdf8', tint: '#eff6ff', head: 'band', serif: false },
  { key: 'minimal_professional', name: 'Minimal Professional', primary: '#111827', accent: '#9ca3af', tint: '#f3f4f6', head: 'minimal', serif: false },
  { key: 'premium_corporate', name: 'Premium Corporate', primary: '#0f172a', accent: '#b8923a', tint: '#faf6ec', head: 'premium', serif: true },
  { key: 'classic_formal', name: 'Classic Formal', primary: '#1f2937', accent: '#1f2937', tint: '#f5f5f4', head: 'classic', serif: true },
  { key: 'modern_gradient', name: 'Modern Gradient', primary: '#6366f1', accent: '#ec4899', tint: '#f5f3ff', head: 'gradient', serif: false },
];
const DEFAULT_TERMS = "This offer is subject to satisfactory background verification and submission of the required documents. Your employment will be governed by the company's policies. Either party may end the employment by giving the notice period stated by the company.";

/**
 * On-screen letter preview that mirrors the PDF layout. Responsive: it is a normal block that scales with its
 * container (font sizes use em), so it reads well from 320px phones to desktop.
 * `d` = { style, company_name, company_logo_url, company_address, company_website, company_email, company_phone,
 *         candidate_name, designation, salary_text, joining_date, expires_at, probation_months, working_hours,
 *         notice_period, terms, signatory_name, signatory_title, signature_data_url, date, ref, letter }
 */
export default function OfferPreview({ d }) {
  const st = OFFER_STYLES.find((s) => s.key === (d.style?.key || d.template_style)) || OFFER_STYLES[0];
  const dark = ['band', 'gradient', 'premium'].includes(st.head);
  const bg = st.head === 'gradient' ? `linear-gradient(90deg, ${st.primary}, ${st.accent})` : st.primary;
  const details = [d.company_address, d.company_website, d.company_email, d.company_phone].filter(Boolean);
  const rows = [
    ['Designation', d.designation || '-'],
    ['Annual compensation (CTC)', d.salary_text || '-'],
    ['Date of joining', d.joining_date ? formatDate(d.joining_date) : '-'],
    d.probation_months != null && d.probation_months !== '' ? ['Probation period', Number(d.probation_months) === 0 ? 'None' : `${d.probation_months} month${Number(d.probation_months) === 1 ? '' : 's'}`] : null,
    d.working_hours ? ['Working hours', d.working_hours] : null,
    d.notice_period ? ['Notice period', d.notice_period] : null,
    ['Offer valid until', d.expires_at ? formatDate(d.expires_at) : 'the date agreed with us'],
  ].filter(Boolean);
  const terms = (d.terms || DEFAULT_TERMS).split('\n').map((t) => t.trim()).filter(Boolean);
  return (
    <div className={`offer-sheet os-${st.head} ${st.serif ? 'os-serif' : ''}`} style={{ '--op': st.primary, '--oa': st.accent, '--ot': st.tint }} data-testid="offer-letter" data-style={st.key}>
      <header className={`os-head ${dark ? 'dark' : ''}`} style={dark ? { background: bg } : undefined}>
        {d.company_logo_url && <span className="os-logo"><img src={assetUrl(d.company_logo_url)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></span>}
        <div className="os-co">
          <strong>{st.head === 'premium' || st.head === 'classic' ? String(d.company_name || '').toUpperCase() : d.company_name}</strong>
          {details.length > 0 && <small>{details.slice(0, 3).join('  |  ')}</small>}
        </div>
      </header>
      <div className="os-body">
        <h2>Offer of Employment</h2>
        <div className="os-meta"><span><b>Date:</b> {d.date ? formatDate(d.date) : formatDate(new Date().toISOString())}</span>{d.ref && <span><b>Reference:</b> {d.ref}</span>}</div>
        <p>Dear {d.candidate_name || 'Candidate'},</p>
        <p>We are delighted to offer you the position of <b>{d.designation || 'the role'}</b> at <b>{d.company_name}</b>. We were impressed by your skills and experience, and we are excited about the contribution you will make to our team.</p>
        <table className="os-table"><tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
        <h3>Terms and conditions</h3>
        {terms.length > 1 ? <ol>{terms.map((t, i) => <li key={i}>{t.replace(/^\d+[.)]\s*/, '')}</li>)}</ol> : <p>{terms[0]}</p>}
        <p>Please confirm your acceptance of this offer on CareVo before the validity date mentioned above. We look forward to welcoming you on board.</p>
        <div className="os-sign">
          <div>
            <p>Yours sincerely,</p>
            {d.signature_data_url ? <img className="os-sigimg" src={d.signature_data_url} alt="Authorised signature" /> : <span className="os-sigspace" />}
            <b>{d.signatory_name || d.recruiter_name || ''}</b>
            {d.signatory_title && <small>{d.signatory_title}</small>}
            <small>{d.company_name}</small>
          </div>
          <div className="os-accept"><b>Candidate acceptance</b><small>I accept this offer and the terms stated above.</small><span className="os-line" /><small>{d.candidate_name}</small><small>Date: ____________</small></div>
        </div>
      </div>
      <footer className="os-foot"><span>{d.company_name} | Confidential - offer of employment</span>{d.ref && <span>{d.ref}</span>}</footer>
    </div>
  );
}
