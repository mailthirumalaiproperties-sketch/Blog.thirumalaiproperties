-- Default page SEO, settings and categories (taken from the live main website)

INSERT INTO page_seo (page_key, label, path, title, description) VALUES
  ('home', 'Home', '/', 'Thirumalai Properties | Real Estate in Pondicherry & Puducherry',
   'Thirumalai Properties - Trusted real estate agency in Pondicherry (Puducherry). Find premium plots, lands, and villas for sale with expert registration & NRI services.'),
  ('properties', 'Properties', '/properties/', 'Plots, Land & Villas for Sale in Pondicherry',
   'Browse residential plots, agricultural land, villas and commercial buildings for sale in Pondicherry and Puducherry with Thirumalai Properties.'),
  ('documents', 'Documents', '/documents/', 'Property Document Writing & Registration in Pondicherry',
   'Sale deed drafting, document writing, registration support and patta transfer services in Pondicherry from Thirumalai Properties.'),
  ('nri-property', 'NRI Property', '/nri-property/', 'NRI Property Management in Pondicherry',
   'Property management for NRIs in Pondicherry: rent collection, maintenance, tax payments, document work and on-the-ground support.'),
  ('about-us', 'About Us', '/about-us/', 'About Thirumalai Properties',
   'Learn about Thirumalai Properties, a trusted real estate and documentation partner in Pondicherry.'),
  ('contact', 'Contact', '/contact/', 'Contact Thirumalai Properties',
   'Call, WhatsApp or email Thirumalai Properties in Saram, Puducherry for property buying, selling, documentation and NRI services.'),
  ('blog', 'Blog', '/blog/', 'Real Estate Blog: Pondicherry Property Guides',
   'Practical guides on buying land and homes, registering documents, NRI property ownership and the Puducherry real estate market.');

INSERT INTO settings (key, value, updated_at) VALUES
  ('organization', '{"name":"Thirumalai Properties","phone":"+91 95144 76555","phone2":"+91 96556 11234","whatsapp":"919514476555","email":"mail.thirumalaiproperties@gmail.com","streetAddress":"No. 17, Sakthi Nagar Main Road, Saram","locality":"Puducherry","postalCode":"605013","region":"Puducherry","country":"IN","instagram":"https://www.instagram.com/thirumalai_properties","youtube":"https://www.youtube.com/@ThirumalaiProperties","facebook":""}', '2026-11-03T00:00:00.000Z'),
  ('seo_defaults', '{"titleSuffix":" | Thirumalai Properties","defaultDescription":"Trusted real estate agency in Pondicherry (Puducherry): plots, land and villas for sale, document registration and NRI property management.","defaultOgMediaId":null,"googleVerification":""}', '2026-11-03T00:00:00.000Z');

INSERT INTO categories (id, slug, name, description, created_at, updated_at) VALUES
  ('cat_buying', 'buying-guide', 'Buying Guide', 'Checklists and advice for buying plots, land and homes in Pondicherry.', '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z'),
  ('cat_nri', 'nri-corner', 'NRI Corner', 'Guidance for Non-Resident Indians buying and managing property in Pondicherry.', '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z'),
  ('cat_registration', 'registration-and-documents', 'Registration & Documents', 'How property registration, sale deeds, patta and other documents work in Puducherry.', '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z');
