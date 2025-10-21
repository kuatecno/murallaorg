import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Products from the spreadsheet
// Only input: sku, ean, name, brand, wholesalePrice (no tax), retailPrice (with tax), stock
const products = [
  // Muffins - Mis Amigos Veganos
  { sku: "200 MAV MUF-ZA 8", ean: "658325668155", name: "Muffin zanahoria", brand: "Mis Amigos Veganos", wholesalePrice: 1160, retailPrice: 2300, stock: 0 },
  { sku: "200 MAV MUF-JI 8", ean: "658325668162", name: "Muffin de jengibre individual", brand: "Mis Amigos Veganos", wholesalePrice: 1160, retailPrice: 2300, stock: 0 },
  { sku: "200 MAV MUF-AR 8", ean: "658325668162", name: "Muffin arándanos", brand: "Mis Amigos Veganos", wholesalePrice: 1590, retailPrice: 2700, stock: 0 },
  { sku: "200 MAV HEL MM 8", ean: "781159074011", name: "Helado Mango maracuyá individual", brand: "Mis Amigos Veganos", wholesalePrice: 1590, retailPrice: 2700, stock: 0 },
  { sku: "200 MAV HEL FB 8", ean: "781159073991", name: "Helados frutos del bosque individual", brand: "Mis Amigos Veganos", wholesalePrice: 1590, retailPrice: 2700, stock: 3 },
  { sku: "200 MAV HEL CC 8", ean: "781159074035", name: "Helado Cookies and cream individual", brand: "Mis Amigos Veganos", wholesalePrice: 1590, retailPrice: 2700, stock: 3 },
  { sku: "200 MAV ROLL CAN 8", ean: "", name: "Roll de canela", brand: "Mis Amigos Veganos", wholesalePrice: 983, retailPrice: 2000, stock: 0 },
  { sku: "200 MAV MUF CHCH 8", ean: "658325668179", name: "Muffin chips de chocolate", brand: "Mis Amigos Veganos", wholesalePrice: 1160, retailPrice: 2300, stock: 8 },

  // Brisnacks
  { sku: "BNK-PACK-AZUCAR", ean: "", name: "PACK GALLETAS DE AZUCAR BRISNACKS", brand: "Brisnacks", wholesalePrice: 500, retailPrice: null, stock: 0 },
  { sku: "100 BNK ALF MCC 9", ean: "661787073870", name: "ALFAJOR MANJAR COCO SIN AZUCAR", brand: "Brisnacks", wholesalePrice: 517, retailPrice: 1000, stock: 15 },
  { sku: "100 BNK ALF CHOC 9", ean: "661787073887", name: "ALFAJOR CHOCOLATE SIN AZUCAR", brand: "Brisnacks", wholesalePrice: 500, retailPrice: 1000, stock: 15 },
  { sku: "100 BNK ALF VAN 9", ean: "661787073894", name: "ALFAJOR VAINILLA SIN AZUCAR", brand: "Brisnacks", wholesalePrice: 500, retailPrice: 1000, stock: 15 },
  { sku: "100 BNK GALL BER 9", ean: "764451928367", name: "GALLETO BERRIES SIN AZUCAR", brand: "Brisnacks", wholesalePrice: 500, retailPrice: 1000, stock: 20 },
  { sku: "100 BNK GACO VAI 9", ean: "764451928343", name: "GALLETA VAINILLA SIN AZUCAR", brand: "Brisnacks", wholesalePrice: 500, retailPrice: 1000, stock: 12 },
  { sku: "100 BNK DEL FRCH 9", ean: "701156311676", name: "DELICIA FRAMBUESA CHOCOLATE SIN AZUCAR", brand: "Brisnacks", wholesalePrice: 500, retailPrice: 1000, stock: 15 },
  { sku: "100 BNK GALL CHOC 9", ean: "764451928374", name: "GALLETO CHOCOLATE SIN AZUCAR", brand: "Brisnacks", wholesalePrice: 500, retailPrice: 1000, stock: 20 },
  { sku: "100 BNK GACO CHOC 9", ean: "709450180365", name: "GALLETA CHOCOLATE SIN AZUCAR", brand: "Brisnacks", wholesalePrice: 500, retailPrice: 1000, stock: 12 },
  { sku: "100 SMT MTQ MN 08", ean: "979173538303", name: "Mantequilla (pasta) de maní original 150 g", brand: "Smuller", wholesalePrice: 1890, retailPrice: 3200, stock: 24 },

  // Dr Kombu Kombucha
  { sku: "100 DKK KBCH ORI", ean: "737186382759", name: "DR KOMBU CAJA BEBIDA ACIDA DE 4 SABORES (3 BOTELLAS DE CADA SABOR) 475ML", brand: "Dr Kombu Kombucha", wholesalePrice: 1764, retailPrice: null, stock: 24 },
  { sku: "100 DKK KBCH MZN", ean: "737186382766", name: "MANZANA GENGIBRE", brand: "Dr Kombu Kombucha", wholesalePrice: 1764, retailPrice: 3000, stock: 6 },
  { sku: "100 DKK KBCH FRE", ean: "737186382773", name: "MANGO FRESA", brand: "Dr Kombu Kombucha", wholesalePrice: 1764, retailPrice: 3000, stock: 6 },
  { sku: "100 DKK KBCH MXBR", ean: "737186382773", name: "MIX BERRIES", brand: "Dr Kombu Kombucha", wholesalePrice: 1764, retailPrice: 3000, stock: 6 },

  // Agua Esencial
  { sku: "100 AESC AG QMAG", ean: "671875637186", name: "Botella Agua Esencial Magnesio 500cc c/gas", brand: "Agua Esencial", wholesalePrice: 385, retailPrice: null, stock: 72 },
  { sku: "100 AESC AGBI SGMAG", ean: "614437826997", name: "Botella Agua Esencial Magnesio 10 lt s/gas", brand: "Agua Esencial", wholesalePrice: 1550, retailPrice: null, stock: 5 },
  { sku: "100 AESC AG SGMAG", ean: "671875637169", name: "Botella Agua Esencial Magnesio 500cc s/gas", brand: "Agua Esencial", wholesalePrice: 385, retailPrice: 1200, stock: 36 },
  { sku: "100 AMZC ELCT MCY", ean: "780467680544", name: "Electrólitos Caja Display 30 Sticks - Sabor Maracuyá", brand: "Amazing Care", wholesalePrice: 12605, retailPrice: null, stock: 3 },

  // Comida en Frasco
  { sku: "100 CMFR ALCON GLNTJ", ean: "", name: "GUISO DE LENTEJAS CON ARROZ", brand: "Comida en Frasco", wholesalePrice: 3151, retailPrice: 5000, stock: 1 },
  { sku: "100 CMFR ALCON CPUER", ean: "", name: "CREMA DE PUERRO | VICHYSSOISE", brand: "Comida en Frasco", wholesalePrice: 3782, retailPrice: 6000, stock: 1 },
  { sku: "100 CMFR ALCON CPZAP", ean: "", name: "CREMA DE ZAPALLO", brand: "Comida en Frasco", wholesalePrice: 3151, retailPrice: 5000, stock: 1 },
  { sku: "100 CMFR ALCON AJGLN", ean: "", name: "AJI DE GALLINA POLLO TROZO", brand: "Comida en Frasco", wholesalePrice: 5357, retailPrice: 8500, stock: 2 },
  { sku: "100 CMFR ALCON ANTPA", ean: "", name: "ANTIPASTO DE BERENJENA", brand: "Comida en Frasco", wholesalePrice: 4097, retailPrice: 6500, stock: 1 },
  { sku: "100 CMFR ALCON RECA", ean: "", name: "CARNE DE RECETA LIVIANA", brand: "Comida en Frasco", wholesalePrice: 3151, retailPrice: 5000, stock: 2 },
  { sku: "100 CMFR ALCON PIMASL", ean: "", name: "PIMIENTOS ASADOS DE AJILLO", brand: "Comida en Frasco", wholesalePrice: 2731, retailPrice: 5000, stock: 1 },
  { sku: "100 CMFR ALCON PRIXI", ean: "", name: "GUISO ANEXPLAIN MORRÓN", brand: "Comida en Frasco", wholesalePrice: 3151, retailPrice: 5000, stock: 1 },
  { sku: "100 CMFR ALCON PRT", ean: "", name: "PORTOS RECETA TRADICIONAL", brand: "Comida en Frasco", wholesalePrice: 3151, retailPrice: 5000, stock: 1 },
  { sku: "100 CMFR ALCON TMTBRJ", ean: "", name: "SALSA DE TOMATE Y TUCO CON BERENJENAS", brand: "Comida en Frasco", wholesalePrice: 4097, retailPrice: 6500, stock: 1 },

  // Super Human Foods
  { sku: "100 SHF BR BROR", ean: "781176605569", name: "Barra Sabor Berry Original", brand: "Super Human Foods", wholesalePrice: 819, retailPrice: 1500, stock: 20 },
  { sku: "100 SHF BR MNCHOC", ean: "780466920561", name: "Barra Sabor Mani Chocolate", brand: "Super Human Foods", wholesalePrice: 819, retailPrice: 1500, stock: 20 },

  // Binatur - Aguas
  { sku: "100 BNTR AGCH KW 9", ean: "8935048614952", name: "AGUA DE CHIA KIWI", brand: "BINATUR", wholesalePrice: 810, retailPrice: 1700, stock: 6 },
  { sku: "100 BNTR AGCH PN 9", ean: "8935048614983", name: "AGUA DE CHIA PIÑA", brand: "BINATUR", wholesalePrice: 810, retailPrice: 1700, stock: 6 },
  { sku: "100 BNTR AGCH MIX 9", ean: "8935048614969", name: "AGUA DE CHIA MIX BERRIES", brand: "BINATUR", wholesalePrice: 810, retailPrice: 1700, stock: 6 },
  { sku: "100 BNTR AGCH FRT 9", ean: "8935048614969", name: "AGUA DE CHIA FRUTILLA", brand: "BINATUR", wholesalePrice: 810, retailPrice: 1700, stock: 6 },
  { sku: "100 BNTR AGCH MNG 9", ean: "8935048614976", name: "AGUA DE CHIA MANGO", brand: "BINATUR", wholesalePrice: 810, retailPrice: 1700, stock: 6 },

  // Benedictino/Submarino
  { sku: "100 BNDT AG SG", ean: "780282041000", name: "AGUA BENEDICTINO SIN GAS", brand: "BENDICTINO", wholesalePrice: 332, retailPrice: 1000, stock: 12 },
  { sku: "100 BNDT AG GSE", ean: "780282044123", name: "AGUA SUBMARINO CON GAS", brand: "SUBMARINO", wholesalePrice: 332, retailPrice: 1000, stock: 12 },

  // Sole Snikers / AM Chocolates
  { sku: "300 SSNK SNK SNUS 8", ean: "", name: "SNIKERS VEGANO", brand: "SOLE SNIKERS", wholesalePrice: 810, retailPrice: 2000, stock: 24 },
  { sku: "300 ANCH CHSUB LCH", ean: "", name: "CHOCOLATE SUBMARINO LECHE", brand: "AM CHOCOLATES", wholesalePrice: 1639, retailPrice: 3000, stock: 4 },
  { sku: "300 ANCH CHSUB AMG", ean: "", name: "CHOCOLATE SUBMARINO AMARGO", brand: "AM CHOCOLATES", wholesalePrice: 1639, retailPrice: 3000, stock: 5 },

  // Muralla Café
  { sku: "CAFE-EXPRESSO", ean: "", name: "EXPRESSO", brand: "MURALLA CAFÉ", wholesalePrice: 366, retailPrice: 2100, stock: 0 },
  { sku: "CAFE-AMERICANO", ean: "", name: "AMERICANO", brand: "MURALLA CAFÉ", wholesalePrice: 471, retailPrice: 2600, stock: 0 },
  { sku: "CAFE-EXPRESSO-DOBLE", ean: "", name: "EXPRESSO DOBLE", brand: "MURALLA CAFÉ", wholesalePrice: 471, retailPrice: 2500, stock: 0 },
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
          wholesalePrice: productData.wholesalePrice || null,
          retailPrice: productData.retailPrice || null,
          unitPrice: productData.retailPrice || productData.wholesalePrice || 0,
          costPrice: productData.wholesalePrice || null,
          currentStock: productData.stock || 0,
          isActive: true,
        },
        create: {
          tenantId,
          sku,
          name: productData.name,
          ean: productData.ean || null,
          brand: productData.brand || null,
          type: 'READY_PRODUCT',
          wholesalePrice: productData.wholesalePrice || null,
          retailPrice: productData.retailPrice || null,
          unitPrice: productData.retailPrice || productData.wholesalePrice || 0,
          costPrice: productData.wholesalePrice || null,
          currentStock: productData.stock || 0,
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
