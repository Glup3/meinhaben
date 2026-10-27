migrate((app) => {
  const categories = new Collection({
    type: "base",
    name: "categories",
    listRule: "",
    viewRule: "",
    fields: [
      { name: "name", type: "text", required: true, max: 80 },
      { name: "slug", type: "text", required: true, max: 100, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
      { name: "icon", type: "select", required: true, maxSelect: 1, values: ["home", "tech", "sun"] },
      { name: "sort_order", type: "number", min: 0, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)"],
  });
  app.save(categories);

  const listings = new Collection({
    type: "base",
    name: "listings",
    listRule: "published = true",
    viewRule: "published = true",
    fields: [
      { name: "slug", type: "text", required: true, max: 150, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
      { name: "title", type: "text", required: true, max: 200 },
      { name: "subtitle", type: "text", required: true, max: 200 },
      { name: "description", type: "text", required: true, max: 20000 },
      { name: "category", type: "relation", required: true, collectionId: categories.id, maxSelect: 1 },
      { name: "price_cents", type: "number", min: 0, onlyInt: true },
      { name: "negotiable", type: "bool" },
      { name: "condition", type: "select", required: true, maxSelect: 1, values: ["new", "like_new", "very_good", "good", "fair"] },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["available", "reserved", "sold"] },
      { name: "handover", type: "text", required: true, max: 300 },
      { name: "details", type: "json", maxSize: 20000 },
      { name: "published", type: "bool" },
      { name: "published_at", type: "date" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_listings_slug ON listings (slug)",
      "CREATE INDEX idx_listings_publication ON listings (published, published_at)",
      "CREATE INDEX idx_listings_category ON listings (category)",
    ],
  });
  app.save(listings);

  app.save(new Collection({
    type: "base",
    name: "listing_images",
    listRule: "listing.published = true",
    viewRule: "listing.published = true",
    fields: [
      { name: "listing", type: "relation", required: true, collectionId: listings.id, maxSelect: 1, cascadeDelete: true },
      { name: "image", type: "file", required: true, maxSelect: 1, maxSize: 10485760, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: ["600x450", "1200x1200"] },
      { name: "alt", type: "text", required: true, max: 500 },
      { name: "sort_order", type: "number", min: 0, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_listing_images_order ON listing_images (listing, sort_order)"],
  }));
}, (app) => {
  for (const name of ["listing_images", "listings", "categories"]) {
    app.delete(app.findCollectionByNameOrId(name));
  }
});
