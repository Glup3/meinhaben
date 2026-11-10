migrate((app) => {
  const sellers = new Collection({
    name: "sellers", type: "auth",
    listRule: null, viewRule: "id = @request.auth.id", createRule: null,
    updateRule: null, deleteRule: null, manageRule: null,
    authRule: "enabled = true",
    passwordAuth: { enabled: true, identityFields: ["email"] },
    authToken: { duration: 28800 },
    fields: [{ name: "enabled", type: "bool" }],
  });
  app.save(sellers);
  const seller = '@request.auth.collectionName = "sellers" && @request.auth.enabled = true';
  const own = seller + ' && owner = @request.auth.id';
  const listings = app.findCollectionByNameOrId("listings");
  listings.fields.add(new RelationField({ name: "owner", collectionId: sellers.id, maxSelect: 1 }));
  listings.listRule = listings.viewRule = 'published = true || (' + own + ')';
  listings.createRule = own;
  listings.updateRule = own + ' && @request.body.owner:changed = false';
  listings.deleteRule = own;
  app.save(listings);
  const images = app.findCollectionByNameOrId("listing_images");
  const ownImage = seller + ' && listing.owner = @request.auth.id';
  images.listRule = images.viewRule = 'listing.published = true || (' + ownImage + ')';
  images.createRule = ownImage;
  images.updateRule = ownImage + ' && @request.body.listing:changed = false';
  images.deleteRule = ownImage;
  app.save(images);
}, (app) => {
  const images = app.findCollectionByNameOrId("listing_images");
  images.listRule = images.viewRule = 'listing.published = true';
  images.createRule = images.updateRule = images.deleteRule = null;
  app.save(images);
  const listings = app.findCollectionByNameOrId("listings");
  listings.listRule = listings.viewRule = 'published = true';
  listings.createRule = listings.updateRule = listings.deleteRule = null;
  listings.fields.removeByName("owner");
  app.save(listings);
  app.delete(app.findCollectionByNameOrId("sellers"));
});
