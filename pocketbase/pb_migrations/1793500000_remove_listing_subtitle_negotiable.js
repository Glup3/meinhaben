migrate((app) => {
  const listings = app.findCollectionByNameOrId("listings");
  listings.fields.removeByName("subtitle");
  listings.fields.removeByName("negotiable");
  app.save(listings);
}, (app) => {
  const listings = app.findCollectionByNameOrId("listings");
  listings.fields.add(new TextField({ name: "subtitle", required: true, max: 200 }));
  listings.fields.add(new BoolField({ name: "negotiable" }));
  app.save(listings);
});
