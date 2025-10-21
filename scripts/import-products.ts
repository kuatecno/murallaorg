import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Products from the spreadsheet
const products = [
  // Muffins - Mis Amigos Veganos
  { sku: "200 MAV MUF-ZA 8", ean: "658325668155", name: "Muffin zanahoria", brand: "Mis Amigos Veganos", wholesalePriceWithTax: 1380, wholesalePriceNoTax: 1160, netPrice: 1160, unitsPurchased: 0, retailPriceWithTax: 2300, margin: 49 },
  { sku: "200 MAV MUF-JI 8", ean: "658325668162", name: "Muffin de jengibre individual", brand: "Mis Amigos Veganos", wholesalePriceWithTax: 1380, wholesalePriceNoTax: 1160, netPrice: 1160, unitsPurchased: 0, retailPriceWithTax: 2300, margin: 49 },
  { sku: "200 MAV MUF-AR 8", ean: "658325668162", name: "Muffin arándanos", brand: "Mis Amigos Veganos", wholesalePriceWithTax: 1892, wholesalePriceNoTax: 1590, netPrice: 1590, unitsPurchased: 0, retailPriceWithTax: 2700, margin: 30 },
  { sku: "200 MAV HEL MM 8", ean: "781159074011", name: "Helado Mango maracuyá individual", brand: "Mis Amigos Veganos", wholesalePriceWithTax: 1892, wholesalePriceNoTax: 1590, netPrice: 1590, unitsPurchased: 0, retailPriceWithTax: 2700, margin: 30 },
  { sku: "200 MAV HEL FB 8", ean: "781159073991", name: "Helados frutos del bosque individual", brand: "Mis Amigos Veganos", wholesalePriceWithTax: 1892, wholesalePriceNoTax: 1590, netPrice: 1590, unitsPurchased: 3, retailPriceWithTax: 2700, margin: 30 },
  { sku: "200 MAV HEL CC 8", ean: "781159074035", name: "Helado Cookies and cream individual", brand: "Mis Amigos Veganos", wholesalePriceWithTax: 1892, wholesalePriceNoTax: 1590, netPrice: 1590, unitsPurchased: 3, retailPriceWithTax: 2700, margin: 30 },
  { sku: "200 MAV ROLL CAN 8", ean: "", name: "Roll de canela", brand: "Mis Amigos Veganos", wholesalePriceWithTax: 1170, wholesalePriceNoTax: 983, netPrice: 983, unitsPurchased: 0, retailPriceWithTax: 2000, margin: 51 },
  { sku: "200 MAV MUF CHCH 8", ean: "658325668179", name: "Muffin chips de chocolate", brand: "Mis Amigos Veganos", wholesalePriceWithTax: 1380, wholesalePriceNoTax: 1160, netPrice: 1160, unitsPurchased: 8, retailPriceWithTax: 2300, margin: 49 },

  // Brisnacks - Highlighted items
  { sku: "", ean: "", name: "PACK GALLETAS DE AZUCAR BRISNACKS", brand: "Brisnacks", wholesalePriceWithTax: 500, wholesalePriceNoTax: 500, netPrice: 500, unitsPurchased: 0, totalNet: 54500, retailPriceWithTax: null, margin: null },
  { sku: "100 BNK ALF MCC 9", ean: "661787073870", name: "ALFAJOR MANJAR COCO SIN AZUCAR 1", brand: "Brisnacks", wholesalePriceWithTax: 615, wholesalePriceNoTax: 517, netPrice: 517, unitsPurchased: 15, totalNet: 7755, retailPriceWithTax: 1000, margin: 39 },
  { sku: "100 BNK ALF CHOC 9", ean: "661787073887", name: "ALFAJOR CHOCOLATE Sin AZUCAR", brand: "Brisnacks", wholesalePriceWithTax: 595, wholesalePriceNoTax: 500, netPrice: 500, unitsPurchased: 15, retailPriceWithTax: 1000, margin: 41 },
  { sku: "100 BNK ALF VAN 9", ean: "661787073894", name: "ALFAJOR VAINILLA SIN AZUCAR", brand: "Brisnacks", wholesalePriceWithTax: 595, wholesalePriceNoTax: 500, netPrice: 500, unitsPurchased: 15, retailPriceWithTax: 1000, margin: 41 },
  { sku: "100 BNK GALL BER 9", ean: "764451928367", name: "GALLETO BERRIES SIN AZUCAR", brand: "Brisnacks", wholesalePriceWithTax: 595, wholesalePriceNoTax: 500, netPrice: 500, unitsPurchased: 20, retailPriceWithTax: 1000, margin: 41 },
  { sku: "100 BNK GACO VAI 9", ean: "764451928343", name: "GALLETA VAINILLA SIN AZUCAR", brand: "Brisnacks", wholesalePriceWithTax: 595, wholesalePriceNoTax: 500, netPrice: 500, unitsPurchased: 12, retailPriceWithTax: 1000, margin: 41 },
  { sku: "100 BNK DEL FRCH 9", ean: "701156311676", name: "DELICIA FRAMBUESA CHOCOLATE SIN AZUCAR", brand: "Brisnacks", wholesalePriceWithTax: 595, wholesalePriceNoTax: 500, netPrice: 500, unitsPurchased: 15, retailPriceWithTax: 1000, margin: 41 },
  { sku: "100 BNK GALL CHOC 9", ean: "764451928374", name: "GALLETO CHOCOLATE SIN AZUCAR", brand: "Brisnacks", wholesalePriceWithTax: 595, wholesalePriceNoTax: 500, netPrice: 500, unitsPurchased: 20, retailPriceWithTax: 1000, margin: 41 },
  { sku: "100 BNK GACO CHOC 9", ean: "709450180365", name: "GALLETA CHOCOLATE SIN AZUCAR", brand: "Brisnacks", wholesalePriceWithTax: 595, wholesalePriceNoTax: 500, netPrice: 500, unitsPurchased: 12, retailPriceWithTax: 1000, margin: 41 },
  { sku: "100 SMT MTQ MN 08", ean: "979173538303", name: "Mantequilla (pasta) de maní original 150 g", brand: "Smuller", wholesalePriceWithTax: 2249, wholesalePriceNoTax: 1890, netPrice: 1890, unitsPurchased: 24, totalNet: 45360, retailPriceWithTax: 3200, margin: 30 },

  // Dr Kombu Kombucha
  { sku: "100 DKK KBCH ORI", ean: "737186382759", name: "DR KOMBU CAJA BEBIDA ACIDA DE 4 SABORES (3 BOTELLAS DE CADA SABOR) 475ML", brand: "Dr Kombu Kombucha", wholesalePriceWithTax: 2099, wholesalePriceNoTax: 1764, netPrice: 1764, unitsPurchased: 24, retailPriceWithTax: null, margin: null },
  { sku: "100 DKK KBCH MZN", ean: "737186382766", name: "MANZANA GENGIBRE", brand: "Dr Kombu Kombucha", wholesalePriceWithTax: 2099, wholesalePriceNoTax: 1764, netPrice: 1764, unitsPurchased: 6, retailPriceWithTax: 3000, margin: 30 },
  { sku: "100 DKK KBCH FRE", ean: "737186382773", name: "MANGO FRESA", brand: "Dr Kombu Kombucha", wholesalePriceWithTax: 2099, wholesalePriceNoTax: 1764, netPrice: 1764, unitsPurchased: 6, retailPriceWithTax: 3000, margin: 30 },
  { sku: "100 DKK KBCH MXBR", ean: "737186382773", name: "MIX BERRIES", brand: "Dr Kombu Kombucha", wholesalePriceWithTax: 2099, wholesalePriceNoTax: 1764, netPrice: 1764, unitsPurchased: 6, retailPriceWithTax: 3000, margin: 30 },

  // Agua Esencial
  { sku: "100 AESC AG QMAG", ean: "671875637186", name: "Botella Agua Esencial Magnesio 500cc c/gas", brand: "Agua Esencial", wholesalePriceWithTax: 458, wholesalePriceNoTax: 385, netPrice: 385, unitsPurchased: 72, totalNet: 27720, retailPriceWithTax: null, margin: null },
  { sku: "100 AESC AGBI SGMAG", ean: "614437826997", name: "Botella Agua Esencial Magnesio 10 lt s/gas", brand: "Agua Esencial", wholesalePriceWithTax: 1845, wholesalePriceNoTax: 1550, netPrice: 1550, unitsPurchased: 5, totalNet: 7750, retailPriceWithTax: null, margin: null },
  { sku: "100 AESC AG SGMAG", ean: "671875637169", name: "Botella Agua Esencial Magnesio 500cc s/gas", brand: "Agua Esencial", wholesalePriceWithTax: 458, wholesalePriceNoTax: 385, netPrice: 385, unitsPurchased: 36, totalNet: 13860, retailPriceWithTax: 1200, margin: 68 },
  { sku: "100 AMZC ELCT MCY", ean: "780467680544", name: "Electrólitos Caja Display 30 Sticks - Sabor Maracuyá", brand: "Amazing Care ®", wholesalePriceWithTax: 15000, wholesalePriceNoTax: 12605, netPrice: 12605, unitsPurchased: 3, totalNet: 37815, retailPriceWithTax: null, margin: null },

  // Comida en Frasco
  { sku: "100 CMFR ALCON GLNTJ", ean: "", name: "GUISO DE LENTEJAS CON ARROZ", brand: "Comida en Frasco", wholesalePriceWithTax: 3750, wholesalePriceNoTax: 3151, netPrice: 3151, unitsPurchased: 1, totalNet: 3151, retailPriceWithTax: 5000, margin: 25 },
  { sku: "100 CMFR ALCON CPUER", ean: "", name: "CREMA DE PUERTO | VICHYSSOISE", brand: "Comida en Frasco", wholesalePriceWithTax: 4501, wholesalePriceNoTax: 3782, netPrice: 3782, unitsPurchased: 1, totalNet: 3782, retailPriceWithTax: 6000, margin: 25 },
  { sku: "100 CMFR ALCON CPZAP", ean: "", name: "CREMA DE ZAPALLO", brand: "Comida en Frasco", wholesalePriceWithTax: 3750, wholesalePriceNoTax: 3151, netPrice: 3151, unitsPurchased: 1, totalNet: 3151, retailPriceWithTax: 5000, margin: 25 },
  { sku: "100 CMFR ALCON AJGLN", ean: "", name: "AJI DE GALLINA POLLO TROZO", brand: "Comida en Frasco", wholesalePriceWithTax: 6375, wholesalePriceNoTax: 5357, netPrice: 5357, unitsPurchased: 2, totalNet: 10714, retailPriceWithTax: 8500, margin: 25 },
  { sku: "100 CMFR ALCON ANTPA", ean: "", name: "ANTIPASTO DE BERENJENA", brand: "Comida en Frasco", wholesalePriceWithTax: 4875, wholesalePriceNoTax: 4097, netPrice: 4097, unitsPurchased: 1, totalNet: 4097, retailPriceWithTax: 6500, margin: 25 },
  { sku: "100 CMFR ALCON RECA", ean: "", name: "CARNE DE RECETA LIVIANA", brand: "Comida en Frasco", wholesalePriceWithTax: 3750, wholesalePriceNoTax: 3151, netPrice: 3151, unitsPurchased: 2, totalNet: 6302, retailPriceWithTax: 5000, margin: 25 },
  { sku: "100 CMFR ALCON PIMASL", ean: "", name: "PIMIENTOS ASADOS DE AJILLO", brand: "Comida en Frasco", wholesalePriceWithTax: 3250, wholesalePriceNoTax: 2731, netPrice: 2731, unitsPurchased: 1, totalNet: 2731, retailPriceWithTax: 5000, margin: 29 },
  { sku: "100 CMFR ALCON PRIXI", ean: "", name: "GUISO ANEXPLAIN MORRÓN", brand: "Comida en Frasco", wholesalePriceWithTax: 3750, wholesalePriceNoTax: 3151, netPrice: 3151, unitsPurchased: 1, totalNet: 3151, retailPriceWithTax: 5000, margin: 25 },
  { sku: "100 CMFR ALCON PRT", ean: "", name: "PORTOS RECETA TRADICIONAL", brand: "Comida en Frasco", wholesalePriceWithTax: 3750, wholesalePriceNoTax: 3151, netPrice: 3151, unitsPurchased: 1, totalNet: 3151, retailPriceWithTax: 5000, margin: 25 },
  { sku: "100 CMFR ALCON TMTBRJ", ean: "", name: "SALSA DE TOMATE Y TUCO CON BERENJENAS", brand: "Comida en Frasco", wholesalePriceWithTax: 4875, wholesalePriceNoTax: 4097, netPrice: 4097, unitsPurchased: 1, totalNet: 4097, retailPriceWithTax: 6500, margin: 25 },

  // Super Human Foods
  { sku: "100 SHF BR BROR", ean: "781176605569", name: "Barra Sabor Berry Original", brand: "Super Human Foods", wholesalePriceWithTax: 975, wholesalePriceNoTax: 819, netPrice: 819, unitsPurchased: 20, totalNet: 16380, retailPriceWithTax: 1500, margin: 35 },
  { sku: "100 SHF BR MNCHOC", ean: "780466920561", name: "Barra Sabor Mani Chocolate", brand: "Super Human Foods", wholesalePriceWithTax: 975, wholesalePriceNoTax: 819, netPrice: 819, unitsPurchased: 20, totalNet: 16380, retailPriceWithTax: 1500, margin: 35 },

  // Binatur - Aguas
  { sku: "100 BNTR AGCH KW 9", ean: "8935048614952", name: "AGUA DE CHIA KIWI", brand: "BINATUR", wholesalePriceWithTax: 1000, wholesalePriceNoTax: 810, netPrice: 810, unitsPurchased: 6, totalNet: 4860, retailPriceWithTax: 1700, margin: 41 },
  { sku: "100 BNTR AGCH PN 9", ean: "8935048614983", name: "AGUA DE CHIA PIÑA", brand: "BINATUR", wholesalePriceWithTax: 1000, wholesalePriceNoTax: 810, netPrice: 810, unitsPurchased: 6, totalNet: 4860, retailPriceWithTax: 1700, margin: 41 },
  { sku: "100 BNTR AGCH MIX 9", ean: "8935048614969", name: "AGUA DE CHIA MIX BERRIES", brand: "BINATUR", wholesalePriceWithTax: 1000, wholesalePriceNoTax: 810, netPrice: 810, unitsPurchased: 6, totalNet: 4860, retailPriceWithTax: 1700, margin: 41 },
  { sku: "100 BNTR AGCH FRT 9", ean: "8935048614969", name: "AGUA DE CHIA FRUTILLA", brand: "BINATUR", wholesalePriceWithTax: 1000, wholesalePriceNoTax: 810, netPrice: 810, unitsPurchased: 6, totalNet: 4860, retailPriceWithTax: 1700, margin: 41 },
  { sku: "100 BNTR AGCH MNG 9", ean: "8935048614976", name: "AGUA DE CHIA MANGO", brand: "BINATUR", wholesalePriceWithTax: 1000, wholesalePriceNoTax: 810, netPrice: 810, unitsPurchased: 6, totalNet: 4860, retailPriceWithTax: 1700, margin: 41 },

  // Benedictino/Submarino
  { sku: "100 BNDT AG SG", ean: "780282041000", name: "AGUA BENEDICTINO SIN GAS", brand: "BENDICTINO", wholesalePriceWithTax: 410, wholesalePriceNoTax: 332, netPrice: 410, unitsPurchased: 12, totalNet: 4920, retailPriceWithTax: 1000, margin: 59 },
  { sku: "100 BNDT AG GSE", ean: "780282044123", name: "AGUA HERMANOS CON GAS", brand: "SUBMARINO", wholesalePriceWithTax: 410, wholesalePriceNoTax: 332, netPrice: 410, unitsPurchased: 12, totalNet: 4920, retailPriceWithTax: 1000, margin: 59 },

  // Sole Snikers / AM Chocolates
  { sku: "300 SSNK SNK SNUS 8", ean: "", name: "SNIKERS VEGANO", brand: "SOLE SNIKERS", wholesalePriceWithTax: 1000, wholesalePriceNoTax: 810, netPrice: 810, unitsPurchased: 24, totalNet: 24000, retailPriceWithTax: 2000, margin: 50 },
  { sku: "300 ANCH CHSUB LCH", ean: "", name: "CHOCOLATE SUBMARINO LECHE", brand: "AM CHOCOLATES", wholesalePriceWithTax: 1950, wholesalePriceNoTax: 1639, netPrice: 1639, unitsPurchased: 4, totalNet: 7801.64, retailPriceWithTax: 3000, margin: 35 },
  { sku: "300 ANCH CHSUB AMG", ean: "", name: "CHOCOLATE SUBMARINO AMARGO", brand: "AM CHOCOLATES", wholesalePriceWithTax: 1950, wholesalePriceNoTax: 1639, netPrice: 1639, unitsPurchased: 5, totalNet: 9752.05, retailPriceWithTax: 3000, margin: 35 },
  { sku: "300 ANCH CHART LACH", ean: "", name: "CHOCOLATE LA CHIMBA", brand: "AM CHOCOLATES", wholesalePriceWithTax: null, wholesalePriceNoTax: null, netPrice: null, unitsPurchased: null, totalNet: null, retailPriceWithTax: null, margin: null },

  // Muralla Café
  { sku: "", ean: "", name: "CAFÉ CALIENTE", brand: "MURALLA CAFÉ", wholesalePriceWithTax: 2350, wholesalePriceNoTax: null, netPrice: null, unitsPurchased: null, totalNet: null, retailPriceWithTax: null, margin: null },
  { sku: "", ean: "", name: "EXPRESSO", brand: "MURALLA CAFÉ", wholesalePriceWithTax: 366, wholesalePriceNoTax: null, netPrice: null, unitsPurchased: null, totalNet: null, retailPriceWithTax: 2100, margin: 83 },
  { sku: "", ean: "", name: "AMERICANO", brand: "MURALLA CAFÉ", wholesalePriceWithTax: 471, wholesalePriceNoTax: null, netPrice: null, unitsPurchased: null, totalNet: null, retailPriceWithTax: 2600, margin: 82 },
  { sku: "", ean: "", name: "EXPRESSO DOBLE", brand: "MURALLA CAFÉ", wholesalePriceWithTax: 471, wholesalePriceNoTax: null, netPrice: null, unitsPurchased: null, totalNet: null, retailPriceWithTax: 2500, margin: 81 },
];

async function importProducts(tenantId: string) {
  console.log(`Starting product import for tenant: ${tenantId}`);

  let successCount = 0;
  let errorCount = 0;

  for (const productData of products) {
    try {
      // Skip products without names
      if (!productData.name) {
        console.log(`Skipping product without name`);
        continue;
      }

      // Generate SKU if missing
      const sku = productData.sku || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const product = await prisma.product.upsert({
        where: {
          tenantId_sku: {
            tenantId,
            sku,
          },
        },
        update: {
          name: productData.name,
          ean: productData.ean || null,
          brand: productData.brand || null,
          type: 'READY_PRODUCT',
          wholesalePriceWithTax: productData.wholesalePriceWithTax || null,
          wholesalePriceNoTax: productData.wholesalePriceNoTax || null,
          netPrice: productData.netPrice || null,
          retailPriceWithTax: productData.retailPriceWithTax || null,
          margin: productData.margin || null,
          unitPrice: productData.retailPriceWithTax || productData.netPrice || 0,
          costPrice: productData.wholesalePriceNoTax || productData.netPrice || null,
          currentStock: productData.unitsPurchased || 0,
          isActive: true,
        },
        create: {
          tenantId,
          sku,
          name: productData.name,
          ean: productData.ean || null,
          brand: productData.brand || null,
          type: 'READY_PRODUCT',
          wholesalePriceWithTax: productData.wholesalePriceWithTax || null,
          wholesalePriceNoTax: productData.wholesalePriceNoTax || null,
          netPrice: productData.netPrice || null,
          retailPriceWithTax: productData.retailPriceWithTax || null,
          margin: productData.margin || null,
          unitPrice: productData.retailPriceWithTax || productData.netPrice || 0,
          costPrice: productData.wholesalePriceNoTax || productData.netPrice || null,
          currentStock: productData.unitsPurchased || 0,
          unit: 'UNIT',
          isActive: true,
        },
      });

      console.log(`✓ Imported: ${product.name} (${product.sku})`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to import ${productData.name}:`, error);
      errorCount++;
    }
  }

  console.log(`\n=== Import Summary ===`);
  console.log(`Total products: ${products.length}`);
  console.log(`Successfully imported: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

// Get tenant ID from command line or use default
const tenantId = process.argv[2];

if (!tenantId) {
  console.error('Please provide a tenant ID as an argument');
  console.error('Usage: npx tsx scripts/import-products.ts <tenantId>');
  process.exit(1);
}

importProducts(tenantId)
  .then(() => {
    console.log('\n✓ Import completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Import failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
