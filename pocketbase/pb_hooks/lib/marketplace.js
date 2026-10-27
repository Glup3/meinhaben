module.exports.assertPhotoCanBeRemoved = (app, photoId, listingId) => {
  const published = app.findRecordsByFilter("listings", "id = {:listing} && published = true", "", 1, 0, { listing: listingId });
  if (published.length === 0) return;
  const remaining = app.findRecordsByFilter("listing_images", "listing = {:listing} && id != {:photo}", "", 1, 0, { listing: listingId, photo: photoId });
  if (remaining.length === 0) {
    throw new BadRequestError("Unpublish the listing or add another photo before removing its last photo.");
  }
};
