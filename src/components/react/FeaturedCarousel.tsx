import { useId, useState } from "react";
import Icon from "./Icon";

const slides = [
  {
    label: "Gute Dinge dürfen weiterziehen",
    title: "Heute noch meins.\nMorgen dein Lieblingsstück.",
    cta: "Jetzt stöbern",
    href: "/anzeigen/",
    photos: ["sessel.jpg", "lampe.jpg", "kopfhoerer.jpg", "pflanze.jpg"],
    theme: "blue",
    tag: "ZWEITE RUNDE. ERSTE WAHL.",
  },
  {
    label: "Unbezahlbar günstig",
    title: "Die besten Dinge\nkosten manchmal nichts.",
    cta: "Zu verschenken entdecken",
    href: "/anzeigen/?gratis=1",
    photos: ["buecher.jpg", "pflanze.jpg", "kaffee.jpg", "sessel.jpg"],
    theme: "purple",
    tag: "0 EURO. VIEL FREUDE.",
  },
  {
    label: "Exklusiv für Menschen mit Humor",
    title: "Traumimmobilie?\nFast. Ein Sessel.",
    cta: "Immobilien entdecken",
    href: "/immobilien/",
    photos: ["sessel.jpg", "lampe.jpg", "pflanze.jpg", "buecher.jpg"],
    theme: "orange",
    tag: "LAGE, LAGE, SITZLAGE.",
  },
];

export default function FeaturedCarousel() {
  const id = useId();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  function show(step: number) {
    setDirection(step);
    setCurrent((index) => (index + step + slides.length) % slides.length);
  }
  return (
    <section
      className="mt-3 mx-0 mb-2 max-[760px]:mt-2.5"
      aria-label="Meinhaben Empfehlungen"
      aria-roledescription="Karussell"
      data-carousel
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          show(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div
        className="relative overflow-hidden rounded-[16px] grid isolate"
        id={id}
      >
        {slides.map((slide, index) => (
          <article
            className="grid bg-[#093d96] text-white min-w-0 invisible [grid-area:1_/_1] grid-cols-[42%_58%] min-h-65 [&[data-theme=purple]]:bg-[#542695] [&[data-theme=orange]]:bg-[#8b321b] max-[760px]:grid-cols-[1fr] max-[760px]:min-h-0 [&[data-active=true]]:visible"
            key={slide.theme}
            data-theme={slide.theme}
            data-active={index === current}
            aria-hidden={index !== current}
            inert={index !== current}
            aria-roledescription="Folie"
            aria-label={`${index + 1} von ${slides.length}`}
            data-slide
            style={
              index === current && direction !== 0
                ? {
                    animation: `carousel-enter-${direction > 0 ? "next" : "previous"} 400ms cubic-bezier(.22,.61,.36,1)`,
                  }
                : undefined
            }
          >
            <div
              className="relative bg-[#16acf0] overflow-hidden min-h-65 [[data-theme=purple]_&]:bg-[#d8c3ff] [[data-theme=orange]_&]:bg-[#ffbd78] max-[760px]:min-h-50 max-[760px]:hidden"
              aria-hidden="true"
            >
              {slide.photos.map((photo, i) => (
                <img
                  className="absolute w-[39%] h-[47%] object-cover rounded-[12px] [box-shadow:0_12px_24px_#003e8926] [&[data-object='0']]:left-[9%] [&[data-object='0']]:top-[-7%] [&[data-object='0']]:[transform:rotate(-14deg)] [&[data-object='1']]:right-[4%] [&[data-object='1']]:top-[-1%] [&[data-object='1']]:[transform:rotate(16deg)] [&[data-object='2']]:left-[5%] [&[data-object='2']]:bottom-[-5%] [&[data-object='2']]:[transform:rotate(10deg)] [&[data-object='3']]:right-[8%] [&[data-object='3']]:bottom-[-8%] [&[data-object='3']]:[transform:rotate(-12deg)] max-[760px]:w-[32%] max-[760px]:h-[70%] max-[760px]:[&[data-object='1']]:right-[14%] max-[760px]:[&[data-object='3']]:right-[24%]"
                  key={photo}
                  data-object={i}
                  src={`/images/${photo}`}
                  alt=""
                  width="220"
                  height="220"
                  loading="eager"
                />
              ))}
              <span className="absolute right-[3%] bottom-[19%] rounded-[40px] text-white bg-[#7b47c6] font-extrabold [transform:rotate(-10deg)] [box-shadow:0_5px_0_#0001] py-2 px-3 text-[10px] [[data-theme=purple]_&]:bg-[#093d96] max-[760px]:text-[10px] max-[760px]:bottom-[20%]">
                {slide.tag}
              </span>
            </div>
            <div className="p-[clamp(32px,_4vw,_56px)] flex flex-col justify-center items-start min-h-0 pt-6 pr-16 pb-6 pl-8 [&_h2]:max-w-[20ch] [&_h2]:font-extrabold [&_h2]:leading-[1.16] [&_h2]:whitespace-pre-line [&_h2]:tracking-[-.8px] [&_h2]:text-[clamp(26px,_2.6vw,_36px)] [&_>_a]:inline-flex [&_>_a]:gap-2.5 [&_>_a]:items-center [&_>_a]:text-[15px] [&_>_a]:font-bold [&_>_a]:mt-4 [&_>_a:hover]:underline [&_>_small]:text-[9px] [&_>_small]:opacity-80 [&_>_small]:mt-3 max-[760px]:min-h-49 max-[760px]:py-5 max-[760px]:px-15 max-[760px]:[&_h2]:text-[clamp(23px,_5.6vw,_30px)] max-[760px]:[&_>_a]:mt-3 max-[760px]:[&_>_a]:text-[14px] max-[760px]:[&_>_small]:hidden">
              <p
                data-ui="showcase-kicker"
                className="font-bold uppercase tracking-[1.3px] leading-[1.7] mb-2.5 text-[10px] max-[760px]:mb-1.5 max-[760px]:tracking-[.6px]"
              >
                {slide.label}
              </p>
              <h2>{slide.title}</h2>
              <a href={slide.href}>
                {slide.cta}
                <Icon name="arrow" size={24} />
              </a>
              <small>Gute Dinge. Kleine Geschichten. Große Gefühle.</small>
            </div>
          </article>
        ))}
        <div className="absolute inset-0 z-2 pointer-events-none">
          <button
            type="button"
            className="grid place-items-center left-2 absolute top-[50%] pointer-events-auto w-11 h-11 border border-line rounded-full text-navy bg-white [transform:translateY(-50%)] [&:hover]:bg-[#e8f7ff]"
            aria-label="Vorherige Empfehlung"
            aria-controls={id}
            onClick={() => show(-1)}
            data-prev
          >
            <Icon name="left" size={18} />
          </button>
          <p
            className="min-w-9 text-center text-[12px] text-navy sr-only"
            aria-live="polite"
            aria-atomic="true"
            data-status
          >
            {current + 1} / {slides.length}
          </p>
          <button
            type="button"
            className="grid place-items-center right-2 absolute top-[50%] pointer-events-auto w-11 h-11 border border-line rounded-full text-navy bg-white [transform:translateY(-50%)] [&:hover]:bg-[#e8f7ff]"
            aria-label="Nächste Empfehlung"
            aria-controls={id}
            onClick={() => show(1)}
            data-next
          >
            <Icon name="right" size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
