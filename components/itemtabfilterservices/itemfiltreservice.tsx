// components/ServiceHeader.tsx
'use client';

import { useState } from 'react';
import { Search, Calendar } from 'lucide-react';

type Tab = 'proximos' | 'pendentes' | 'historico';

export default function ItemFiltreservice() {
  const [activeTab, setActiveTab] = useState<Tab>('proximos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const tabs = [
    { id: 'proximos' as Tab, label: 'Próximos' },
    { id: 'pendentes' as Tab, label: 'Pendentes' },
    { id: 'historico' as Tab, label: 'Histórico' },
  ];

  return (
    <div className="w-full bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-emerald-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Search and Date */}
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar Serviços"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Date Picker */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}