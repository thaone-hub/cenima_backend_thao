/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { BrownToneReportTab } from './components/BrownToneReportTab';
import { ChecklistTab } from './components/ChecklistTab';
import { BenchmarkTab } from './components/BenchmarkTab';
import { SecurityTestTab } from './components/SecurityTestTab';
import { QrCodeTab } from './components/QrCodeTab';
import { JavaCodeViewerTab } from './components/JavaCodeViewerTab';
import { ExportModal } from './components/ExportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'brown_report' | 'checklist' | 'benchmark' | 'security' | 'qr' | 'code'>('brown_report');
  const [selectedCodeFilePath, setSelectedCodeFilePath] = useState<string>('benchmark/SigningBenchmarkTest.java');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleSwitchToCode = (filePath: string) => {
    setSelectedCodeFilePath(filePath);
    setActiveTab('code');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'brown_report' && (
          <BrownToneReportTab
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        {activeTab === 'checklist' && (
          <ChecklistTab
            onSwitchToBenchmark={() => setActiveTab('benchmark')}
            onSwitchToCode={handleSwitchToCode}
          />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkTab
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTestTab
            onSwitchToCode={handleSwitchToCode}
          />
        )}

        {activeTab === 'qr' && (
          <QrCodeTab />
        )}

        {activeTab === 'code' && (
          <JavaCodeViewerTab
            key={selectedCodeFilePath}
            initialFilePath={selectedCodeFilePath}
          />
        )}
      </main>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-slate-900/90 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Dự án: Hệ thống Đặt vé xem phim an toàn & Chữ ký số Hậu lượng tử (CineGuard Post-Quantum Lab)
          </span>
          <span className="font-mono text-slate-400">
            Phân công: Người 5 - Trang • Đo hiệu năng, Xuất báo cáo & Biểu đồ
          </span>
        </div>
      </footer>
    </div>
  );
}
