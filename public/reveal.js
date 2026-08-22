const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealElements=[...document.querySelectorAll("[data-reveal], [data-hero-kicker], [data-hero-line], [data-hero-copy], [data-hero-action], [data-rig-panel]")];
const staggerChildren=[...document.querySelectorAll("[data-stagger]")].flatMap(group=>[...group.children]);
const paths=[...document.querySelectorAll("[data-draw-path]")];
const show=element=>element.classList.add("is-visible");
if(reducedMotion||!("IntersectionObserver" in window)){[...revealElements,...staggerChildren,...paths].forEach(show)}
else{document.documentElement.classList.add("motion-ready");staggerChildren.forEach((element,index)=>element.style.setProperty("--motion-delay",String(index%6*70)+"ms"));paths.forEach(path=>{const length=path.getTotalLength();path.style.strokeDasharray=String(length);path.style.strokeDashoffset=String(length)});const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;show(entry.target);observer.unobserve(entry.target)})},{rootMargin:"0px 0px -8%",threshold:.08});[...revealElements,...staggerChildren,...paths].forEach(element=>observer.observe(element))}
