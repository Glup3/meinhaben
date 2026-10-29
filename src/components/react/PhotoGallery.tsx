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
      <section className="min-w-0 [grid-column:1]" aria-label="Artikelfotos">
        <button
          className="block w-full p-0 border-0 relative bg-[#f3f5fa] aspect-[4/3] cursor-zoom-in [&_>_img]:w-full [&_>_img]:h-full [&_>_img]:object-contain max-[760px]:aspect-[4/3]"
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
          <span
            className="absolute top-0 left-0 py-0.5 px-2 text-[12px] bg-[#8e9bb5aa] text-white"
            id="gallery-position"
          >
            {index + 1} / {photos.length}
          </span>
          <span className="grid place-items-center absolute top-2.5 right-2.5 w-7.5 h-7.5 bg-[#fffe] rounded-ui">
            <Icon name="expand" size={20} />
          </span>
        </button>
        <div
          className="flex gap-2 mt-2 overflow-x-auto p-0.5"
          role="group"
          aria-label="Foto auswählen"
        >
          {photos.map((photo, photoIndex) => (
            <button
              className="flex-none border-2 border-transparent p-0 bg-panel [&[aria-pressed=true]]:border-brand [&_img]:w-19 [&_img]:h-13.75 [&_img]:object-cover"
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
        <p className="text-[11px] text-muted mt-2 max-[760px]:text-[10px]">
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
        className="fixed m-auto max-h-[calc(100dvh_-_40px)] overflow-auto border border-line rounded-ui bg-white text-ink [box-shadow:0_12px_50px_#0003] max-w-237.5 w-[calc(100%_-_32px)] p-3 [&::backdrop]:bg-[#17233b99] [&_h2]:text-[23px] [&_h2]:mb-3.5 [&_>_p]:text-[13px] [&_>_p]:leading-[1.7]"
        aria-label="Artikelfoto in Großansicht"
      >
        <button
          className="absolute top-2 right-2 w-9 h-9 grid place-items-center text-muted bg-panel rounded-ui"
          onClick={() => dialog.current?.close()}
          data-close-dialog
          aria-label="Großansicht schließen"
        >
          <Icon name="close" size={18} />
        </button>
        <img
          id="lightbox-image"
          className="w-full max-h-[75dvh] object-contain"
          src={photos[index].src}
          alt={photos[index].alt}
          width="1200"
          height="1200"
        />
        <div className="flex justify-between items-center pt-3 text-[12px] text-muted">
          <span id="lightbox-count" aria-live="polite">
            Foto {index + 1} von {photos.length}
          </span>
          {photos.length > 1 && (
            <div className="flex gap-1.5 [&_button]:w-10 [&_button]:h-10 [&_button]:grid [&_button]:place-items-center [&_button]:bg-panel">
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
