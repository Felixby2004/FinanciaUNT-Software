
import { FileText, Download, CreditCard } from 'lucide-react';
import './ClientPages.css';

const Billing = ({ user }) => {
  const invoices = [
    { id: 'INV-001', date: new Date(2026, 5, 15), amount: 29.99, status: 'paid', currency: 'USD' },
    { id: 'INV-002', date: new Date(2026, 4, 15), amount: 29.99, status: 'paid', currency: 'USD' },
    { id: 'INV-003', date: new Date(2026, 3, 15), amount: 29.99, status: 'paid', currency: 'USD' },
  ];

  return (
    <div className="billing">
      <h2>Facturación y Recibos</h2>
      <div className="payment-info">
        <div className="card-info">
          <CreditCard size={32} />
          <div className="card-details">
            <p>**** **** **** 1234</p>
            <span>Visa</span>
          </div>
          <button className="change-card-btn">Cambiar método de pago</button>
        </div>
      </div>
      <div className="invoices-list">
        <h3>Historial de facturas</h3>
        {invoices.map(invoice => (
          <div key={invoice.id} className="invoice-card">
            <div className="invoice-info">
              <span className="invoice-id">{invoice.id}</span>
              <span className="invoice-date">{invoice.date.toLocaleDateString()}</span>
            </div>
            <div className="invoice-amount">
              <span>{invoice.currency} {invoice.amount.toFixed(2)}</span>
              <span className={`status-badge ${invoice.status}`}>{invoice.status === 'paid' ? 'Pagada' : 'Pendiente'}</span>
            </div>
            <button className="download-btn">
              <Download size={16} /> Descargar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Billing;
