import { redirect } from 'next/navigation'

async function getInvoices() {
  try {
    const response = await fetch('http://localhost:3002/api/documents/received', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page: 1 })
    })

    if (response.ok) {
      const data = await response.json()
      return data
    }
    return null
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

export default async function TestInvoicesPage() {
  const data = await getInvoices()

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Failed to fetch invoices</h1>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Invoices - Server Side</h1>
      <p className="mb-4">Found {data.documents?.length || 0} documents</p>
      <p className="mb-4">Total: {data.summary?.totalDocuments || 0} documents worth ${data.summary?.totalAmount?.toLocaleString('es-CL') || 0}</p>

      <div className="space-y-2">
        {(data.documents || []).slice(0, 5).map((doc: any) => (
          <div key={doc.id} className="border p-3 rounded">
            <p><strong>Folio:</strong> {doc.folio}</p>
            <p><strong>Type:</strong> {doc.tipoDocumentoNombre}</p>
            <p><strong>Amount:</strong> ${doc.montos.total.toLocaleString('es-CL')}</p>
            <p><strong>Issuer:</strong> {doc.razonSocialEmisor}</p>
          </div>
        ))}
      </div>
    </div>
  )
}