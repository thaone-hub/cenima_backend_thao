import React, { useState } from 'react';
import { JAVA_SOURCE_FILES } from '../data/javaCodeFiles';
import { JavaSourceFile } from '../types/crypto';
import { FileCode, Copy, Check, Folder, Download, Terminal, Search, ExternalLink } from 'lucide-react';

interface JavaCodeViewerTabProps {
  initialFilePath?: string;
}

export const JavaCodeViewerTab: React.FC<JavaCodeViewerTabProps> = ({ initialFilePath }) => {
  const [selectedFile, setSelectedFile] = useState<JavaSourceFile>(
    JAVA_SOURCE_FILES.find(f => f.path === initialFilePath) || JAVA_SOURCE_FILES[0]
  );
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const filteredFiles = JAVA_SOURCE_FILES.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    // Generate combined bundle file
    let bundle = `// =========================================================================\n`;
    bundle += `// CINEGUARD BENCHMARK & SECURITY TEST SUITE (NGƯỜI 5 - TRANG)\n`;
    bundle += `// Ngày sinh mã: ${new Date().toLocaleString()}\n`;
    bundle += `// =========================================================================\n\n`;

    for (const f of JAVA_SOURCE_FILES) {
      bundle += `// =========================================================================\n`;
      bundle += `// FILE: src/main/java/com/cineguard/${f.path}\n`;
      bundle += `// TÁC GIẢ: ${f.author} | MÔ TẢ: ${f.description}\n`;
      bundle += `// =========================================================================\n`;
      bundle += f.content + `\n\n`;
    }

    const blob = new Blob([bundle], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CineGuard_Trang_Benchmark_Suite_All_Code.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Kho Mã Nguồn Java Chuẩn Hóa (100% Runnable)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Đầy đủ các class theo sơ đồ nhóm của Trang: JMH Runner, Benchmark Tests, Security Unit Tests, Contracts & pom.xml
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 transition shadow-md shadow-amber-500/20 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{downloadSuccess ? 'Đã tải toàn bộ mã nguồn!' : 'Tải trọn bộ 10 File Java'}</span>
        </button>
      </div>

      {/* Main IDE Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left File Tree Navigator */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm file theo tên hoặc tác giả..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
            {/* Group: Trang's Benchmark */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1.5 px-2">
                <Folder className="w-3.5 h-3.5" />
                <span>benchmark/ [TRANG]</span>
              </div>
              <div className="space-y-1">
                {filteredFiles
                  .filter(f => f.category === 'benchmark')
                  .map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition ${
                        selectedFile.path === file.path
                          ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{file.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 shrink-0 font-sans">
                        Trang
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Group: Trang's Security Tests */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1.5 px-2">
                <Folder className="w-3.5 h-3.5" />
                <span>security/ [TRANG]</span>
              </div>
              <div className="space-y-1">
                {filteredFiles
                  .filter(f => f.category === 'security')
                  .map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition ${
                        selectedFile.path === file.path
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{file.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 shrink-0 font-sans">
                        Trang
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Group: Shared contracts (Thảo, Hương, Ngọc) */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5 px-2">
                <Folder className="w-3.5 h-3.5" />
                <span>contract/ [THẢO, HƯƠNG, NGỌC]</span>
              </div>
              <div className="space-y-1">
                {filteredFiles
                  .filter(f => f.category === 'shared_contract')
                  .map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition ${
                        selectedFile.path === file.path
                          ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/40'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{file.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 shrink-0 font-sans">
                        {file.author}
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Group: pom.xml */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5 px-2">
                <Folder className="w-3.5 h-3.5" />
                <span>Cấu hình dự án</span>
              </div>
              <div className="space-y-1">
                {filteredFiles
                  .filter(f => f.category === 'build_config')
                  .map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition ${
                        selectedFile.path === file.path
                          ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{file.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0 font-sans">
                        Maven
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Code Display Viewer */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Top IDE Toolbar */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs font-semibold text-white">
                src/main/java/com/cineguard/{selectedFile.path}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-sans">
                Tác giả: {selectedFile.author}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Sao chép toàn bộ mã nguồn"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép code'}</span>
              </button>

              <button
                onClick={handleDownloadSingle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Tải file này về máy"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải file</span>
              </button>
            </div>
          </div>

          {/* Description bar */}
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-xs text-slate-400">
            <strong>Mô tả chức năng:</strong> {selectedFile.description}
          </div>

          {/* Code Body with Line Numbers */}
          <div className="p-4 font-mono text-xs overflow-x-auto max-h-[580px] overflow-y-auto leading-relaxed scrollbar-thin text-slate-200">
            <pre className="whitespace-pre">
              {selectedFile.content.split('\n').map((line, idx) => (
                <div key={idx} className="table-row hover:bg-slate-900/70">
                  <span className="table-cell select-none pr-4 text-right text-slate-600 font-mono text-[11px] w-10">
                    {idx + 1}
                  </span>
                  <span className="table-cell whitespace-pre">
                    {line.startsWith('//') || line.startsWith(' *') || line.startsWith('/*') ? (
                      <span className="text-slate-500 italic">{line}</span>
                    ) : line.includes('@Benchmark') || line.includes('@Setup') || line.includes('@Param') || line.includes('@Test') ? (
                      <span className="text-amber-400 font-semibold">{line}</span>
                    ) : line.includes('public class') || line.includes('public interface') ? (
                      <span className="text-cyan-400 font-bold">{line}</span>
                    ) : line.includes('package') || line.includes('import') ? (
                      <span className="text-slate-400">{line}</span>
                    ) : line.includes('return') || line.includes('new ') || line.includes('throw ') ? (
                      <span className="text-rose-400">{line}</span>
                    ) : (
                      line
                    )}
                  </span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
