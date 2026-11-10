// Order Pad suppliers and product catalogue (wireframe data).
// Shared by the Order Pad (app.js) and Settings (product-specific daily thresholds).
(function initialiseOrderPadCatalogue() {
  const suppliers = [
    { id: "aah", label: "AAH" },
    { id: "alliance", label: "Alliance" },
    { id: "bs", label: "B&S Distribution" },
    { id: "ethigen", label: "Ethigen" },
    { id: "otcd", label: "OTCD" },
    { id: "phoenix", label: "Phoenix" },
    { id: "trident", label: "Trident" },
    { id: "lexon", label: "Lexon" }
  ];

  const catalogue = [
    { id: "p1", name: "Bendroflumethiazide 2.5mg tabs (28)", pip: "1082536", initialQuantity: 28, tariff: 0.58, selectedSupplier: null, prices: { aah: 0.19, alliance: 0.12, bs: 0.05, ethigen: null, otcd: 0.06, phoenix: 0.05, trident: 0.05, lexon: 0.17 } },
    { id: "p2", name: "Atendronic acid Once Weekly 70mg tabs (4)", pip: "1119197", initialQuantity: 31, tariff: 0.95, selectedSupplier: null, prices: { aah: 0.75, alliance: 0.68, bs: 0.43, ethigen: null, otcd: 0.65, phoenix: 0.46, trident: 0.44, lexon: 0.51 } },
    { id: "p3", name: "Ascorbic acid 50mg tabs (28)", pip: "1118116", initialQuantity: 22, tariff: 41.81, selectedSupplier: null, prices: { aah: 27.36, alliance: 24.21, bs: 0.49, ethigen: null, otcd: 27.59, phoenix: 41.56, trident: 21.18, lexon: 43.98 } },
    { id: "p4", name: "Morphine Sulfate 10mg tabs (28)", pip: "1084706", initialQuantity: 30, tariff: 3.93, isControlledDrug: true, selectedSupplier: null, prices: { aah: 1.08, alliance: 1.19, bs: 0.70, ethigen: null, otcd: 1.19, phoenix: 0.86, trident: 1.05, lexon: 0.97 } },
    { id: "p5", name: "Insulin Aspart 100 units/ml injection (1)", pip: "1129417", initialQuantity: 10, tariff: 7.61, isFridge: true, selectedSupplier: "aah", prices: { aah: 15.00, alliance: 15.40, bs: 15.25, ethigen: null, otcd: 15.30, phoenix: 15.20, trident: 15.35, lexon: 15.45 } },
    { id: "p6", name: "Alfacalcidol 0.5mcg caps (30)", pip: "1098110", initialQuantity: 10, tariff: 7.61, selectedSupplier: null, prices: { aah: 1.77, alliance: 2.19, bs: 1.66, ethigen: null, otcd: 1.12, phoenix: 2.02, trident: 1.68, lexon: 1.73 } },
    { id: "p7", name: "Alfuzosin XL 10mg tabs (30)", pip: "1129725", initialQuantity: 9, tariff: 12.51, selectedSupplier: null, prices: { aah: 2.94, alliance: 2.95, bs: 1.49, ethigen: null, otcd: 2.95, phoenix: 3.26, trident: 3.32, lexon: 6.53 } },
    { id: "p8", name: "Codeine linctus (200ml)", pip: "1030949", initialQuantity: 18, tariff: 2.40, selectedSupplier: null, prices: { aah: 1.80, alliance: null, bs: 2.26, ethigen: null, otcd: null, phoenix: 2.48, trident: null, lexon: 16.00 } },
    { id: "p9", name: "Itracozole 100mg caps (15)", pip: "1116367", initialQuantity: 15, tariff: 4.70, selectedSupplier: null, prices: { aah: 2.43, alliance: 2.62, bs: 2.94, ethigen: null, otcd: 2.62, phoenix: 12.38, trident: 2.44, lexon: 6.98 } },
    { id: "p10", name: "Balneum cream (50g)", pip: "3509544", initialQuantity: 17, tariff: 2.85, selectedSupplier: null, prices: { aah: 2.85, alliance: 2.85, bs: 2.79, ethigen: null, otcd: null, phoenix: 2.78, trident: null, lexon: null } },
    { id: "p11", name: "Optive 0.5% eye drops (10ml) *PI*", pip: "5702279", initialQuantity: 26, tariff: 6.12, selectedSupplier: null, prices: { aah: 6.68, alliance: null, bs: 6.29, ethigen: null, otcd: 7.45, phoenix: 6.92, trident: 7.05, lexon: 7.07 } },
    { id: "p12", name: "Angitil SR 90mg caps (56)", pip: "2129955", initialQuantity: 32, tariff: 7.03, selectedSupplier: null, prices: { aah: 6.75, alliance: 7.03, bs: 6.50, ethigen: null, otcd: null, phoenix: 6.85, trident: null, lexon: null } },
    { id: "p13", name: "Aripro emollient aerosol spray (250ml)", pip: "3673894", initialQuantity: 29, tariff: 5.90, selectedSupplier: null, prices: { aah: 6.60, alliance: null, bs: null, ethigen: null, otcd: null, phoenix: 6.53, trident: null, lexon: null } },
    { id: "p14", name: "Alendronic acid+colecalciferol 70mg/70mcg tabs (4)", pip: "1218825", initialQuantity: 3, tariff: 22.80, selectedSupplier: null, prices: { aah: 22.80, alliance: 6.99, bs: null, ethigen: null, otcd: 6.99, phoenix: 8.76, trident: null, lexon: null } },
    { id: "p15", name: "prosyn 500mg tabs (56)", pip: "2200301", initialQuantity: 7, tariff: 8.56, selectedSupplier: null, prices: { aah: 7.53, alliance: 7.49, bs: null, ethigen: null, otcd: null, phoenix: 7.45, trident: null, lexon: null } },
    { id: "p16", name: "Alendronic acid 70mg/100ml unit dose oral soln SF (4)", pip: "1160597", initialQuantity: 41, tariff: 29.71, selectedSupplier: null, prices: { aah: 26.07, alliance: 27.77, bs: 9.16, ethigen: null, otcd: 10.74, phoenix: 14.79, trident: null, lexon: 7.89 } },
    { id: "p17", name: "Adalimumab 40mg injection (2)", pip: "7788990", initialQuantity: 2, tariff: 54.00, isFridge: true, selectedSupplier: "aah", prices: { aah: 85.00, alliance: 86.20, bs: null, ethigen: null, otcd: null, phoenix: 85.75, trident: null, lexon: null } },
    { id: "p18", name: "SMA PRO follow on milk powder (800g)", pip: "3473915", initialQuantity: 2, tariff: 11.00, selectedSupplier: null, prices: { aah: 11.60, alliance: null, bs: null, ethigen: null, otcd: null, phoenix: 11.29, trident: null, lexon: null } },
    { id: "p19", name: "Activa leg ulcer liner pack c/toe 10mmHg XXlge black (3)", pip: "3870847", initialQuantity: 35, tariff: 18.84, selectedSupplier: null, prices: { aah: 16.15, alliance: 16.24, bs: null, ethigen: null, otcd: null, phoenix: 17.00, trident: null, lexon: null } },
    { id: "p20", name: "Aquacel Ag Ribbon 2cmx45cm", pip: "2926434", initialQuantity: 1, tariff: 22.00, selectedSupplier: null, prices: { aah: 24.23, alliance: 25.50, bs: 24.30, ethigen: null, otcd: 22.40, phoenix: null, trident: null, lexon: null } },
    { id: "p21", name: "Beambridge Leg bag 6-95 long tube 750ml (10)", pip: "3739752", initialQuantity: 46, tariff: 32.64, selectedSupplier: null, prices: { aah: 29.86, alliance: null, bs: null, ethigen: null, otcd: null, phoenix: 26.80, trident: null, lexon: null } },
    { id: "p22", name: "Actilymph b/knee op/toe std black lge cl2 (2)", pip: "3428364", initialQuantity: 27, tariff: 31.41, selectedSupplier: null, prices: { aah: 26.94, alliance: 27.10, bs: null, ethigen: null, otcd: null, phoenix: 28.36, trident: null, lexon: null } },
    { id: "p23", name: "Assura Inspire 12136 midi transp colobag 35mm (30)", pip: "2596419", initialQuantity: 39, tariff: 87.59, selectedSupplier: null, prices: { aah: 86.29, alliance: 85.59, bs: null, ethigen: null, otcd: null, phoenix: 86.29, trident: null, lexon: null } },
    { id: "p24", name: "Clonidine 100mcg tablets (100)", pip: "1290279", initialQuantity: 1, tariff: 10.05, concessionPrice: true, selectedSupplier: "ethigen", prices: { aah: 8.12, alliance: 8.24, bs: 10.22, ethigen: 8.06, otcd: 8.28, phoenix: 8.18, trident: 10.42, lexon: 8.34 } },
    { id: "p25", name: "Affend XL 18mg tablets PR (30)", pip: "4229340", initialQuantity: 1, tariff: 10.90, concessionPrice: true, selectedSupplier: "aah", prices: { aah: 8.74, alliance: 13.08, bs: 8.88, ethigen: 8.82, otcd: 11.24, phoenix: 8.76, trident: null, lexon: 8.94 } },
    { id: "p26", name: "Amoxicillin 500mg capsules (21)", pip: "0018399", initialQuantity: 3, tariff: 8.75, concessionPrice: true, selectedSupplier: "bs", prices: { aah: 7.04, alliance: 9.24, bs: 6.98, ethigen: 7.10, otcd: 7.08, phoenix: 7.16, trident: 9.31, lexon: 7.02 } },
    { id: "u1", name: "Unknown Product 1", pip: "14928", initialQuantity: 12, tariff: null, selectedSupplier: null, prices: { aah: null, alliance: null, bs: null, ethigen: null, otcd: null, phoenix: null, trident: null, lexon: null } },
    { id: "u2", name: "Unknown Product 1", pip: "700229", initialQuantity: 1, tariff: null, selectedSupplier: null, prices: { aah: null, alliance: null, bs: null, ethigen: null, otcd: null, phoenix: null, trident: null, lexon: null } },
    { id: "u3", name: "Unknown Product 1", pip: "1234567", initialQuantity: 28, tariff: null, selectedSupplier: null, prices: { aah: null, alliance: null, bs: null, ethigen: null, otcd: null, phoenix: null, trident: null, lexon: null } },
    // Brand / Generic products with approved Product Mappings (brand-equalisation.js), in the basket.
    { id: "147768", name: "Bisacodyl 5mg tabs (60)", pip: "8152084", initialQuantity: 4, tariff: 9.50, selectedSupplier: "bs", productType: "Generic", packSize: "60 Tablets", prices: { aah: 8.72, alliance: 8.66, bs: 8.40, ethigen: null, otcd: 8.58, phoenix: 8.61, trident: null, lexon: null } },
    { id: "900101", name: "Lansoprazole 30mg caps (28)", pip: "2345678", initialQuantity: 2, tariff: 13.20, selectedSupplier: "aah", productType: "Generic", packSize: "28 Capsules", prices: { aah: 12.60, alliance: 12.94, bs: 12.88, ethigen: null, otcd: null, phoenix: 12.75, trident: null, lexon: null } },
    { id: "900102", name: "Salbutamol 100mcg inhaler", pip: "4573891", initialQuantity: 3, tariff: 12.20, selectedSupplier: "aah", productType: "Generic", packSize: "1 Inhaler", prices: { aah: 10.50, alliance: 11.20, bs: 10.85, ethigen: null, otcd: null, phoenix: 10.95, trident: null, lexon: null } },
    { id: "900103", name: "Amlodipine 5mg tabs (28)", pip: "6789123", initialQuantity: 5, tariff: 10.50, selectedSupplier: "aah", productType: "Generic", packSize: "28 Tablets", prices: { aah: 10.05, alliance: 10.22, bs: 10.18, ethigen: null, otcd: null, phoenix: 10.14, trident: null, lexon: null } },
    { id: "101067", name: "Nurofen 200mg caplets (16)", pip: "2633253", initialQuantity: 2, tariff: 4.80, selectedSupplier: "aah", productType: "Brand", packSize: "16 Tablets", prices: { aah: 4.50, alliance: 4.62, bs: 4.58, ethigen: null, otcd: null, phoenix: 4.70, trident: null, lexon: null } },
    { id: "103758", name: "Panadol Advance 500mg tabs (16)", pip: "3406535", initialQuantity: 3, tariff: 4.10, selectedSupplier: "aah", productType: "Brand", packSize: "16 Tablets", prices: { aah: 3.80, alliance: 3.92, bs: 3.88, ethigen: null, otcd: null, phoenix: 4.00, trident: null, lexon: null } },
    // Their approved lower-cost equivalents: in the catalogue but not in the starting basket.
    { id: "80872", name: "Dulcolax 5mg tabs (60)", pip: "3805793", initialBasket: false, tariff: 9.50, productType: "Brand", packSize: "60 Tablets", prices: { aah: 7.48, alliance: 7.20, bs: 7.36, ethigen: null, otcd: 7.44, phoenix: 7.31, trident: null, lexon: null } },
    { id: "900111", name: "Zoton 30mg caps (28)", pip: "3456789", initialBasket: false, tariff: 13.20, productType: "Brand", packSize: "28 Capsules", prices: { aah: 11.34, alliance: 11.20, bs: 11.00, ethigen: null, otcd: null, phoenix: 11.18, trident: null, lexon: null } },
    { id: "900112", name: "Ventolin 100mcg inhaler", pip: "5678912", initialBasket: false, tariff: 12.20, productType: "Brand", packSize: "1 Inhaler", prices: { aah: 9.08, alliance: 9.12, bs: 8.80, ethigen: null, otcd: null, phoenix: 8.94, trident: null, lexon: null } },
    { id: "900113", name: "Norvasc 5mg tabs (28)", pip: "7891234", initialBasket: false, tariff: 10.50, productType: "Brand", packSize: "28 Tablets", prices: { aah: 9.16, alliance: 9.08, bs: 8.95, ethigen: null, otcd: null, phoenix: 9.02, trident: null, lexon: null } },
    { id: "89728", name: "Ibuprofen 200mg caplets (16)", pip: "1093111", initialBasket: false, tariff: 2.50, productType: "Generic", packSize: "16 Tablets", prices: { aah: 2.35, alliance: 2.30, bs: 2.20, ethigen: null, otcd: null, phoenix: 2.40, trident: null, lexon: null } },
    { id: "104666", name: "Paracetamol 500mg tabs (16)", pip: "1130574", initialBasket: false, tariff: 1.80, productType: "Generic", packSize: "16 Tablets", prices: { aah: 1.62, alliance: 1.50, bs: 1.58, ethigen: null, otcd: null, phoenix: 1.70, trident: null, lexon: null } }
  ];

  window.CascadeOrderPadCatalogue = { suppliers, catalogue };
})();
