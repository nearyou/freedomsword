/** Static review artifacts: no authentication, API requests, or voting actions. Run the adjacent .mjs generator. */
import React, { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, readFile, writeFile, copyFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { ArrowRight, Check, ChevronDown, FileSignature, FileText, Globe2, Send, ShieldCheck, Wallet } from 'lucide-react';
import AppShell from '../frontend/src/components/layout/AppShell';
import CommunityWelcome from '../frontend/src/components/elections/CommunityWelcome';
import { ElectionGallery } from '../frontend/src/components/elections/ElectionSelector';
import CandidateList from '../frontend/src/components/candidates/CandidateList';
import CandidateProfile from '../frontend/src/components/candidates/CandidateProfile';
import ResultsPanel from '../frontend/src/components/results/ResultsPanel';
import AccountabilityPanel from '../frontend/src/components/accountability/AccountabilityPanel';
import PromiseTracker from '../frontend/src/components/PromiseTracker';
import Dialog from '../frontend/src/components/ui/Dialog';
import SupportSlider from '../frontend/src/components/voting/SupportSlider';
import ShareInvite from '../frontend/src/components/voting/ShareInvite';
import ReadyToVote from '../frontend/src/components/welcome/ReadyToVote';
import AllocationConfirmation from '../frontend/src/components/voting/AllocationConfirmation';
import VoteSuccess from '../frontend/src/components/voting/VoteSuccess';
import SocialIcon from '../frontend/src/components/voting/SocialIcon';
import FeedbackLink from '../frontend/src/components/FeedbackLink';
import { VerificationModal } from '../frontend/src/components/welcome/WelcomeModals';
import { copy } from '../frontend/src/components/welcome/copy';
import { previewElections } from '../frontend/src/lib/preview';
import { getShareNetworks } from '../frontend/src/lib/share';
import type { AppTab } from '../frontend/src/lib/ui';

const destination = resolve('frontend/public/review/user-flows');
const noop = () => {};
const election = { ...previewElections[0], protocol: 'CONTINUOUS_SUPPORT' as const };
const candidate = election.candidates[0];
const citizen = { connected: true, verified: true, provider: 'MOCK', agreementSigned: true, signedPlatforms: [], votes: [] };
function Shell({ title, tab = 'Candidates', children }: { title: string; tab?: AppTab; children: ReactNode }) {
  return <AppShell tab={tab} onTab={noop} citizen={citizen} onPassport={noop} inTelegram>
    <div className="elections-page-heading"><div><span className="page-kicker">Your community, your voice</span><h1>{title}</h1></div></div>
    <p className="elections-demo-note"><strong>Demo space</strong> Fictional elections · mock identity and blockchain</p>
    {children}
  </AppShell>;
}
function Welcome({ children, stage = 'connect' }: { children: ReactNode; stage?: 'connect' | 'share' }) {
  return <div className="welcome-root fs-welcome fs-dark" data-stage={stage} data-telegram="true"><div className="welcome-sheet fs-sheet">
    {stage === 'share' && <div className="welcome-language-row"><label className="welcome-language"><Globe2 size={17} aria-hidden="true" /><select defaultValue="en" aria-label="Change language"><option value="en">English</option><option value="uk">Українська</option></select><ChevronDown size={13} aria-hidden="true" /></label></div>}
    {children}</div></div>;
}
function Connect() {
  return <Welcome><main className="fs-stage fs-connect">
    <label className="welcome-language"><select defaultValue="en" aria-label="Change language"><option>English</option><option>Українська</option></select></label>
    <span className="fs-stage-kicker">Let’s get started · 1 / 3</span><div className="fs-progress"><span /></div>
    <h1>Let’s get you ready</h1><p className="fs-stage-intro">Three simple steps. We’ll walk you through them.</p>
    <div className="fs-passport-steps">{[
      [Send, 'Connect Telegram', 'Your Mini App account'], [ShieldCheck, 'Verify your identity', 'Mock check · Rarimo planned'], [FileText, 'Accept civic agreement', 'Participation rules'],
    ].map(([Icon, title, detail], i) => {
      const Mark = Icon as typeof Send;
      return <div className="fs-passport-step" key={String(title)}><span className="fs-passport-number">{i + 1}</span><span className="fs-passport-icon"><Mark size={20} /></span><span className="fs-passport-copy"><strong>{String(title)}</strong><small>{String(detail)}</small></span>{i === 0 ? <span className="fs-passport-status"><Check size={16} /></span> : <ArrowRight size={17} />}</div>;
    })}</div>
    <div className="fs-passport-step fs-passport-wallet"><span className="fs-passport-icon"><Wallet size={20} /></span><span className="fs-passport-copy"><strong>Connect wallet</strong><small>Telegram Wallet or another compatible option.</small></span><span className="fs-passport-preview">INTEGRATION PLANNED</span></div>
    <FeedbackLink className="fs-feedback" /><button className="button secondary">Invite friends</button>
    <div className="fs-stage-bottom"><button className="fs-button">Continue <ArrowRight size={18} /></button><small>Fictional election · mock verification</small></div>
  </main></Welcome>;
}
function Agreement() {
  return <Welcome><Dialog titleId="agreement-review" onClose={noop} className="civic-modal">
    <span className="civic-seal modal-seal"><FileSignature size={31} /></span><p className="civic-eyebrow">STEP 3 / 3 · MOCK VERIFICATION</p>
    <h2 id="agreement-review">{copy.en.agreement}</h2><p className="civic-modal-intro">{copy.en.agreementIntro}</p><p className="civic-modal-copy">{copy.en.agreementDetail}</p>
    <p className="civic-agreement-version">Agreement · illustrative document</p>
    <div className="civic-agreement-document">Sample for layout review. The live flow loads the current civic agreement from the service before acceptance.</div>
    <label className="civic-checkbox-label"><input type="checkbox" defaultChecked /><span>{copy.en.agree}</span></label>
    <button className="civic-gold-button">{copy.en.acceptButton}</button>
  </Dialog></Welcome>;
}
function Support({ value, current = value, cooling = 0 }: { value: number; current?: number; cooling?: number }) {
  return <Shell title="Your support" tab="My ballot"><section className="panel reusable-support">
    <h2>Your voice, your choice</h2><p>You start with the same 100 support units as everyone else in this election.</p>
    <dl className="support-budget"><div><dt>Available</dt><dd>0</dd></div><div><dt>Supporting candidates</dt><dd>{current}</dd></div><div><dt>Cooling down</dt><dd>{cooling}</dd></div></dl>
    <label>Candidate<select defaultValue={candidate.id}><option value={candidate.id}>{candidate.fullName}</option></select></label>
    <SupportSlider current={current} maximum={current} value={value} disabled={false} onChange={noop} />
    <p className="support-keep">{value < current ? `Recall ${current - value} units · Keep ${value} units.` : `Currently supporting this candidate: ${current} units.`}</p>
    <button className="button primary support-submit" data-action="withdraw">{value < current ? `Recall ${current - value} units` : 'Choose a change above'}</button>
    {cooling > 0 && <section className="support-cooldowns"><h3>When your recalled units return</h3><p>{cooling} units · six calendar months after withdrawal.</p><p>Allocate them to the same candidate or others, in parts or in full.</p></section>}
  </section></Shell>;
}
const flows: { number: number; slug: string; title: string; note: string; view: ReactNode }[] = [
  { number: 3, slug: 'get-ready', title: 'Let’s get you ready', note: 'Connection steps, wallet status, feedback and an entry to the invitation screen.', view: <Connect /> },
  { number: 4, slug: 'ready-to-vote', title: 'I’m ready to vote', note: 'Reference-style dove and ivory card, approved invitation, Telegram link and circular social buttons. The app teaser is included in the shared picture. Incomplete verification still gates voting.', view: <Welcome stage="share"><ReadyToVote eligible={false} onContinue={noop} /></Welcome> },
  { number: 4, slug: 'verification', title: 'Identity verification', note: 'Current mock-verification form. Rarimo remains marked as planned.', view: <Welcome><VerificationModal t={copy.en} onClose={noop} busy={false} error="" preview={false} verified={false} available onVerify={async () => true} onAgreement={noop} /></Welcome> },
  { number: 5, slug: 'agreement', title: 'Civic agreement', note: 'Consent layout. Sample document only; the live application fetches the current agreement.', view: <Agreement /> },
  { number: 6, slug: 'elections', title: 'Explore elections', note: 'The community introduction and election gallery.', view: <Shell title="Elections"><CommunityWelcome /><ElectionGallery elections={[election, ...previewElections.slice(1)]} onSelect={noop} /></Shell> },
  { number: 7, slug: 'candidates', title: 'Meet the candidates', note: 'Candidate search, sorting and profile cards.', view: <Shell title={election.title}><CandidateList election={election} onProfile={noop} query="" onQuery={noop} sort="support" onSort={noop} /></Shell> },
  { number: 8, slug: 'candidate-profile', title: 'Candidate profile', note: 'Portrait, support, overview and profile tabs.', view: <CandidateProfile candidate={candidate} election={election} citizen={citizen} ready busy={false} onClose={noop} onCast={noop} onPassport={noop} onAction={async () => true} /> },
  { number: 9, slug: 'platform', title: 'Read a platform', note: 'Text proposals and public promises from the fictional candidate.', view: <Dialog titleId="platform-review" onClose={noop} className="profile-modal"><h2 id="platform-review">{candidate.platform!.title}</h2><p className="party">{candidate.fullName}</p><div className="platform-detail"><p>{candidate.platform!.content}</p></div><PromiseTracker promises={candidate.platform!.promises} /></Dialog> },
  { number: 10, slug: 'confirm-support', title: 'Confirm your vote', note: 'Candidate and support rules are shown before any units are allocated.', view: <Dialog titleId="allocation-review" onClose={noop}><h2 id="allocation-review">Confirm your vote</h2><AllocationConfirmation candidate={candidate} units={100} /><div className="dialog-actions"><button className="button secondary">Cancel</button><button className="button primary">Confirm vote</button></div></Dialog> },
  { number: 11, slug: 'vote-cast', title: 'Your vote is cast', note: 'Shown only after a successful save. A selected ballot and confetti replace the green check badge. Motion is disabled for reduced-motion preferences.', view: <Shell title="Your vote" tab="My ballot"><VoteSuccess name={candidate.fullName} units={100} onBallot={noop} onExplore={noop} /></Shell> },
  { number: 11, slug: 'your-support', title: 'Your support · 100', note: 'Four-part blue diagram for 100 units.', view: <Support value={100} /> },
  { number: 12, slug: 'recall-preview', title: 'Recall preview · 75', note: 'A 25-unit recall leaves 75 units in green. Slider, swipe and + / − edit the draft.', view: <Support current={100} value={75} /> },
  { number: 13, slug: 'cooldown', title: 'After the recall', note: '75 units stay with the candidate; 25 units return six calendar months after withdrawal.', view: <Support value={75} cooling={25} /> },
  { number: 14, slug: 'invitation', title: 'Invite someone', note: 'The approved three-line invitation and Telegram Mini App link, followed by the current demo disclosure.', view: <Shell title="Share FreedomSword" tab="My ballot"><ShareInvite /></Shell> },
  { number: 15, slug: 'networks', title: 'More social networks', note: 'A logo beside every network. Instagram copies the invitation for pasting into a post or message.', view: <Dialog titleId="networks-review" onClose={noop}><h2 id="networks-review">Share FreedomSword</h2><p>Choose a network or share through an app on your device.</p><div className="share-networks">{getShareNetworks('en').map((network) => <button className="button secondary" key={network.name}><SocialIcon name={network.name} />{network.name}</button>)}</div><p className="fine-print">For Instagram, we copy the invitation and open Instagram. Paste it into your post or message.</p></Dialog> },
  { number: 16, slug: 'results', title: 'Results', note: 'Public aggregate support. These figures are fictional samples.', view: <Shell title="Results" tab="Live results"><ResultsPanel election={election} source="preview" stale={false} /></Shell> },
  { number: 17, slug: 'promises', title: 'Track promises', note: 'Candidate promises, progress and evidence.', view: <Shell title="Promises" tab="Accountability"><AccountabilityPanel candidates={election.candidates} onProfile={noop} /></Shell> },
  { number: 18, slug: 'audit', title: 'Inspect public records', note: 'Audit layout with illustrative commitment rows. No real hashes or transactions are presented.', view: <Dialog titleId="audit-review" onClose={noop} className="audit-modal"><div className="eyebrow">PUBLIC COMMITMENTS ONLY</div><h2 id="audit-review">A record you can inspect.</h2><p className="modal-copy">Append-only, salted SHA-256 commitments. No identities or individual ballot details are published.</p><div className="audit-summary"><span>Sample commitments</span></div>{[3, 2, 1].map((id) => <details className="audit-row" key={id}><summary><span>Commitment #{id}</span><span>MOCK</span></summary><p>Illustrative audit entry for layout review.</p></details>)}</Dialog> },
].map((flow, index) => ({ ...flow, number: index + 3 }));
await mkdir(destination, { recursive: true });
// Retire only files listed by the previous generated board, preserving unrelated files.
const currentFiles = new Set(flows.map((flow) => `${String(flow.number).padStart(2, '0')}-${flow.slug}.html`));
const previousIndex = await readFile(`${destination}/index.html`, 'utf8').catch(() => '');
for (const match of previousIndex.matchAll(/<iframe title="[^"]+" src="([0-9]{2}-[a-z-]+\.html)"/g)) {
  if (currentFiles.has(match[1])) continue;
  for (const file of [match[1], `images/${match[1].replace('.html', '.png')}`, `images/phone-views/${match[1].replace('.html', '.png')}`])
    await unlink(`${destination}/${file}`).catch((error) => { if (error.code !== 'ENOENT') throw error; });
}
const styles = await Promise.all(['globals', 'theme', 'redesign', 'elections-clarity', 'precision', 'welcome', 'welcome-redesign', 'welcome-clarity', 'welcome-client'].map((name) => readFile(`frontend/src/app/${name}.css`, 'utf8')));
const preflight = await postcss([tailwind()]).process('@import "tailwindcss/preflight.css";', { from: resolve('frontend/src/app/review.css') });
const font = 'inter-latin-wght-normal.woff2';
await copyFile(`node_modules/@fontsource-variable/inter/files/${font}`, `${destination}/${font}`);
await copyFile('node_modules/@fontsource-variable/inter/LICENSE', `${destination}/FONT-LICENSE.txt`);
const headingFont = 'playfair-display-latin-wght-normal.woff2';
await copyFile(`node_modules/@fontsource-variable/playfair-display/files/${headingFont}`, `${destination}/${headingFont}`);
await copyFile('node_modules/@fontsource-variable/playfair-display/LICENSE', `${destination}/HEADING-FONT-LICENSE.txt`);
styles.unshift(`@font-face{font-family:'Playfair Display Variable';src:url('${headingFont}') format('woff2');font-weight:400 900;font-display:swap}`);
await writeFile(`${destination}/review.css`, preflight.css + `\n@font-face{font-family:'Inter Variable';src:url('${font}') format('woff2');font-weight:100 900;font-display:swap}\n` + styles.join('\n').replace("@import 'tailwindcss';", '') + '\nbody{min-height:100svh}body>header.review-chrome{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:#0a1722;color:#f1f3f2;font:600 14px Inter,Arial,sans-serif}body>header.review-chrome+div{min-height:calc(100svh - 48px)}a,button,select,input,summary{pointer-events:none}.fs-welcome .fs-connect{padding-top:54px!important}.modal-backdrop{top:48px}.app-shell[data-telegram=true] .topbar{display:none}.mobile-nav{position:fixed}.fs-connect .welcome-language{position:absolute;top:10px;right:22px}');
const assetBase = '<base href="https://freedomsword.org/">';
for (const flow of flows) {
  const body = renderToStaticMarkup(flow.view);
  await writeFile(`${destination}/${String(flow.number).padStart(2, '0')}-${flow.slug}.html`, `<!doctype html><html lang="en" data-theme="dark" data-interface="refined"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">${assetBase}<link rel="stylesheet" href="/review/user-flows/review.css"><title>${flow.number}. ${flow.title} — FreedomSword</title></head><body><header class="review-chrome"><span>‹</span><span>FreedomSword</span><span>⋮</span></header>${body}</body></html>`);
}
const frames = flows.map((flow) => { const file = `${String(flow.number).padStart(2, '0')}-${flow.slug}.html`; return `<article id="screen-${flow.number}"><h2><span>${String(flow.number).padStart(2, '0')}</span> ${flow.title}</h2><p>${flow.note}</p><iframe title="${flow.number}. ${flow.title}" src="${file}" loading="lazy" sandbox="allow-same-origin"></iframe><a href="${file}" target="_blank" rel="noopener">Open screen ${flow.number} at full size ↗</a> · <a href="images/${file.replace('.html', '.png')}" download>Download PNG ↓</a></article>`; }).join('\n');
await writeFile(`${destination}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>FreedomSword — flows 3–18</title><style>@font-face{font-family:Inter;src:url('${font}');font-weight:100 900}*{box-sizing:border-box}body{margin:0;background:#09151f;color:#eef3f5;font-family:Inter,Arial,sans-serif}.canvas{max-width:1380px;margin:auto;padding:40px 24px}h1{font-size:clamp(28px,4vw,42px);letter-spacing:-.035em;margin:8px 0 12px}header p{max-width:840px;color:#aec2d0;line-height:1.7}.eyebrow{color:#8ecff1;font-size:12px;letter-spacing:.1em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px 28px;margin-top:36px}article{min-width:0;scroll-margin-top:20px}h2{font-size:18px;margin:0 0 8px;display:flex;gap:10px;align-items:center}h2 span{color:#8ecff1}article p{font-size:13px;line-height:1.6;color:#aec2d0;min-height:64px}iframe{display:block;width:100%;height:844px;border:1px solid #354f60;border-radius:12px;background:#0a1722}a{display:inline-block;color:#9bd7f8;font-size:13px;padding:12px 0}.jump{display:flex;flex-wrap:wrap;gap:16px}.jump a{padding:6px}.palette{display:flex;flex-wrap:wrap;gap:16px;margin:20px 0}.palette i{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px}.palette span{font-size:12px;color:#c3d4de}@media(max-width:680px){.canvas{padding:28px 14px}.grid{grid-template-columns:minmax(0,1fr);max-width:430px;margin:28px auto}article p{min-height:0}}@media print{.grid{display:block}article{break-after:page;max-width:390px;margin:auto}iframe{height:844px}header,.jump{display:none}}</style></head><body><main class="canvas"><header><span class="eyebrow">FREEDOMSWORD · DESIGN REVIEW · 30 OCTOBER 2026</span><h1>Your next steps, in order.</h1><p>Screens 3–18 follow the two approved opening screens. These static mockups use current app components and sample states; controls cannot save or submit actions. Scroll inside a frame to see its complete content, or open it at full size. Reference a screen number when sending feedback.</p><p>The review is in English. In the app, your selected English/Ukrainian language is remembered for the menu and invitation; candidate content follows its published language. The agreement and audit entries below are illustrative layout samples.</p><div class="palette">${[[100,'#55b4df'],[75,'#69d4b1'],[50,'#f1cc60'],[25,'#ef7b80'],[0,'#788994']].map(([n,c])=>`<span><i style="background:${c}"></i>${n} units</span>`).join('')}</div><nav class="jump" aria-label="Jump to screen">${flows.map((f)=>`<a href="#screen-${f.number}">${f.number}</a>`).join('')}</nav><p><a href="freedomsword-user-flows-03-18.zip" download>Download all step images (ZIP) ↓</a> · <a href="images/00-all-steps.png" target="_blank" rel="noopener">Open image overview ↗</a></p></header><section class="grid">${frames}</section></main></body></html>`);
const board = await readFile(`${destination}/index.html`, 'utf8');
await writeFile(`${destination}/index.html`, board.replaceAll('3–18', '3–20').replaceAll('03-18.zip', '03-20.zip').replace('30 OCTOBER', '31 OCTOBER'));
console.log(`Created ${flows.length} ordered mockups at ${destination}`);
