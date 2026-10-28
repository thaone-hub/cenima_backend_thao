import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { AlgorithmType, TicketPayload } from '../types/crypto';
import { ALGORITHM_DEFINITIONS } from '../data/checklistData';
import { DEFAULT_SAMPLE_PAYLOAD, generateSampleJwtToken } from '../utils/benchmarkEngine';
import { QrCode, Smartphone, Eye, AlertTriangle, CheckCircle2, ShieldCheck, Sparkles, ZoomIn } from 'lucide-react';

export const QrCodeTab: React.FC = () => {
  const [selectedAlg, setSelectedAlg] = useState<AlgorithmType>('ML-DSA-44');
  const [payload] = useState<TicketPayload>(DEFAULT_SAMPLE_PAYLOAD);
  const [qrImages, setQrImages] = useState<Record<AlgorithmType, string>>({
    'RS256': '',
    'ES256': '',
    'EdDSA': '',
    'ML-DSA-44': ''
  });
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    const generateAllQrs = async () => {
      const newImages: Record<string, string> = {};
      const newErrors: Record<string, string> = {};

      for (const alg of ['RS256', 'ES256', 'EdDSA', 'ML-DSA-44'] as AlgorithmType[]) {
        try {
          const { token } = generateSampleJwtToken(alg, payload);
          // For ML-DSA, large payloads need higher error correction or lower density mode to fit
          const url = await QRCode.toDataURL(token, {
            errorCorrectionLevel: alg === 'ML-DSA-44' ? 'L' : 'M',
            margin: 2,
            width: 320,
            color: {
              dark: alg === 'ML-DSA-44' ? '#0f172a' : '#020617',
              light: '#ffffff'
            }
          });
          newImages[alg] = url;
        } catch (err: any) {
          console.error(`QR generation error for ${alg}:`, err);
          newErrors[alg] = err?.message || 'Token quá lớn cho chuẩn QR tiêu chuẩn';
        }
      }

      setQrImages(prev => ({ ...prev, ...(newImages as Record<AlgorithmType, string>) }));
      setErrorMessages(newErrors);
    };

    generateAllQrs();
  }, [payload]);

  const activeAlgDef = ALGORITHM_DEFINITIONS.find(a => a.id === selectedAlg) || ALGORITHM_DEFINITIONS[3];
  const { token, sigBytes } = generateSampleJwtToken(selectedAlg, payload);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Đánh giá Khả năng Quét Mã QR Vé Xem Phim (Task 4)</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Nghiệm thu thực nghiệm: So sánh trực quan mật độ ma trận điểm QR giữa chữ ký truyền thống (ES256, EdDSA, RS256) và chữ ký hậu lượng tử ML-DSA-44 (Dilithium) tại cửa soát vé.
            </p>
          </div>

          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
            {(['RS256', 'ES256', 'EdDSA', 'ML-DSA-44'] as AlgorithmType[]).map(alg => (
              <button
                key={alg}
                onClick={() => setSelectedAlg(alg)}
                className={`px-3 py-1.5 rounded-lg transition font-bold ${
                  selectedAlg === alg
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {alg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Side by side comparison cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QR Visualizer Display */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-between text-center">
          <div className="w-full">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeAlgDef.color }} />
                {activeAlgDef.name}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">{token.length.toLocaleString()} ký tự</span>
            </div>

            {/* Simulated Phone Ticket Card */}
            <div className="bg-white rounded-2xl p-4 shadow-2xl border-4 border-slate-800 max-w-[280px] mx-auto text-slate-900">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                CINEGUARD E-TICKET
              </div>
              <div className="font-bold text-xs truncate mb-2 text-slate-900">
                {payload.movieTitle}
              </div>

              {/* QR Image */}
              <div className="bg-slate-50 p-2 rounded-xl flex items-center justify-center border border-slate-200 aspect-square min-h-[220px]">
                {qrImages[selectedAlg] ? (
                  <img
                    src={qrImages[selectedAlg]}
                    alt={`Mã QR ${selectedAlg}`}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                ) : (
                  <div className="text-xs text-rose-500 p-2">
                    {errorMessages[selectedAlg] || 'Đang tạo mã QR...'}
                  </div>
                )}
              </div>

              <div className="mt-2 text-[10px] text-slate-600 font-mono flex justify-between border-t border-slate-200 pt-1.5">
                <span>Ghế: <strong>{payload.seatCode}</strong></span>
                <span>{payload.ticketId}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-around text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Chữ ký:</span>
              <span className="font-mono font-bold text-amber-400">{sigBytes.toLocaleString()} bytes</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Mật độ QR:</span>
              <span className="font-medium text-slate-200">{activeAlgDef.qrDensityLevel}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Khả năng quét:</span>
              <span className={`font-semibold ${selectedAlg === 'ML-DSA-44' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {selectedAlg === 'ML-DSA-44' ? 'Cần máy quét 2D HD' : 'Quét tức thì (<0.2s)'}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Engineering Analysis */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Phân tích kỹ thuật & Đề xuất kiến trúc cho nhóm
            </span>
            <h3 className="text-base font-bold text-white mt-1">
              Bài toán đánh đổi (Trade-off): An toàn Hậu lượng tử vs Trải nghiệm quét vé tại rạp
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Chữ ký truyền thống (ES256 / EdDSA):</span>
              </span>
              <p className="text-slate-400">
                Chữ ký cực kỳ nhỏ gọn (64 bytes). Tổng chuỗi JWT chỉ khoảng 350-390 ký tự, sinh ra mã QR Version 7-8 với các ô vuông rất to và thưa. Bất kỳ camera smartphone giá rẻ hoặc ánh sáng phòng vé yếu đều quét được trong chớp mắt (&lt; 150ms).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Chữ ký Hậu lượng tử ML-DSA-44 (Dilithium 2):</span>
              </span>
              <p className="text-slate-300">
                ML-DSA-44 an toàn tuyệt đối trước máy tính lượng tử, tuy nhiên kích thước chữ ký là <strong>2,420 bytes</strong>. Khi mã hóa JWT đầy đủ, chuỗi token dài tới <strong>~3,450 ký tự</strong>. Để nén chuỗi này vào QR, mã QR phải dùng tới Version 28-32 (ma trận hơn 130x130 điểm cực kỳ dày đặc). Màn hình điện thoại bị xước hoặc camera quét góc nghiêng sẽ khó nhận diện.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Giải pháp kiến trúc tối ưu cho Ngọc và Tùng (Được đề xuất bởi Trang):</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>
                  <strong className="text-slate-200">Mô hình Hybrid 1 (Reference Ticket):</strong> QR code trên vé của khách hàng chỉ chứa <em>Ticket ID ngắn + Signature Hash</em> (~120 chars, quét siêu nhanh). Thiết bị cổng soát vé rạp tải JWT ML-DSA-44 đầy đủ từ Edge Server qua mTLS an toàn hậu lượng tử để xác thực.
                </li>
                <li>
                  <strong className="text-slate-200">Mô hình Hybrid 2 (Offline Standalone):</strong> Nếu rạp mất mạng (yêu cầu Offline Verification), trang bị đầu đọc mã vạch 2D công nghiệp chuyên dụng (Honeywell/Zebra có cảm biến phân giải cao &gt; 1 Megapixel) để quét trực tiếp mã QR dày của ML-DSA-44.
                </li>
              </ul>
            </div>
          </div>

          {/* Token String Preview */}
          <div className="pt-2">
            <span className="text-slate-400 text-xs block mb-1 font-medium">Chuỗi Token JWT thực tế ({selectedAlg}):</span>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-amber-300/90 break-all max-h-24 overflow-y-auto">
              {token}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
