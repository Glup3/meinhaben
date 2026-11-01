migrate((app) => {
  const listings = app.findCollectionByNameOrId("listings");
  listings.fields.removeByName("handover");
  app.save(listings);
}, (app) => {
  const listings = app.findCollectionByNameOrId("listings");
  listings.fields.add(new TextField({ name: "handover", required: true, max: 300 }));
  app.save(listings);
});
