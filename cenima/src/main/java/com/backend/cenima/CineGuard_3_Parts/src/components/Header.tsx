import React from 'react';
import { ShieldCheck, Cpu, FileCode, QrCode, CheckCircle2, Download } from 'lucide-react';

interface HeaderProps {
  activeTab: 'brown_report' | 'checklist' | 'benchmark' | 'security' | 'qr' | 'code';
  setActiveTab: (tab: 'brown_report' | 'checklist' | 'benchmark' | 'security' | 'qr' | 'code') => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenExport }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 backdrop-blur shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar with Team context */}
        <div className="py-3 flex flex-wrap items-center justify-between border-b border-slate-800/80 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-700 to-[#8c593b] p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  CineGuard Lab
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Người 5 - Trang
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Tùng, Thảo, Hương, Ngọc đã xong
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Đánh giá an toàn & Benchmark hiệu năng vé điện tử: RS256, ES256, EdDSA, ML-DSA-44 (Hậu lượng tử)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('brown_report')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#8c593b] hover:bg-[#784b30] text-amber-100 hover:text-white rounded-lg transition shadow-sm"
              title="Xem 2 hình ảnh tổng kết tone nâu sáng"
            >
              <span>🖼️ 2 Ảnh Tone Nâu Sáng</span>
            </button>
            <button
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition shadow-sm"
              title="Xuất CSV/JSON theo Task 4 của Trang"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Xuất CSV / JSON</span>
            </button>
          </div>
        </div>

        {/* Tab navigation: chỉ giữ 3 phần cần dùng */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition shrink-0 ${
              activeTab === 'benchmark'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>JMH Benchmark Runner</span>
          </button>

          <button
            onClick={() => setActiveTab('brown_report')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition shrink-0 ${
              activeTab === 'brown_report'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Báo cáo &amp; Biểu đồ (kèm phân tích QR)</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition shrink-0 ${
              activeTab === 'qr'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Đánh giá khả năng quét QR</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
