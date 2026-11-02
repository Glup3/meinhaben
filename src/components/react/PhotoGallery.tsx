import styles from "./PhotoGallery.module.css";
import { useRef, useState } from "react";
import Icon from "./Icon";

type Photo = { src: string; alt: string };
export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  function select(step: number) {
    setIndex((current) => (current + step + photos.length) % photos.length);
  }
  if (!photos.length) return null;
  return (
    <>
      <section className={styles.gallery} aria-label="Artikelfotos">
        <button
          className={styles.openGallery}
          onClick={() => dialog.current?.showModal()}
          id="open-gallery"
          aria-haspopup="dialog"
          aria-controls="lightbox"
          aria-label="Artikelfoto vergrößern"
        >
          <img
            id="gallery-image"
            src={photos[index].src}
            alt={photos[index].alt}
            width="1200"
            height="1200"
            fetchPriority="high"
          />
          <span className={styles.position} id="gallery-position">
            {index + 1} / {photos.length}
          </span>
          <span className={styles.expand}>
            <Icon name="expand" size={20} />
          </span>
        </button>
        <div
          className={styles.thumbnails}
          role="group"
          aria-label="Foto auswählen"
        >
          {photos.map((photo, photoIndex) => (
            <button
              className={styles.thumbnail}
              key={photoIndex}
              onClick={() => setIndex(photoIndex)}
              data-photo-index={photoIndex}
              data-src={photo.src}
              data-alt={photo.alt}
              aria-label={`Foto ${photoIndex + 1}: ${photo.alt}`}
              aria-pressed={index === photoIndex}
            >
              <img src={photo.src} alt="" width="76" height="55" />
            </button>
          ))}
        </div>
        <p className={styles.hint}>
          <span id="photo-count">
            Foto {index + 1} von {photos.length}
          </span>{" "}
          · Klick aufs Bild zum Vergrößern
        </p>
      </section>
      <dialog
        ref={dialog}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            event.currentTarget.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            select(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        id="lightbox"
        className={styles.lightbox}
        aria-label="Artikelfoto in Großansicht"
      >
        <button
          className={styles.closeDialog}
          onClick={() => dialog.current?.close()}
          data-close-dialog
          aria-label="Großansicht schließen"
        >
          <Icon name="close" size={18} />
        </button>
        <img
          id="lightbox-image"
          className={styles.lightboxImage}
          src={photos[index].src}
          alt={photos[index].alt}
          width="1200"
          height="1200"
        />
        <div className={styles.lightboxFooter}>
          <span id="lightbox-count" aria-live="polite">
            Foto {index + 1} von {photos.length}
          </span>
          {photos.length > 1 && (
            <div className={styles.photoControls}>
              <button
                onClick={() => select(-1)}
                id="previous-photo"
                aria-label="Vorheriges Foto"
              >
                <Icon name="left" size={17} />
              </button>
              <button
                onClick={() => select(1)}
                id="next-photo"
                aria-label="Nächstes Foto"
              >
                <Icon name="right" size={17} />
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
