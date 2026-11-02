const { createListingForm } = await import("/_/extensions/listing-editor/form.js");
const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = "/_/extensions/listing-editor/style.css";
document.head.append(stylesheet);

app.routes.superuserOnly("#/new-listing", () => {
  app.store.title = "New listing";
  return createListingForm(app.pb);
});
app.store.headerLinks.push({
  href: "#/new-listing",
  icon: "ri-add-circle-line",
  label: "New listing",
});
