const MAX_PHOTOS = 12;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "className") node.className = value;
    else if (name.startsWith("on")) node.addEventListener(name.slice(2), value);
    else node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

function slugify(title) {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150).replace(/-$/, "");
}

function field(label, input, hint) {
  return element("label", { className: "le-field" }, element("span", {}, label), input,
    ...(hint ? [element("small", {}, hint)] : []));
}

function select(name, choices) {
  return element("select", { name, required: "" }, ...choices.map(([value, label]) =>
    element("option", { value }, label)));
}

function input(name, attributes = {}) {
  return element("input", { name, type: "text", ...attributes });
}

export function createListingForm(pb) {
  let photos = [];
  let saving = false;
  let disposed = false;
  let slugEdited = false;
  let saved = false;
  const title = input("title", { required: "", maxlength: "200", autocomplete: "off" });
  const slug = input("slug", { required: "", maxlength: "150", pattern: "[a-z0-9]+(-[a-z0-9]+)*" });
  const description = element("textarea", { name: "description", required: "", maxlength: "20000", rows: "6" });
  const category = select("category", [["", "Loading categories…"]]);
  category.disabled = true;
  const price = input("price", { required: "", pattern: "[0-9]+([.,][0-9]{1,2})?", maxlength: "12", placeholder: "0.00", inputmode: "decimal" });
  const condition = select("condition", [["very_good", "Very good"], ["new", "New"], ["like_new", "Like new"], ["good", "Good"], ["fair", "Fair"]]);
  const status = select("status", [["available", "Available"], ["reserved", "Reserved"], ["sold", "Sold"]]);
  const message = element("div", { className: "le-message", role: "status", "aria-live": "polite", tabindex: "-1", hidden: "" });
  const photoList = element("div", { className: "le-photos" });
  const photoCount = element("p", { className: "le-muted" }, "No photos selected.");
  const picker = input("images", { type: "file", accept: IMAGE_TYPES.join(","), multiple: "" });
  const detailsList = element("div", { className: "le-details" });
  const draftButton = element("button", { type: "submit", name: "action", value: "draft", className: "le-button" }, "Save draft");
  const publishButton = element("button", { type: "submit", name: "action", value: "publish", className: "le-button le-primary" }, "Create & publish");
  const controls = element("fieldset", { className: "le-controls" });
  const form = element("form", { className: "le-form" }, controls);
  const page = element("div", { className: "page le-page" },
    element("div", { className: "le-heading" }, element("h1", {}, "New listing"),
      element("p", {}, "Listing details and photos, all in one place.")), message, form);

  function showMessage(text, kind = "error") {
    message.replaceChildren(element("p", {}, text));
    message.dataset.kind = kind;
    message.hidden = false;
    message.focus();
  }

  function releasePhotos() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    photos = [];
  }

  function renderPhotos() {
    photoList.replaceChildren(...photos.map((photo, index) => {
      const alt = input("photo-alt", { value: photo.alt, required: "", maxlength: "500" });
      alt.addEventListener("input", () => { photo.alt = alt.value; });
      const earlier = element("button", { type: "button", className: "le-button", "aria-label": `Move photo ${index + 1} earlier` }, "←");
      const later = element("button", { type: "button", className: "le-button", "aria-label": `Move photo ${index + 1} later` }, "→");
      earlier.disabled = index === 0;
      later.disabled = index === photos.length - 1;
      function move(offset) {
        const destination = index + offset;
        [photos[index], photos[destination]] = [photos[destination], photos[index]];
        renderPhotos();
        photoList.querySelectorAll(".le-photo")[destination].querySelector('button:not(:disabled)')?.focus();
      }
      earlier.addEventListener("click", () => move(-1));
      later.addEventListener("click", () => move(1));
      const remove = element("button", { type: "button", className: "le-button", "aria-label": `Remove ${photo.file.name}` }, "Remove");
      remove.addEventListener("click", () => {
        URL.revokeObjectURL(photo.url);
        photos.splice(index, 1);
        renderPhotos();
        picker.focus();
      });
      return element("div", { className: "le-photo" },
        element("img", { src: photo.url, alt: photo.alt }),
        element("strong", {}, index === 0 ? "1 · Cover photo" : `${index + 1} · Photo`),
        element("small", { className: "le-filename" }, photo.file.name),
        field("Photo description", alt), element("div", { className: "le-photo-actions" }, earlier, later, remove));
    }));
    photoCount.textContent = photos.length ? `${photos.length} / ${MAX_PHOTOS} photos · The first photo is the cover.` : "No photos selected.";
  }

  picker.addEventListener("change", () => {
    const selected = Array.from(picker.files || []);
    picker.value = "";
    if (photos.length + selected.length > MAX_PHOTOS) {
      showMessage(`Choose up to ${MAX_PHOTOS} photos in total.`);
      return;
    }
    const invalid = selected.find((file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES || !file.size);
    if (invalid) {
      showMessage(`${invalid.name}: choose a JPEG, PNG or WebP image up to 10 MB.`);
      return;
    }
    selected.forEach((file) => photos.push({ file, url: URL.createObjectURL(file), alt: (title.value.trim() || file.name.replace(/\.[^.]+$/, "")).slice(0, 500) }));
    renderPhotos();
  });

  title.addEventListener("input", () => { if (!slugEdited) slug.value = slugify(title.value); });
  slug.addEventListener("input", () => { slugEdited = Boolean(slug.value); });

  const addDetail = element("button", { type: "button", className: "le-button" }, "+ Add detail");
  addDetail.addEventListener("click", () => {
    const label = input("detail-label", { required: "", placeholder: "e.g. Brand", "aria-label": "Detail name" });
    const value = input("detail-value", { required: "", placeholder: "e.g. IKEA", "aria-label": "Detail value" });
    const remove = element("button", { type: "button", className: "le-button", "aria-label": "Remove detail" }, "Remove");
    const row = element("div", { className: "le-detail" }, label, value, remove);
    remove.addEventListener("click", () => { row.remove(); addDetail.focus(); });
    detailsList.append(row);
    label.focus();
  });

  function section(heading, ...children) {
    return element("section", { className: "le-section" }, element("h2", {}, heading), ...children);
  }

  controls.append(
    section("1. Listing", field("Title", title), field("Description", description),
      element("div", { className: "le-grid" }, field("Category", category), field("Price (€)", price, "Enter 0 for a free item."), field("Condition", condition), field("Availability", status)),
      field("URL slug", slug, "Generated from the title. Must be unique; use lowercase letters, numbers and hyphens.")),
    section("2. Photos", field("Choose photos", picker, "Select multiple files at once, or add more later. Up to 12 photos, 10 MB each. JPEG, PNG or WebP."), photoCount, photoList),
    section("3. Extra details (optional)", detailsList, addDetail),
    element("div", { className: "le-footer" },
      element("p", { className: "le-muted" }, "Publishing requires at least one photo. Website changes appear after the website is rebuilt."),
      element("div", { className: "le-actions" }, draftButton, publishButton)),
  );

  async function loadCategories() {
    try {
      const records = await pb.collection("categories").getFullList({ sort: "sort_order,name", requestKey: null });
      if (disposed) return;
      category.replaceChildren(element("option", { value: "" }, "Choose a category"),
        ...records.map((record) => element("option", { value: record.id }, record.name)));
      category.disabled = false;
      if (!records.length) showMessage("Create a category in Collections first, then reload this page.");
    } catch (_) {
      if (disposed) return;
      showMessage("Could not load categories. Check your connection and try again.");
      const retry = element("button", { type: "button", className: "le-button" }, "Retry loading categories");
      retry.addEventListener("click", () => { message.hidden = true; loadCategories(); });
      message.append(retry);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving || saved || !form.reportValidity()) return;
    if (!category.value) { showMessage("Choose a category before saving."); return; }
    const publish = event.submitter?.value === "publish";
    if (publish && photos.length === 0) { showMessage("Add at least one photo before publishing, or save a draft."); return; }
    const cents = Math.round(Number(price.value.replace(",", ".")) * 100);
    if (!Number.isSafeInteger(cents) || cents < 0) { showMessage("Enter a valid price."); return; }
    const body = new FormData();
    body.set("listing", JSON.stringify({
      title: title.value.trim(), slug: slug.value.trim(), description: description.value.trim(),
      category: category.value, price_cents: cents, condition: condition.value, status: status.value,
      details: Array.from(detailsList.children).map((row) => ({
        label: row.querySelector('[name="detail-label"]').value.trim(),
        value: row.querySelector('[name="detail-value"]').value.trim(),
      })),
      publish, photos: photos.map((photo) => ({ alt: photo.alt.trim() })),
    }));
    photos.forEach((photo) => body.append("images", photo.file, photo.file.name));
    saving = true;
    controls.disabled = true;
    message.hidden = true;
    const submitButton = publish ? publishButton : draftButton;
    const originalLabel = submitButton.textContent;
    submitButton.textContent = "Uploading & saving…";
    form.setAttribute("aria-busy", "true");
    try {
      const result = await pb.send("/api/marketplace/listings", { method: "POST", body, requestKey: null });
      saved = true;
      releasePhotos();
      if (disposed) return;
      showMessage(`${result.published ? "Published" : "Draft saved"}: ${title.value} · ${result.image_count} photo${result.image_count === 1 ? "" : "s"}. Rebuild the website when you want the change to appear publicly.`, "success");
      const collection = appCollectionLink(result.id);
      const another = element("button", { type: "button", className: "le-button le-primary" }, "Create another listing");
      another.addEventListener("click", () => {
        dispose();
        const nextPage = createListingForm(pb);
        if (window.app?.store) window.app.store.page = nextPage;
        else page.replaceWith(nextPage);
      });
      message.append(element("div", { className: "le-actions" }, collection, another));
      form.hidden = true;
    } catch (error) {
      if (disposed) return;
      const validation = error.response?.data;
      const fields = validation && Object.keys(validation).map((name) => `${name}: ${validation[name]?.message || "check this field"}`).join(" ");
      showMessage(`${error.response?.message || "Save failed. Check your connection. If the outcome is uncertain, check Collections before retrying to avoid a duplicate."}${fields ? ` ${fields}` : ""}`);
    } finally {
      saving = false;
      controls.disabled = false;
      submitButton.textContent = originalLabel;
      form.removeAttribute("aria-busy");
    }
  });

  function appCollectionLink(recordId) {
    return element("a", {
      className: "le-button",
      href: `#/collections?collection=listings&record=${encodeURIComponent(recordId)}`,
    }, "Open in Collections");
  }

  function beforeUnload(event) {
    if (saving) { event.preventDefault(); event.returnValue = ""; }
  }
  function dispose() {
    disposed = true;
    releasePhotos();
    window.removeEventListener("beforeunload", beforeUnload);
    window.removeEventListener("hashchange", dispose);
  }
  window.addEventListener("beforeunload", beforeUnload);
  window.addEventListener("hashchange", dispose, { once: true });
  loadCategories();
  return page;
}
