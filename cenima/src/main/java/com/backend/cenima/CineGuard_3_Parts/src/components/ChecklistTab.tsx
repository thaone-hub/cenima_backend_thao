import React, { useState } from 'react';
import { TASK_1_CHECKLIST } from '../data/checklistData';
import { CheckCircle2, AlertTriangle, HelpCircle, Terminal, FileCode, ArrowRight, ShieldAlert, Sparkles, CheckSquare, Square } from 'lucide-react';

interface ChecklistTabProps {
  onSwitchToBenchmark: () => void;
  onSwitchToCode: (filePath: string) => void;
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({ onSwitchToBenchmark, onSwitchToCode }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    'CHK-01': true,
    'CHK-02': true,
    'CHK-03': true,
    'CHK-04': true,
    'CHK-05': true,
    'CHK-06': true,
    'CHK-07': true
  });

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / TASK_1_CHECKLIST.length) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner: Verdict & Guidance */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Thẩm định Đầu việc 1 - Người 5 (Trang)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Checklist Kiểm Tra Đầu Việc Benchmark Runner / JMH
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Yêu cầu đầu việc: <span className="text-amber-300 font-medium italic">"Tạo benchmark runner/JMH; chạy cùng payload cho RS256, ES256, EdDSA, ML-DSA-44; tách thời gian tạo khóa khỏi thời gian ký; warm-up và đo nhiều vòng."</span>
              <br />
              Dưới đây là <strong>7 tiêu chí kiểm thử tiêu chuẩn kỹ thuật (Acceptance Criteria)</strong> để xác minh mã nguồn Java đã đạt chuẩn khoa học, không bị lỗi ảo do JIT Compiler và chạy độc lập ổn định.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 min-w-[240px] flex flex-col justify-between shrink-0">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-slate-400">Tiến độ thẩm định:</span>
              <span className="text-sm font-bold text-amber-400">{completedCount}/{TASK_1_CHECKLIST.length} Tiêu chí</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-3">
              <div 
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <button
              onClick={onSwitchToBenchmark}
              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow"
            >
              <span>Chạy mô phỏng JMH</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Tasks Overview of Trang */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span>Lộ trình 4 đầu việc của Trang (Theo phân công nhóm)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-400">Đầu việc 1 (ĐANG LÀM)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">25/10 18:00</span>
            </div>
            <div className="text-xs font-semibold text-white mb-1">Xây dựng chương trình benchmark</div>
            <div className="text-[11px] text-slate-300 leading-snug">JMH Runner, cùng payload 4 thuật toán, tách KeyGen, warm-up đo nhiều vòng.</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-400">Đầu việc 2</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">26/10 22:00</span>
            </div>
            <div className="text-xs font-semibold text-slate-200 mb-1">Đo & ghi nhận hiệu năng</div>
            <div className="text-[11px] text-slate-400 leading-snug">Signing/Verify Time, JWT Size, Throughput, RAM/CPU, môi trường thử nghiệm.</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-400">Đầu việc 3</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">27/10 12:00</span>
            </div>
            <div className="text-xs font-semibold text-slate-200 mb-1">Bộ kiểm thử bảo mật</div>
            <div className="text-[11px] text-slate-400 leading-snug">Sửa payload, sai chữ ký, hết hạn, sai khóa, alg none, vé dùng rồi, race condition.</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-400">Đầu việc 4</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">27/10 18:00</span>
            </div>
            <div className="text-xs font-semibold text-slate-200 mb-1">Xuất kết quả & biểu đồ</div>
            <div className="text-[11px] text-slate-400 leading-snug">Xuất CSV/JSON, so sánh 4 thuật toán, biểu đồ thời gian/kích thước, đánh giá quét QR.</div>
          </div>
        </div>
      </div>

      {/* Detailed Checklist List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Danh sách 7 Tiêu chí Kiểm tra Chi tiết (Task 1 Audit)</span>
          </h2>
          <span className="text-xs text-slate-400">Nhấn vào từng ô để đánh dấu đã kiểm tra</span>
        </div>

        <div className="space-y-3">
          {TASK_1_CHECKLIST.map((item, idx) => {
            const isChecked = checkedItems[item.id] ?? false;
            return (
              <div 
                key={item.id}
                className={`border rounded-xl p-4 transition ${
                  isChecked 
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' 
                    : 'bg-slate-950/40 border-slate-800/60 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button 
                    onClick={() => toggleCheck(item.id)}
                    className="mt-0.5 text-amber-400 hover:text-amber-300 transition shrink-0"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                          {item.id}
                        </span>
                        <h4 className="text-sm font-semibold text-white">
                          {item.title}
                        </h4>
                      </div>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        item.isCrucial 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {item.isCrucial ? 'Bắt buộc (Critical)' : 'Khuyến nghị (Recommended)'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>Yêu cầu cốt lõi:</strong> {item.requirement}
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-amber-400 font-medium block mb-1">⚙️ Cơ chế JMH cần áp dụng:</span>
                        <code className="text-emerald-300 font-mono text-[11px] block whitespace-pre-wrap">
                          {item.jmhMechanism}
                        </code>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-cyan-400 font-medium block mb-1">🔍 Cách test xem đã chuẩn chưa:</span>
                        <span className="text-slate-300 text-[11px] block">
                          {item.verificationTip}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-end">
                      <button
                        onClick={() => onSwitchToCode('benchmark/SigningBenchmarkTest.java')}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium hover:underline"
                      >
                        <FileCode className="w-3 h-3" />
                        <span>Xem cài đặt trong SigningBenchmarkTest.java</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Command Guide */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Hướng dẫn dòng lệnh chạy và kiểm tra trực tiếp trên máy của Trang</span>
        </h3>
        <p className="text-xs text-slate-400">
          Sau khi lưu các file Java vào project Maven, Trang chạy 3 lệnh sau để kiểm tra xem bài làm chạy ổn chưa:
        </p>

        <div className="space-y-2 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-500"># Bước 1: Chạy toàn bộ 7 Security Unit Tests trước</span>
            <div className="text-amber-300 font-semibold mt-1">mvn clean test</div>
            <div className="text-[11px] text-slate-400 mt-1">→ Đảm bảo tất cả 7 kịch bản (tampered, expired, wrong key, replay...) đều pass 100%.</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-500"># Bước 2: Đóng gói JMH Uber Jar độc lập</span>
            <div className="text-amber-300 font-semibold mt-1">mvn clean package -DskipTests</div>
            <div className="text-[11px] text-slate-400 mt-1">→ Maven Shade Plugin sẽ tự động đóng gói file target/benchmarks.jar.</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-500"># Bước 3: Chạy JMH Benchmark với JVM độc lập</span>
            <div className="text-emerald-400 font-semibold mt-1">
              java -jar target/benchmarks.jar BenchmarkRunner -wi 3 -i 5 -f 1 -rf json -rff target/benchmark-result.json
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              → Lệnh này thực hiện đúng yêu cầu: Warm-up 3 vòng (-wi 3), đo 5 vòng (-i 5), 1 Fork độc lập (-f 1), xuất kết quả ra file JSON.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
