import prisma from '../src/lib/prisma';

async function main() {
  console.log('🔍 Checking raw API response for folio 12654...\n');

  const invoice = await prisma.taxDocument.findFirst({
    where: { folio: '12654' },
    select: {
      folio: true,
      receiverRUT: true,
      receiverName: true,
      rawResponse: true
    }
  });

  if (!invoice) {
    console.error('❌ Invoice not found');
    await prisma.$disconnect();
    return;
  }

  console.log('📄 Invoice folio:', invoice.folio);
  console.log('📄 Stored receiverRUT:', invoice.receiverRUT);
  console.log('📄 Stored receiverName:', invoice.receiverName);

  const raw = invoice.rawResponse as any;

  console.log('\n📦 Raw response structure:');
  console.log('  Keys:', Object.keys(raw || {}).join(', '));

  if (raw?.detailedData) {
    console.log('\n📋 detailedData present:', 'YES');
    console.log('  Keys:', Object.keys(raw.detailedData).join(', '));

    if (raw.detailedData.receiver) {
      console.log('\n✅ detailedData.receiver found:');
      console.log('  ', JSON.stringify(raw.detailedData.receiver, null, 2));
    }

    if (raw.detailedData.json) {
      console.log('\n📋 detailedData.json structure:');
      console.log('  Keys:', Object.keys(raw.detailedData.json).join(', '));

      if (raw.detailedData.json.Encabezado?.Receptor) {
        console.log('\n✅ Encabezado.Receptor found:');
        console.log('  ', JSON.stringify(raw.detailedData.json.Encabezado.Receptor, null, 2));
      }
    }
  }

  // Check if paginated response has RUTRecep
  if (raw?.RUTRecep !== undefined) {
    console.log('\n✅ RUTRecep in raw response:', raw.RUTRecep);
  } else {
    console.log('\n❌ RUTRecep NOT in paginated response (as expected)');
  }

  await prisma.$disconnect();
}

main();
