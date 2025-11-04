import React from 'react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { BarChart3 } from 'lucide-react';

interface Props {
  message: string;
}

const PaymentReports: React.FC<Props> = ({ message }) => {
  return (
    <AuthenticatedLayout>
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full mb-6">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes de Pagos</h1>
            <p className="text-gray-600 text-lg">{message}</p>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default PaymentReports;
