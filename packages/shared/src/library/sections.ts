import type { LibraryItem, NodeSpec, StyleMap } from '../types.js';
import { elementSpec } from '../elements.js';
export type Lang = 'pl' | 'en';
export const L = (language: Lang, en: string, pl: string) => language === 'pl' ? pl : en;
export function node(type: string, props: Record<string, any> = {}, styles: StyleMap = {}, children: NodeSpec[] = [], name?: string): NodeSpec {
  const base = elementSpec(type); return { ...base, name: name || base.name, props: { ...base.props, ...props }, styles: { ...base.styles, ...styles }, children };
}
export const heading = (text: string, level = 2, styles: StyleMap = {}) => node('heading', { text, level }, styles);
export const paragraph = (text: string, styles: StyleMap = {}) => node('paragraph', { text }, styles);
export const button = (text: string, href = '#contact', variant: 'primary' | 'outline' | 'ghost' = 'primary') => node('button', { text, href }, variant === 'primary' ? { background: 'var(--sb-primary)', color: 'var(--sb-bg)', padding: '16px 28px', borderRadius: 999, fontWeight: 700 } : variant === 'outline' ? { background: 'transparent', color: 'var(--sb-text)', border: '1px solid var(--sb-border)', padding: '16px 28px', borderRadius: 999 } : { background: 'transparent', color: 'var(--sb-primary)', padding: '16px 8px' });
export const image = (src: string, alt: string, styles: StyleMap = {}) => node('image', { src, alt, loading: 'eager' }, { width: '100%', borderRadius: 'var(--sb-radius)', ...styles });
export const icon = (name = 'sparkles', size = 28) => node('icon', { icon: name, size }, { color: 'var(--sb-primary)', marginBottom: 18 });
export const container = (children: NodeSpec[], styles: StyleMap = {}) => node('container', {}, { width: '100%', maxWidth: 1200, margin: '0 auto', ...styles }, children);
export const stack = (children: NodeSpec[], gap = 24, styles: StyleMap = {}) => node('stack', {}, { display: 'flex', flexDirection: 'column', gap, ...styles }, children);
export const grid = (children: NodeSpec[], columns = 3, gap = 24) => node('grid', {}, { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap }, children);
export const row = (children: NodeSpec[], styles: StyleMap = {}) => node('row', {}, { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', ...styles }, children);
export const card = (children: NodeSpec[], styles: StyleMap = {}) => node('card', {}, { padding: 32, background: 'var(--sb-surface)', border: '1px solid var(--sb-border)', borderRadius: 'var(--sb-radius)', ...styles }, children);
export const section = (anchor: string, children: NodeSpec[], styles: StyleMap = {}) => node('section', { anchor, label: anchor }, { padding: '104px 32px', ...styles }, [container(children)], anchor);
export const eyebrow = (text: string) => node('badge', { text }, { background: 'color-mix(in srgb, var(--sb-primary) 12%, transparent)', color: 'var(--sb-primary)', border: '1px solid color-mix(in srgb, var(--sb-primary) 25%, transparent)', padding: '8px 14px', borderRadius: 999, fontSize: 11, letterSpacing: '0.14em', fontWeight: 700, width: 'fit-content' });
export const PHOTO = {
  studio: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85',
  architecture: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1400&q=85',
  interior: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85',
  nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=85',
  mountain: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85',
  coast: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85',
  city: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1400&q=85',
  food: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=85',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=85',
  fitness: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=85',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=85',
  gaming: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=85',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1400&q=85',
  product: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85',
  desk: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=85',
  team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=85',
  portrait1: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=85',
  portrait2: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=85',
  portrait3: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=85',
};
export interface SectionContent { brand?: string; title?: string; subtitle?: string; image?: string; language?: Lang; }
const copy = (c: SectionContent, en: string, pl: string) => L(c.language || 'en', en, pl);
const title = (c: SectionContent, fallback: string) => c.title || fallback;
const subtitle = (c: SectionContent, fallback: string) => c.subtitle || fallback;
const sectionTitle = (c: SectionContent, en: string, pl: string, label?: string) => stack([eyebrow(label || copy(c, 'WHY IT MATTERS', 'DLACZEGO TO WAŻNE')), heading(title(c, copy(c, en, pl)), 2, { fontSize: 44, maxWidth: 720 }), paragraph(subtitle(c, copy(c, 'Thoughtfully designed. Built around you. Ready for what comes next.', 'Przemyślany design. Stworzony wokół Ciebie. Gotowy na to, co dalej.')), { maxWidth: 620 })], 20, { marginBottom: 48 });
const featureData = (c: SectionContent) => [
  { icon: 'bolt', title: copy(c, 'Built for momentum', 'Stworzone dla rozwoju'), text: copy(c, 'Move from first idea to finished work without losing your creative flow.', 'Przejdź od pierwszego pomysłu do gotowego projektu bez utraty kreatywnego rytmu.') },
  { icon: 'shield', title: copy(c, 'Confidence, built in', 'Pewność na każdym kroku'), text: copy(c, 'A reliable foundation that keeps the important things working beautifully.', 'Solidne fundamenty, dzięki którym najważniejsze rzeczy działają bez zarzutu.') },
  { icon: 'globe', title: copy(c, 'Made to reach further', 'Stworzone, by sięgać dalej'), text: copy(c, 'Reach the right people with an experience that works on every screen.', 'Docieraj do właściwych osób dzięki doświadczeniu działającemu na każdym ekranie.') },
];
export function hero(c: SectionContent, variant: 'split' | 'center' | 'editorial' | 'immersive' | 'minimal' | 'product' = 'split'): NodeSpec {
  const lang = c.language || 'en'; const brand = c.brand || 'NOVA';
  const head = title(c, copy(c, `Make room for your next big idea.`, `Zrób miejsce na swój wielki pomysł.`));
  const sub = subtitle(c, copy(c, `${brand} brings thoughtful design and powerful tools together, so you can create something that feels unmistakably yours.`, `${brand} łączy przemyślany design z potężnymi narzędziami, abyś mógł stworzyć coś wyjątkowego.`));
  const actions = row([button(copy(c, 'Start your journey', 'Rozpocznij podróż'), '#contact'), button(copy(c, 'Explore more', 'Odkryj więcej'), '#features', 'outline')]);
  const intro = stack([eyebrow(copy(c, 'A NEW WAY TO CREATE', 'NOWY SPOSÓB TWORZENIA')), heading(head, 1, { fontSize: variant === 'minimal' ? 88 : 64, lineHeight: 1.04, letterSpacing: '-0.05em' }), paragraph(sub, { fontSize: 19, maxWidth: 560 }), actions], 28);
  if (variant === 'center') return section('hero', [stack([intro, image(c.image || PHOTO.studio, head, { height: 460, objectFit: 'cover' })], 56, { alignItems: 'center', textAlign: 'center' })], { paddingTop: 120 });
  if (variant === 'editorial') return section('hero', [stack([heading(head, 1, { fontSize: 92, lineHeight: 1, letterSpacing: '-0.06em', maxWidth: 1000 }), row([paragraph(sub, { maxWidth: 520 }), actions], { justifyContent: 'space-between' }), image(c.image || PHOTO.architecture, head, { height: 520 })], 40)]);
  if (variant === 'immersive') return node('backgroundImage', { src: c.image || PHOTO.mountain, overlay: 0.55, anchor: 'hero' }, { minHeight: 760, display: 'flex', alignItems: 'center', padding: '120px 32px' }, [container([intro])], 'Hero');
  if (variant === 'minimal') return section('hero', [stack([eyebrow(brand.toUpperCase()), heading(head, 1, { fontSize: 96, lineHeight: 1, letterSpacing: '-0.06em', maxWidth: 1100 }), paragraph(sub, { fontSize: 22, maxWidth: 640 }), actions], 32)], { paddingTop: 140, paddingBottom: 140 });
  const visual = variant === 'product' ? card([image(c.image || PHOTO.product, head, { height: 420 }), row([heading(copy(c, 'The everyday essential', 'Codzienny niezbędnik'), 3, { fontSize: 22 }), node('price', { amount: 89, currency: 'USD', suffix: '' }, { fontSize: 24 })], { justifyContent: 'space-between' })], { padding: 20, transform: 'rotate(2deg)' }) : image(c.image || PHOTO.studio, head, { height: 520 });
  return section('hero', [node('columns', {}, { display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 64, alignItems: 'center' }, [intro, visual])], { paddingTop: 112, paddingBottom: 112 });
}
export function features(c: SectionContent, variant: 'cards' | 'split' | 'bento' | 'numbers' = 'cards'): NodeSpec {
  const data = featureData(c); const head = sectionTitle(c, 'Everything you need. Nothing you don’t.', 'Wszystko, czego potrzebujesz. Nic zbędnego.', copy(c, 'THE DETAILS MAKE THE DIFFERENCE', 'SZCZEGÓŁY ROBIĄ RÓŻNICĘ'));
  if (variant === 'split') return section('features', [node('columns', {}, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }, [image(c.image || PHOTO.team, copy(c, 'Our approach', 'Nasze podejście'), { height: 560 }), stack([head, ...data.map((f, i) => row([icon(f.icon), stack([heading(f.title, 3, { fontSize: 22 }), paragraph(f.text, { fontSize: 16 })], 8)]))], 24)])]);
  if (variant === 'bento') return section('features', [head, node('grid', {}, { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 24 }, [card([icon('bolt'), heading(data[0].title, 3, { fontSize: 30 }), paragraph(data[0].text), image(c.image || PHOTO.tech, data[0].title, { height: 220 })], { gridColumn: 'span 2' }), card([icon('shield'), heading(data[1].title, 3, { fontSize: 26 }), paragraph(data[1].text)]), card([icon('globe'), heading(data[2].title, 3, { fontSize: 26 }), paragraph(data[2].text)]), card([heading('100%', 2, { fontSize: 64, color: 'var(--sb-primary)' }), paragraph(copy(c, 'Focused on your success', 'Skupieni na Twoim sukcesie'))], { gridColumn: 'span 2', background: 'color-mix(in srgb, var(--sb-primary) 10%, var(--sb-surface))' })])]);
  if (variant === 'numbers') return section('features', [head, stack(data.map((f, i) => row([heading(`0${i + 1}`, 2, { fontSize: 48, color: 'var(--sb-primary)', minWidth: 90 }), stack([heading(f.title, 3, { fontSize: 28 }), paragraph(f.text)], 8), icon(f.icon, 32)], { justifyContent: 'space-between', padding: '32px 0', borderTop: '1px solid var(--sb-border)' })), 0)]);
  return section('features', [head, grid(data.map(f => card([icon(f.icon), heading(f.title, 3, { fontSize: 24 }), paragraph(f.text, { fontSize: 16 })])))]);
}
export function pricing(c: SectionContent, variant: 'three' | 'two' | 'simple' = 'three'): NodeSpec {
  const plans = variant === 'two' ? [{ name: copy(c, 'Essential', 'Podstawowy'), price: 29, features: [copy(c, 'Everything to get started', 'Wszystko na start'), copy(c, 'Personal projects', 'Projekty osobiste'), copy(c, 'Email support', 'Wsparcie e-mail')] }, { name: copy(c, 'Professional', 'Profesjonalny'), price: 79, features: [copy(c, 'Unlimited projects', 'Nieograniczone projekty'), copy(c, 'Advanced features', 'Zaawansowane funkcje'), copy(c, 'Priority support', 'Priorytetowe wsparcie'), copy(c, 'Custom domain', 'Własna domena')] }] : [{ name: copy(c, 'Starter', 'Start'), price: 0, features: [copy(c, '1 project', '1 projekt'), copy(c, 'Core components', 'Podstawowe komponenty'), copy(c, 'Community support', 'Wsparcie społeczności')] }, { name: copy(c, 'Pro', 'Pro'), price: 29, features: [copy(c, 'Unlimited projects', 'Nieograniczone projekty'), copy(c, 'All components', 'Wszystkie komponenty'), copy(c, 'Custom domain', 'Własna domena'), copy(c, 'Priority support', 'Priorytetowe wsparcie')] }, { name: copy(c, 'Business', 'Biznes'), price: 99, features: [copy(c, 'Everything in Pro', 'Wszystko z Pro'), copy(c, 'Team collaboration', 'Współpraca zespołowa'), copy(c, 'Advanced analytics', 'Zaawansowana analityka'), copy(c, 'Dedicated support', 'Dedykowane wsparcie')] }];
  return section('pricing', [sectionTitle(c, 'Simple plans. Serious possibilities.', 'Proste plany. Poważne możliwości.', copy(c, 'CHOOSE YOUR PLAN', 'WYBIERZ PLAN')), grid(plans.map((plan, i) => card([heading(plan.name, 3, { fontSize: 22 }), node('price', { amount: plan.price, currency: 'USD', suffix: copy(c, '/ month', '/ mies.') }, { fontSize: 52 }), node('divider'), node('list', { items: plan.features }, { lineHeight: 2.2, paddingLeft: 20 }), button(copy(c, 'Get started', 'Wybieram'), '#contact', i === 1 ? 'primary' : 'outline')], i === 1 && variant === 'three' ? { border: '2px solid var(--sb-primary)', background: 'color-mix(in srgb, var(--sb-primary) 8%, var(--sb-surface))' } : {})), plans.length)]);
}
export function testimonials(c: SectionContent, variant: 'cards' | 'feature' | 'slider' = 'cards'): NodeSpec {
  const quotes = [
    { text: copy(c, '“The kind of experience that makes you wonder how you ever worked without it. Every detail feels considered.”', '„Doświadczenie, po którym zastanawiasz się, jak wcześniej pracowałeś. Każdy detal jest przemyślany.”'), name: 'Alex Morgan', role: copy(c, 'Creative Director', 'Dyrektor kreatywny'), src: PHOTO.portrait1 },
    { text: copy(c, '“From the first conversation to the final result, everything was seamless. Truly a partner who cares.”', '„Od pierwszej rozmowy do finalnego efektu wszystko przebiegło płynnie. Prawdziwy partner, któremu zależy.”'), name: 'Jordan Lee', role: copy(c, 'Founder, Studio North', 'Założyciel, Studio North'), src: PHOTO.portrait2 },
    { text: copy(c, '“Beautiful, intuitive and genuinely useful. It changed the way our team approaches every project.”', '„Piękne, intuicyjne i naprawdę użyteczne. Zmieniło sposób, w jaki nasz zespół podchodzi do projektów.”'), name: 'Sam Rivera', role: copy(c, 'Product Lead', 'Lider produktu'), src: PHOTO.portrait3 },
  ];
  const quoteCard = (q: typeof quotes[0]) => card([node('rating', { value: 5 }), paragraph(q.text, { fontSize: 18, color: 'var(--sb-text)' }), row([node('avatar', { src: q.src, alt: q.name }, { width: 48, height: 48 }), stack([heading(q.name, 4, { fontSize: 15 }), paragraph(q.role, { fontSize: 13 })], 2)])], { display: 'flex', flexDirection: 'column', gap: 24 });
  const head = sectionTitle(c, 'Good words from great people.', 'Dobre słowa od wyjątkowych ludzi.', copy(c, 'CLIENT STORIES', 'HISTORIE KLIENTÓW'));
  if (variant === 'feature') return section('testimonials', [card([node('rating'), heading(quotes[0].text, 2, { fontSize: 36, lineHeight: 1.4 }), row([node('avatar', { src: quotes[0].src, alt: quotes[0].name }), stack([heading(quotes[0].name, 4, { fontSize: 16 }), paragraph(quotes[0].role, { fontSize: 14 })], 2)])], { padding: 64, display: 'flex', flexDirection: 'column', gap: 32 })]);
  if (variant === 'slider') return section('testimonials', [head, node('slider', { autoplay: true, interval: 6000 }, {}, quotes.map(quoteCard))]);
  return section('testimonials', [head, grid(quotes.map(quoteCard))]);
}
export function faq(c: SectionContent, variant: 'stack' | 'split' = 'stack'): NodeSpec {
  const items = [
    [copy(c, 'How do I get started?', 'Jak zacząć?'), copy(c, 'Reach out through the contact form or choose the option that fits you best. We will guide you through the next steps.', 'Skontaktuj się przez formularz lub wybierz opcję, która najbardziej Ci odpowiada. Poprowadzimy Cię przez kolejne kroki.')],
    [copy(c, 'Can I change my plan later?', 'Czy mogę później zmienić plan?'), copy(c, 'Yes. You can upgrade or downgrade at any time, and the change takes effect from the next billing cycle.', 'Tak. Możesz zmienić plan w dowolnym momencie, a zmiana zacznie obowiązywać od kolejnego cyklu rozliczeniowego.')],
    [copy(c, 'Do you offer support?', 'Czy oferujecie wsparcie?'), copy(c, 'Absolutely. Our team is here to help with questions, setup and anything else you need along the way.', 'Oczywiście. Nasz zespół pomoże Ci z pytaniami, konfiguracją i wszystkim, czego potrzebujesz po drodze.')],
    [copy(c, 'Is there a commitment?', 'Czy jest okres zobowiązania?'), copy(c, 'No long-term commitment is required. Stay because you love the experience, not because you have to.', 'Nie wymagamy długoterminowych zobowiązań. Zostań, bo lubisz to doświadczenie, a nie dlatego, że musisz.')],
  ].map(([title, text]) => node('accordion', { title, text, open: false }));
  if (variant === 'split') return section('faq', [node('columns', {}, { display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 64 }, [sectionTitle(c, 'Questions, answered.', 'Pytania i odpowiedzi.', 'FAQ'), stack(items, 0)])]);
  return section('faq', [sectionTitle(c, 'Questions, answered.', 'Pytania i odpowiedzi.', 'FAQ'), stack(items, 0, { maxWidth: 820, margin: '0 auto' })]);
}
export function team(c: SectionContent, columns = 3): NodeSpec {
  const people = [{ name: 'Alex Morgan', role: copy(c, 'Founder & Creative Director', 'Założyciel i dyrektor kreatywny'), src: PHOTO.portrait1 }, { name: 'Jordan Lee', role: copy(c, 'Head of Design', 'Lider designu'), src: PHOTO.portrait2 }, { name: 'Sam Rivera', role: copy(c, 'Lead Developer', 'Główny developer'), src: PHOTO.portrait3 }, { name: 'Taylor Kim', role: copy(c, 'Strategy & Partnerships', 'Strategia i partnerstwa'), src: PHOTO.portrait1 }].slice(0, columns);
  return section('team', [sectionTitle(c, 'The people behind the work.', 'Ludzie, którzy stoją za projektami.', copy(c, 'MEET THE TEAM', 'POZNAJ ZESPÓŁ')), grid(people.map(p => card([node('avatar', { src: p.src, alt: p.name }, { width: '100%', height: 280, borderRadius: 16 }), heading(p.name, 3, { fontSize: 22 }), paragraph(p.role, { fontSize: 15 })], { textAlign: 'center' })), columns)]);
}
export function about(c: SectionContent, variant: 'split' | 'story' = 'split'): NodeSpec {
  const text = copy(c, `${c.brand || 'We'} started with a simple belief: great work happens when craft meets curiosity. Today, we bring together strategy, design and technology to build things that matter.`, `${c.brand || 'Zaczynaliśmy'} od prostego przekonania: wielkie rzeczy powstają, gdy rzemiosło spotyka ciekawość. Dziś łączymy strategię, design i technologię, by tworzyć to, co naprawdę ma znaczenie.`);
  if (variant === 'story') return section('about', [stack([eyebrow(copy(c, 'OUR STORY', 'NASZA HISTORIA')), heading(title(c, copy(c, 'Small beginnings. Big ambitions.', 'Małe początki. Wielkie ambicje.')), 2, { fontSize: 52, maxWidth: 800 }), paragraph(text, { fontSize: 20, maxWidth: 760 }), image(c.image || PHOTO.team, copy(c, 'Our team at work', 'Nasz zespół przy pracy'), { height: 480 })], 32)]);
  return section('about', [node('columns', {}, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }, [image(c.image || PHOTO.team, copy(c, 'Our team', 'Nasz zespół'), { height: 520 }), stack([eyebrow(copy(c, 'ABOUT US', 'O NAS')), heading(copy(c, 'Craft meets curiosity.', 'Rzemiosło spotyka ciekawość.'), 2, { fontSize: 44 }), paragraph(text), row([node('stat', { value: '10+', label: copy(c, 'Years of experience', 'Lat doświadczenia') }), node('stat', { value: '250+', label: copy(c, 'Projects delivered', 'Zrealizowanych projektów') })], { gap: 48 })], 24)])]);
}
export function contact(c: SectionContent, variant: 'split' | 'center' = 'split'): NodeSpec {
  const form = card([heading(copy(c, 'Tell us about your idea', 'Opowiedz nam o swoim pomyśle'), 3, { fontSize: 26 }), node('contactForm', { formName: 'Contact', buttonText: copy(c, 'Send message', 'Wyślij wiadomość') })], { padding: 40 });
  const info = stack([eyebrow(copy(c, 'LET’S TALK', 'POROZMAWIAJMY')), heading(copy(c, 'Your next chapter starts with a conversation.', 'Twój nowy rozdział zaczyna się od rozmowy.'), 2, { fontSize: 44 }), paragraph(copy(c, 'Have a project in mind, a question, or just want to say hello? We would love to hear from you.', 'Masz pomysł na projekt, pytanie albo po prostu chcesz się przywitać? Chętnie Cię wysłuchamy.')), node('divider'), stack([heading('Email', 4, { fontSize: 14, color: 'var(--sb-muted)' }), node('link', { text: 'hello@example.com', href: 'mailto:hello@example.com' }, { fontSize: 20, color: 'var(--sb-primary)' })], 6)], 24);
  return section('contact', variant === 'center' ? [stack([info, form], 40, { maxWidth: 720, margin: '0 auto' })] : [node('columns', {}, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }, [info, form])]);
}
export function portfolio(c: SectionContent, variant: 'grid' | 'editorial' = 'grid'): NodeSpec {
  const works = [{ title: copy(c, 'A new perspective', 'Nowa perspektywa'), tag: copy(c, 'Brand & Digital', 'Marka i digital'), src: c.image || PHOTO.architecture }, { title: copy(c, 'Quiet confidence', 'Cicha pewność'), tag: copy(c, 'Art Direction', 'Kierunek artystyczny'), src: PHOTO.interior }, { title: copy(c, 'Beyond the ordinary', 'Poza zwykłość'), tag: copy(c, 'Web Experience', 'Doświadczenie webowe'), src: PHOTO.nature }];
  const workCard = (w: typeof works[0], i: number) => stack([image(w.src, w.title, { height: variant === 'editorial' && i === 0 ? 520 : 340 }), row([heading(w.title, 3, { fontSize: 22 }), node('link', { text: '↗', href: '#contact' }, { fontSize: 24 })], { justifyContent: 'space-between' }), paragraph(w.tag, { fontSize: 14 })], 12);
  return section('portfolio', [sectionTitle(c, 'Selected work. Lasting impressions.', 'Wybrane prace. Trwałe wrażenia.', copy(c, 'PORTFOLIO', 'PORTFOLIO')), variant === 'editorial' ? stack([workCard(works[0], 0), grid(works.slice(1).map((w, i) => workCard(w, i + 1)), 2)], 40) : grid(works.map((w, i) => workCard(w, i)))]);
}
export function services(c: SectionContent, variant: 'cards' | 'rows' = 'cards'): NodeSpec {
  const items = [{ title: copy(c, 'Strategy & Direction', 'Strategia i kierunek'), text: copy(c, 'Clarity before creativity. We define the path that leads to meaningful results.', 'Jasność przed kreatywnością. Wyznaczamy ścieżkę prowadzącą do wartościowych rezultatów.'), icon: 'orbit' }, { title: copy(c, 'Design & Identity', 'Design i identyfikacja'), text: copy(c, 'Distinctive visual systems that express who you are and connect with your audience.', 'Wyróżniające się systemy wizualne, które wyrażają Ciebie i łączą się z odbiorcami.'), icon: 'sparkles' }, { title: copy(c, 'Build & Launch', 'Budowa i start'), text: copy(c, 'From first prototype to final launch, we craft experiences that work beautifully.', 'Od pierwszego prototypu po finalny start tworzymy doświadczenia, które działają pięknie.'), icon: 'code' }];
  return section('services', [sectionTitle(c, 'What we do best.', 'To, co robimy najlepiej.', copy(c, 'OUR SERVICES', 'NASZE USŁUGI')), variant === 'rows' ? stack(items.map((s, i) => row([heading(`0${i + 1}`, 2, { fontSize: 32, color: 'var(--sb-primary)' }), stack([heading(s.title, 3, { fontSize: 28 }), paragraph(s.text)], 8), icon(s.icon, 32)], { padding: '32px 0', borderTop: '1px solid var(--sb-border)', justifyContent: 'space-between' })), 0) : grid(items.map(s => card([icon(s.icon), heading(s.title, 3, { fontSize: 24 }), paragraph(s.text), button(copy(c, 'Learn more', 'Dowiedz się więcej'), '#contact', 'ghost')])))]);
}
export function statistics(c: SectionContent, cards = false): NodeSpec {
  const stats = [{ value: '250+', label: copy(c, 'Projects completed', 'Ukończonych projektów') }, { value: '98%', label: copy(c, 'Client satisfaction', 'Zadowolonych klientów') }, { value: '12', label: copy(c, 'Countries reached', 'Krajów zasięgu') }, { value: '10+', label: copy(c, 'Years of craft', 'Lat doświadczenia') }];
  return section('statistics', [grid(stats.map(s => cards ? card([node('stat', s)], { textAlign: 'center' }) : node('stat', s, { textAlign: 'center' })), 4)], { padding: '72px 32px', borderTop: '1px solid var(--sb-border)', borderBottom: '1px solid var(--sb-border)' });
}
export function timeline(c: SectionContent, horizontal = false): NodeSpec {
  const steps = [{ year: '2020', title: copy(c, 'The first idea', 'Pierwszy pomysł'), text: copy(c, 'A small team with a big vision.', 'Mały zespół z wielką wizją.') }, { year: '2022', title: copy(c, 'Finding our voice', 'Odnalezienie własnego głosu'), text: copy(c, 'Our first landmark projects.', 'Nasze pierwsze przełomowe projekty.') }, { year: '2024', title: copy(c, 'Growing together', 'Wspólny rozwój'), text: copy(c, 'New people, new possibilities.', 'Nowi ludzie, nowe możliwości.') }, { year: '2026', title: copy(c, 'What comes next', 'Co dalej'), text: copy(c, 'The best is still ahead.', 'Najlepsze wciąż przed nami.') }];
  const items = steps.map(s => stack([heading(s.year, 3, { fontSize: 32, color: 'var(--sb-primary)' }), heading(s.title, 4, { fontSize: 20 }), paragraph(s.text, { fontSize: 15 })], 10, { borderLeft: horizontal ? 'none' : '2px solid var(--sb-border)', borderTop: horizontal ? '2px solid var(--sb-border)' : 'none', paddingLeft: horizontal ? 0 : 24, paddingTop: horizontal ? 24 : 0 }));
  return section('timeline', [sectionTitle(c, 'The journey so far.', 'Dotychczasowa podróż.', copy(c, 'OUR TIMELINE', 'NASZA OŚ CZASU')), horizontal ? grid(items, 4) : stack(items, 40, { maxWidth: 720 })]);
}
export function partners(c: SectionContent, boxed = false): NodeSpec {
  const names = ['ACME', 'NORTH', 'LUMEN', 'VERTEX', 'ORBIT'];
  return section('partners', [paragraph(copy(c, 'Trusted by teams who care about craft', 'Zaufali nam zespoły, którym zależy na jakości'), { textAlign: 'center', fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 36 }), row(names.map(n => boxed ? card([heading(n, 3, { fontSize: 22, letterSpacing: '0.1em' })], { padding: '24px 32px', textAlign: 'center' }) : heading(n, 3, { fontSize: 24, letterSpacing: '0.12em', opacity: 0.6 })), { justifyContent: 'space-between' })], { padding: '64px 32px' });
}
export function newsletter(c: SectionContent, inline = false): NodeSpec {
  const form = node('newsletterForm', { formName: 'Newsletter', buttonText: copy(c, 'Subscribe', 'Zapisz się') }, { maxWidth: 480, width: '100%' });
  return section('newsletter', [card([stack([eyebrow(copy(c, 'STAY IN THE LOOP', 'BĄDŹ NA BIEŻĄCO')), heading(copy(c, 'Good things, delivered.', 'Dobre rzeczy, prosto do Ciebie.'), 2, { fontSize: 36 }), paragraph(copy(c, 'Occasional notes on design, ideas and what we are building. No noise, just the good stuff.', 'Okazjonalne notatki o designie, pomysłach i tym, co budujemy. Bez szumu, tylko wartościowe treści.'))], 16), form], inline ? { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 48, alignItems: 'center', padding: 48 } : { display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center', textAlign: 'center', padding: 64 })]);
}
export function footer(c: SectionContent, variant: 'columns' | 'minimal' | 'big' = 'columns'): NodeSpec {
  const brand = c.brand || 'NOVA';
  const links = [{ label: copy(c, 'About', 'O nas'), href: '#about' }, { label: copy(c, 'Work', 'Prace'), href: '#portfolio' }, { label: copy(c, 'Contact', 'Kontakt'), href: '#contact' }];
  const bottom = row([paragraph(`© ${new Date().getFullYear()} ${brand}. ${copy(c, 'All rights reserved.', 'Wszelkie prawa zastrzeżone.')}`, { fontSize: 13 }), node('socialLinks', { links: [{ label: 'Instagram', href: 'https://instagram.com' }, { label: 'LinkedIn', href: 'https://linkedin.com' }] }, { fontSize: 13 })], { justifyContent: 'space-between', borderTop: '1px solid var(--sb-border)', paddingTop: 24 });
  if (variant === 'minimal') return section('footer', [row([node('logo', { text: brand }), ...links.map(l => node('link', { text: l.label, href: l.href }))], { justifyContent: 'space-between' }), bottom], { padding: '48px 32px' });
  if (variant === 'big') return section('footer', [heading(brand, 2, { fontSize: 120, letterSpacing: '-0.06em', lineHeight: 1 }), bottom], { padding: '64px 32px 40px' });
  return section('footer', [node('columns', {}, { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 48, marginBottom: 48 }, [stack([node('logo', { text: brand }), paragraph(copy(c, 'Thoughtful design for a world that never stands still.', 'Przemyślany design dla świata, który nigdy nie stoi w miejscu.'), { maxWidth: 320, fontSize: 15 })], 16), stack([heading(copy(c, 'Explore', 'Odkrywaj'), 4, { fontSize: 14 }), ...links.map(l => node('link', { text: l.label, href: l.href }, { fontSize: 15 }))], 14), stack([heading(copy(c, 'Get in touch', 'Kontakt'), 4, { fontSize: 14 }), node('link', { text: 'hello@example.com', href: 'mailto:hello@example.com' }, { fontSize: 15 }), paragraph(copy(c, 'Warsaw, Poland', 'Warszawa, Polska'), { fontSize: 15 })], 14)]), bottom], { padding: '64px 32px 32px' });
}
export function blog(c: SectionContent, featured = false): NodeSpec {
  const posts = [{ title: copy(c, 'The quiet power of good design', 'Cicha siła dobrego designu'), tag: copy(c, 'Design', 'Design'), src: c.image || PHOTO.interior, date: '08.11.2026' }, { title: copy(c, 'Building for what comes next', 'Budowanie dla przyszłości'), tag: copy(c, 'Strategy', 'Strategia'), src: PHOTO.architecture, date: '02.11.2026' }, { title: copy(c, 'Notes from the studio', 'Notatki ze studia'), tag: copy(c, 'Culture', 'Kultura'), src: PHOTO.studio, date: '28.10.2026' }];
  const postCard = (p: typeof posts[0]) => stack([image(p.src, p.title, { height: 240 }), row([node('badge', { text: p.tag }), paragraph(p.date, { fontSize: 13 })]), heading(p.title, 3, { fontSize: 24 }), node('link', { text: copy(c, 'Read article →', 'Czytaj artykuł →'), href: '#contact' }, { color: 'var(--sb-primary)' })], 14);
  return section('blog', [sectionTitle(c, 'Ideas worth sharing.', 'Pomysły warte dzielenia się.', copy(c, 'FROM THE JOURNAL', 'Z NASZEGO DZIENNIKA')), featured ? node('columns', {}, { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 40 }, [postCard(posts[0]), stack(posts.slice(1).map(postCard), 32)]) : grid(posts.map(postCard))]);
}
export function reviews(c: SectionContent, summary = false): NodeSpec {
  if (summary) return section('reviews', [card([row([heading('4.9', 2, { fontSize: 72 }), stack([node('rating', { value: 5 }), paragraph(copy(c, 'Based on 128 verified reviews', 'Na podstawie 128 zweryfikowanych opinii'), { fontSize: 15 })], 8)], { gap: 32 }), button(copy(c, 'Read reviews', 'Czytaj opinie'), '#testimonials', 'outline')], { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 })]);
  return testimonials(c, 'cards');
}
export function cta(c: SectionContent, split = false): NodeSpec {
  const content = stack([heading(copy(c, 'Ready to make something great?', 'Gotowy, by stworzyć coś wielkiego?'), 2, { fontSize: 48, maxWidth: 720 }), paragraph(copy(c, 'Your next big idea deserves a beautiful home. Let’s build it together.', 'Twój kolejny wielki pomysł zasługuje na piękne miejsce. Zbudujmy je razem.'), { fontSize: 18 }), button(copy(c, 'Let’s get started', 'Zaczynajmy'), '#contact')], 24, split ? {} : { alignItems: 'center', textAlign: 'center' });
  return section('cta', [card(split ? [row([content, image(c.image || PHOTO.studio, copy(c, 'Start creating', 'Zacznij tworzyć'), { width: 320, height: 240 })], { justifyContent: 'space-between' })] : [content], { padding: 72, background: 'linear-gradient(135deg, color-mix(in srgb, var(--sb-primary) 18%, var(--sb-surface)), var(--sb-surface))', border: '1px solid color-mix(in srgb, var(--sb-primary) 30%, transparent)' })]);
}
export function navbar(c: SectionContent, sticky = false): NodeSpec {
  const links = [{ label: copy(c, 'About', 'O nas'), href: '#about' }, { label: copy(c, 'Features', 'Funkcje'), href: '#features' }, { label: copy(c, 'Work', 'Prace'), href: '#portfolio' }, { label: copy(c, 'Contact', 'Kontakt'), href: '#contact' }];
  return node(sticky ? 'sticky' : 'wrapper', {}, sticky ? { position: 'sticky', top: 0, zIndex: 50 } : {}, [node('navbar', { brand: c.brand || 'NOVA', links }, { padding: '22px 32px', background: 'color-mix(in srgb, var(--sb-bg) 88%, transparent)', backdropFilter: 'blur(16px)' }, [node('logo', { text: c.brand || 'NOVA' }), ...links.map(l => node('link', { text: l.label, href: l.href }, { fontSize: 15 })), button(copy(c, 'Get started', 'Zaczynajmy'), '#contact')])], 'Navigation');
}
export function products(c: SectionContent, count = 3): NodeSpec {
  const items = [{ name: copy(c, 'Everyday Essential', 'Codzienny niezbędnik'), price: 89, src: PHOTO.product }, { name: copy(c, 'Studio Object', 'Obiekt studyjny'), price: 129, src: PHOTO.interior }, { name: copy(c, 'Modern Classic', 'Nowoczesny klasyk'), price: 149, src: PHOTO.fashion }, { name: copy(c, 'Limited Edition', 'Edycja limitowana'), price: 199, src: PHOTO.coffee }].slice(0, count);
  return section('products', [sectionTitle(c, 'Objects with intention.', 'Przedmioty z intencją.', copy(c, 'THE COLLECTION', 'KOLEKCJA')), node('productGrid', {}, { display: 'grid', gridTemplateColumns: `repeat(${Math.min(count, 3)}, minmax(0,1fr))`, gap: 24 }, items.map((p, i) => node('productCard', { ...p, currency: 'USD', productId: `product-${i + 1}` })))]);
}
const builders: { id: string; name: string; namePl: string; description: string; build: (c: SectionContent) => NodeSpec; tags: string[] }[] = [
  { id: 'hero-split', name: 'Hero · Split', namePl: 'Hero · Podział', description: 'Headline, copy, actions and a large visual.', build: c => hero(c, 'split'), tags: ['hero', 'intro'] },
  { id: 'hero-center', name: 'Hero · Centered', namePl: 'Hero · Wyśrodkowany', description: 'Centered statement with a wide image.', build: c => hero(c, 'center'), tags: ['hero'] },
  { id: 'hero-editorial', name: 'Hero · Editorial', namePl: 'Hero · Edytorialny', description: 'Oversized typography and cinematic image.', build: c => hero(c, 'editorial'), tags: ['hero', 'editorial'] },
  { id: 'hero-immersive', name: 'Hero · Immersive', namePl: 'Hero · Pełnoekranowy', description: 'Full-bleed background with overlay.', build: c => hero(c, 'immersive'), tags: ['hero', 'background'] },
  { id: 'hero-minimal', name: 'Hero · Minimal', namePl: 'Hero · Minimalny', description: 'Pure typography, maximum clarity.', build: c => hero(c, 'minimal'), tags: ['hero', 'minimal'] },
  { id: 'hero-product', name: 'Hero · Product', namePl: 'Hero · Produkt', description: 'Product-focused hero with price card.', build: c => hero(c, 'product'), tags: ['hero', 'shop'] },
  { id: 'features-cards', name: 'Features · Cards', namePl: 'Funkcje · Karty', description: 'Three icon cards with clear benefits.', build: c => features(c, 'cards'), tags: ['features'] },
  { id: 'features-split', name: 'Features · Split', namePl: 'Funkcje · Podział', description: 'Image beside a benefit checklist.', build: c => features(c, 'split'), tags: ['features'] },
  { id: 'features-bento', name: 'Features · Bento', namePl: 'Funkcje · Bento', description: 'Asymmetric bento grid with a stat.', build: c => features(c, 'bento'), tags: ['features', 'bento'] },
  { id: 'features-numbers', name: 'Features · Numbered', namePl: 'Funkcje · Numerowane', description: 'Editorial numbered rows.', build: c => features(c, 'numbers'), tags: ['features'] },
  { id: 'pricing-three', name: 'Pricing · Three plans', namePl: 'Cennik · Trzy plany', description: 'Highlighted middle plan.', build: c => pricing(c, 'three'), tags: ['pricing'] },
  { id: 'pricing-two', name: 'Pricing · Two plans', namePl: 'Cennik · Dwa plany', description: 'Simple two-column comparison.', build: c => pricing(c, 'two'), tags: ['pricing'] },
  { id: 'testimonials-cards', name: 'Testimonials · Cards', namePl: 'Opinie · Karty', description: 'Three quotes with avatars and ratings.', build: c => testimonials(c, 'cards'), tags: ['testimonials', 'reviews'] },
  { id: 'testimonials-feature', name: 'Testimonials · Feature', namePl: 'Opinie · Wyróżniona', description: 'One large, confident quote.', build: c => testimonials(c, 'feature'), tags: ['testimonials'] },
  { id: 'testimonials-slider', name: 'Testimonials · Slider', namePl: 'Opinie · Slider', description: 'Auto-advancing quote carousel.', build: c => testimonials(c, 'slider'), tags: ['testimonials', 'slider'] },
  { id: 'faq-stack', name: 'FAQ · Stack', namePl: 'FAQ · Lista', description: 'Accessible accordion list.', build: c => faq(c, 'stack'), tags: ['faq'] },
  { id: 'faq-split', name: 'FAQ · Split', namePl: 'FAQ · Podział', description: 'Heading beside accordion answers.', build: c => faq(c, 'split'), tags: ['faq'] },
  { id: 'team-three', name: 'Team · Three', namePl: 'Zespół · Trzy osoby', description: 'Three portrait cards.', build: c => team(c, 3), tags: ['team'] },
  { id: 'team-four', name: 'Team · Four', namePl: 'Zespół · Cztery osoby', description: 'Four-person grid.', build: c => team(c, 4), tags: ['team'] },
  { id: 'about-split', name: 'About · Split', namePl: 'O nas · Podział', description: 'Story, image and key numbers.', build: c => about(c, 'split'), tags: ['about'] },
  { id: 'about-story', name: 'About · Story', namePl: 'O nas · Historia', description: 'Editorial story with wide photo.', build: c => about(c, 'story'), tags: ['about'] },
  { id: 'contact-split', name: 'Contact · Split', namePl: 'Kontakt · Podział', description: 'Contact details beside a working form.', build: c => contact(c, 'split'), tags: ['contact', 'form'] },
  { id: 'contact-center', name: 'Contact · Centered', namePl: 'Kontakt · Wyśrodkowany', description: 'Focused single-column contact.', build: c => contact(c, 'center'), tags: ['contact', 'form'] },
  { id: 'portfolio-grid', name: 'Portfolio · Grid', namePl: 'Portfolio · Siatka', description: 'Three project cards.', build: c => portfolio(c, 'grid'), tags: ['portfolio'] },
  { id: 'portfolio-editorial', name: 'Portfolio · Editorial', namePl: 'Portfolio · Edytorialne', description: 'Featured project plus two smaller works.', build: c => portfolio(c, 'editorial'), tags: ['portfolio'] },
  { id: 'services-cards', name: 'Services · Cards', namePl: 'Usługi · Karty', description: 'Three service cards with links.', build: c => services(c, 'cards'), tags: ['services'] },
  { id: 'services-rows', name: 'Services · Rows', namePl: 'Usługi · Wiersze', description: 'Numbered editorial service list.', build: c => services(c, 'rows'), tags: ['services'] },
  { id: 'statistics-row', name: 'Statistics · Row', namePl: 'Statystyki · Wiersz', description: 'Four key numbers in a row.', build: c => statistics(c, false), tags: ['statistics', 'stats'] },
  { id: 'statistics-cards', name: 'Statistics · Cards', namePl: 'Statystyki · Karty', description: 'Four stat cards.', build: c => statistics(c, true), tags: ['statistics'] },
  { id: 'timeline-vertical', name: 'Timeline · Vertical', namePl: 'Oś czasu · Pionowa', description: 'Milestones on a vertical line.', build: c => timeline(c, false), tags: ['timeline'] },
  { id: 'timeline-horizontal', name: 'Timeline · Horizontal', namePl: 'Oś czasu · Pozioma', description: 'Four milestones across columns.', build: c => timeline(c, true), tags: ['timeline'] },
  { id: 'partners-row', name: 'Partners · Row', namePl: 'Partnerzy · Wiersz', description: 'Understated partner wordmarks.', build: c => partners(c, false), tags: ['partners', 'logos'] },
  { id: 'partners-boxed', name: 'Partners · Boxed', namePl: 'Partnerzy · Karty', description: 'Partner logos in cards.', build: c => partners(c, true), tags: ['partners'] },
  { id: 'newsletter-center', name: 'Newsletter · Centered', namePl: 'Newsletter · Wyśrodkowany', description: 'Centered signup card.', build: c => newsletter(c, false), tags: ['newsletter', 'form'] },
  { id: 'newsletter-inline', name: 'Newsletter · Inline', namePl: 'Newsletter · W linii', description: 'Copy beside a compact signup form.', build: c => newsletter(c, true), tags: ['newsletter'] },
  { id: 'footer-columns', name: 'Footer · Columns', namePl: 'Stopka · Kolumny', description: 'Brand, links and contact columns.', build: c => footer(c, 'columns'), tags: ['footer'] },
  { id: 'footer-minimal', name: 'Footer · Minimal', namePl: 'Stopka · Minimalna', description: 'Single-row footer.', build: c => footer(c, 'minimal'), tags: ['footer'] },
  { id: 'footer-big', name: 'Footer · Big brand', namePl: 'Stopka · Wielka marka', description: 'Oversized brand statement.', build: c => footer(c, 'big'), tags: ['footer'] },
  { id: 'blog-grid', name: 'Blog · Grid', namePl: 'Blog · Siatka', description: 'Three article cards.', build: c => blog(c, false), tags: ['blog', 'news'] },
  { id: 'blog-featured', name: 'Blog · Featured', namePl: 'Blog · Wyróżniony', description: 'Lead story plus two smaller posts.', build: c => blog(c, true), tags: ['blog'] },
  { id: 'reviews-cards', name: 'Reviews · Cards', namePl: 'Recenzje · Karty', description: 'Customer review cards.', build: c => reviews(c, false), tags: ['reviews'] },
  { id: 'reviews-summary', name: 'Reviews · Summary', namePl: 'Recenzje · Podsumowanie', description: 'Aggregate rating with call to action.', build: c => reviews(c, true), tags: ['reviews'] },
  { id: 'cta-center', name: 'CTA · Centered', namePl: 'CTA · Wyśrodkowane', description: 'Gradient call-to-action card.', build: c => cta(c, false), tags: ['cta'] },
  { id: 'cta-split', name: 'CTA · Split', namePl: 'CTA · Podział', description: 'Call to action beside an image.', build: c => cta(c, true), tags: ['cta'] },
  { id: 'navbar-standard', name: 'Navbar · Standard', namePl: 'Nawigacja · Standardowa', description: 'Brand, links and action.', build: c => navbar(c, false), tags: ['navbar', 'header'] },
  { id: 'navbar-sticky', name: 'Navbar · Sticky', namePl: 'Nawigacja · Przyklejona', description: 'Glass navigation that stays on top.', build: c => navbar(c, true), tags: ['navbar'] },
  { id: 'products-grid', name: 'Products · Grid', namePl: 'Produkty · Siatka', description: 'Three product cards with cart buttons.', build: c => products(c, 3), tags: ['shop', 'products'] },
  { id: 'products-four', name: 'Products · Four', namePl: 'Produkty · Cztery', description: 'Four-product collection.', build: c => products(c, 4), tags: ['shop'] },
];
export const SECTION_ITEMS: LibraryItem[] = builders.map(b => ({ id: b.id, name: b.name, namePl: b.namePl, category: 'sections', type: 'section', description: b.description, tags: b.tags, spec: b.build({ language: 'en' }) }));
export const SECTION_BUILDERS = builders;
export function buildSection(id: string, content: SectionContent): NodeSpec | undefined { return builders.find(b => b.id === id)?.build(content); }
