import styles from "./FeaturedCarousel.module.css";
import { useId, useState } from "react";
import Icon from "./Icon";

const slides = [
  {
    label: "Gute Dinge dürfen weiterziehen",
    title: "Heute noch meins.\nMorgen dein Lieblingsstück.",
    cta: "Jetzt stöbern",
    href: "/anzeigen/",
    theme: "blue",
    tag: "ZWEITE RUNDE. ERSTE WAHL.",
  },
  {
    label: "Unbezahlbar günstig",
    title: "Die besten Dinge\nkosten manchmal nichts.",
    cta: "Zu verschenken entdecken",
    href: "/anzeigen/",
    theme: "purple",
    tag: "0 EURO. VIEL FREUDE.",
  },
  {
    label: "Exklusiv für Menschen mit Humor",
    title: "Traumimmobilie?\nFast. Ein Sessel.",
    cta: "Immobilien entdecken",
    href: "/immobilien/",
    theme: "orange",
    tag: "LAGE, LAGE, SITZLAGE.",
  },
];

export default function FeaturedCarousel({
  photos = [],
}: {
  photos?: string[];
}) {
  const id = useId();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  function show(step: number) {
    setDirection(step);
    setCurrent((index) => (index + step + slides.length) % slides.length);
  }
  return (
    <section
      className={styles.carousel}
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
      <div className={styles.viewport} id={id}>
        {slides.map((slide, index) => (
          <article
            className={styles.slide}
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
            <div className={styles.artwork} aria-hidden="true">
              {photos.slice(0, 4).map((photo, i) => (
                <img
                  className={styles.photo}
                  key={photo}
                  data-object={i}
                  src={photo}
                  alt=""
                  width="220"
                  height="220"
                  loading="eager"
                />
              ))}
              <span className={styles.sticker}>{slide.tag}</span>
            </div>
            <div className={styles.copy}>
              <p data-ui="showcase-kicker" className={styles.kicker}>
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
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.previous}
            aria-label="Vorherige Empfehlung"
            aria-controls={id}
            onClick={() => show(-1)}
            data-prev
          >
            <Icon name="left" size={18} />
          </button>
          <p
            className={styles.status}
            aria-live="polite"
            aria-atomic="true"
            data-status
          >
            {current + 1} / {slides.length}
          </p>
          <button
            type="button"
            className={styles.next}
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
