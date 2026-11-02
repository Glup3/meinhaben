$app.onServe().bindFunc((event) => {
  event.uiExtensions = event.uiExtensions.concat([{
    name: "listing-editor",
    fs: $os.dirFS(`${__hooks}/listing-editor`),
  }]);
  event.next();
});

routerUse((event) => {
  if (event.request.url.path === "/_/extensions.js" || event.request.url.path.indexOf("/_/extensions/listing-editor/") === 0) {
    event.response.header().set("Cache-Control", "no-cache");
  }
  return event.next();
});

routerAdd("POST", "/api/marketplace/listings", (event) => {
  const { createListing } = require(`${__hooks}/lib/create-listing.js`);
  return createListing(event);
}, $apis.requireSuperuserAuth(), $apis.bodyLimit(125 * 1024 * 1024));
