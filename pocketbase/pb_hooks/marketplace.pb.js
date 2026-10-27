onRecordValidate((event) => {
  const details = JSON.parse(event.record.getString("details") || "null");
  if (!Array.isArray(details) || details.some((detail) =>
    !detail || typeof detail.label !== "string" || !detail.label.trim() ||
    typeof detail.value !== "string" || !detail.value.trim()
  )) {
    throw new BadRequestError("Details must be an array of non-empty label/value objects.");
  }
  if (event.record.getBool("published")) {
    if (!event.record.getString("published_at")) {
      throw new BadRequestError("Set a publication date before publishing.");
    }
    const photos = event.app.findRecordsByFilter("listing_images", "listing = {:listing}", "", 1, 0, { listing: event.record.id });
    if (photos.length === 0) {
      throw new BadRequestError("Save the draft and add at least one photo before publishing.");
    }
  }
  event.next();
}, "listings");

onRecordDelete((event) => {
  const { assertPhotoCanBeRemoved } = require(`${__hooks}/lib/marketplace.js`);
  const originalApp = event.app;
  try {
    originalApp.runInTransaction((app) => {
      event.app = app;
      assertPhotoCanBeRemoved(app, event.record.id, event.record.getString("listing"));
      event.next();
    });
  } finally {
    event.app = originalApp;
  }
}, "listing_images");

onRecordUpdate((event) => {
  const previousListing = event.record.original().getString("listing");
  if (previousListing === event.record.getString("listing")) {
    event.next();
    return;
  }
  const { assertPhotoCanBeRemoved } = require(`${__hooks}/lib/marketplace.js`);
  const originalApp = event.app;
  try {
    originalApp.runInTransaction((app) => {
      event.app = app;
      assertPhotoCanBeRemoved(app, event.record.id, previousListing);
      event.next();
    });
  } finally {
    event.app = originalApp;
  }
}, "listing_images");
