import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import FeaturedCarousel from "./FeaturedCarousel";
import PhotoGallery from "./PhotoGallery";

const window = new Window();
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
let root: Root;
afterEach(async () => {
  await act(async () => { root?.unmount(); });
  document.body.innerHTML = "";
});
async function mount(component: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(component); });
  return container;
}
async function click(container: Element, selector: string) {
  const button = container.querySelector<HTMLButtonElement>(selector);
  assert.ok(button, selector);
  await act(async () => { button.click(); });
}

test("carousel wraps in both directions and exposes only the active slide", async () => {
  const container = await mount(<FeaturedCarousel />);
  await click(container, "[data-prev]");
  assert.equal(container.querySelector("[data-status]")?.textContent, "3 / 3");
  assert.equal(container.querySelectorAll('[aria-hidden="false"]').length, 1);
  assert.equal(container.querySelectorAll("article[inert]").length, 2);
  await click(container, "[data-next]");
  assert.equal(container.querySelector("[data-status]")?.textContent, "1 / 3");
});

test("gallery keeps thumbnails, images and counts synchronized and wraps", async () => {
  const photos = [
    { src: "/one.jpg", alt: "First" },
    { src: "/two.jpg", alt: "Second" },
  ];
  const container = await mount(<PhotoGallery photos={photos} />);
  await click(container, '[data-photo-index="1"]');
  for (const selector of ["#gallery-image", "#lightbox-image"]) {
    assert.equal(
      container.querySelector(selector)?.getAttribute("src"),
      "/two.jpg",
    );
    assert.equal(
      container.querySelector(selector)?.getAttribute("alt"),
      "Second",
    );
  }
  assert.equal(
    container.querySelector("#lightbox-count")?.textContent,
    "Foto 2 von 2",
  );
  assert.equal(
    container
      .querySelector('[data-photo-index="1"]')
      ?.getAttribute("aria-pressed"),
    "true",
  );
  await click(container, "#next-photo");
  assert.equal(
    container.querySelector("#photo-count")?.textContent,
    "Foto 1 von 2",
  );
  await click(container, "#previous-photo");
  assert.equal(
    container.querySelector("#photo-count")?.textContent,
    "Foto 2 von 2",
  );
});
