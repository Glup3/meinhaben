module.exports.createListing = (event) => {
  let data;
  try {
    data = JSON.parse(event.request.formValue("listing"));
  } catch (_) {
    throw new BadRequestError("The listing form is invalid. Please reload and try again.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new BadRequestError("The listing form is invalid.");
  }
  const uploads = event.request.multipartForm;
  const photos = uploads && uploads.file && uploads.file.images ? event.findUploadedFiles("images") : [];
  if (photos.length > 12) {
    throw new BadRequestError("Upload up to 12 photos per listing.");
  }
  if (typeof data.publish !== "boolean" || !Number.isSafeInteger(data.price_cents) || data.price_cents < 0) {
    throw new BadRequestError("Enter a valid price and publication choice.");
  }
  if (data.publish && photos.length === 0) {
    throw new BadRequestError("Add at least one photo before publishing.");
  }
  if (!Array.isArray(data.photos) || data.photos.length !== photos.length || data.photos.some((photo) =>
    !photo || typeof photo.alt !== "string" || !photo.alt.trim() || photo.alt.length > 500
  )) {
    throw new BadRequestError("Add a description for each photo.");
  }
  let listing;
  try {
    event.app.runInTransaction((app) => {
      listing = new Record(app.findCollectionByNameOrId("listings"));
      for (const field of ["title", "slug", "description", "category", "condition", "status"]) {
        if (typeof data[field] !== "string") {
          throw new BadRequestError(`Enter a valid ${field}.`);
        }
        listing.set(field, data[field].trim());
      }
      listing.set("price_cents", data.price_cents);
      listing.set("details", data.details);
      listing.set("published", false);
      app.save(listing);
      const imagesCollection = app.findCollectionByNameOrId("listing_images");
      photos.forEach((file, index) => {
        const image = new Record(imagesCollection);
        image.set("listing", listing.id);
        image.set("image", file);
        image.set("alt", data.photos[index].alt.trim());
        image.set("sort_order", index);
        app.save(image);
      });
      if (data.publish) {
        listing.set("published_at", new Date().toISOString());
        listing.set("published", true);
        app.save(listing);
      }
    });
  } catch (error) {
    if (error.status) throw error;
    throw new BadRequestError("Could not save the listing. Check the fields, use a unique URL slug, and upload only JPEG, PNG or WebP photos up to 10 MB each.", error);
  }
  return event.json(201, {
    id: listing.id,
    slug: listing.getString("slug"),
    published: listing.getBool("published"),
    image_count: photos.length,
  });
};
