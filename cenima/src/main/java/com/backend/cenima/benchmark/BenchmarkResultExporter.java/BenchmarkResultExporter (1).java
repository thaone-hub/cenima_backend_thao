package com.cineguard.benchmark;

import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Bộ xuất kết quả Benchmark ra file CSV & JSON
 * Phụ trách: Người 5 - Trang
 *
 * Hỗ trợ xuất dữ liệu cho Task 4: "Xuất CSV/JSON, bảng so sánh 4 thuật toán".
 */
public class BenchmarkResultExporter {

    public static class Record {
        public String algorithm;
        public double keyGenTimeMs;
        public double signingTimeUs;
        public double verifyTimeUs;
        public double throughputOpsSec;
        public int signatureSizeBytes;
        public int jwtLengthChars;

        public Record(String algorithm, double keyGenTimeMs, double signingTimeUs, double verifyTimeUs,
                      double throughputOpsSec, int signatureSizeBytes, int jwtLengthChars) {
            this.algorithm = algorithm;
            this.keyGenTimeMs = keyGenTimeMs;
            this.signingTimeUs = signingTimeUs;
            this.verifyTimeUs = verifyTimeUs;
            this.throughputOpsSec = throughputOpsSec;
            this.signatureSizeBytes = signatureSizeBytes;
            this.jwtLengthChars = jwtLengthChars;
        }
    }

    public static void exportCsv(List<Record> records, String filePath) throws IOException {
        try (PrintWriter writer = new PrintWriter(new FileWriter(filePath))) {
            writer.println("Algorithm,KeyGenTime(ms),SigningTime(us),VerifyTime(us),Throughput(ops/s),SigSize(bytes),JwtLength(chars)");
            for (Record r : records) {
                writer.printf("%s,%.3f,%.3f,%.3f,%.1f,%d,%d%n",
                        r.algorithm, r.keyGenTimeMs, r.signingTimeUs, r.verifyTimeUs,
                        r.throughputOpsSec, r.signatureSizeBytes, r.jwtLengthChars);
            }
        }
    }

    public static void exportJson(List<Record> records, String filePath) throws IOException {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("  \"benchmarkDate\": \"").append(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)).append("\",\n");
        sb.append("  \"author\": \"Trang - CineGuard Security Lab\",\n");
        sb.append("  \"environment\": \"OpenJDK 21, JMH 1.37, BouncyCastle 1.78.1, Apple M-series / Linux x86_64\",\n");
        sb.append("  \"results\": [\n");
        for (int i = 0; i < records.size(); i++) {
            Record r = records.get(i);
            sb.append(String.format("    {\n      \"algorithm\": \"%s\",\n      \"keyGenTimeMs\": %.3f,\n      \"signingTimeUs\": %.3f,\n      \"verifyTimeUs\": %.3f,\n      \"throughputOpsSec\": %.1f,\n      \"signatureSizeBytes\": %d,\n      \"jwtLengthChars\": %d\n    }",
                    r.algorithm, r.keyGenTimeMs, r.signingTimeUs, r.verifyTimeUs, r.throughputOpsSec, r.signatureSizeBytes, r.jwtLengthChars));
            if (i < records.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("  ]\n}");
        Files.writeString(Paths.get(filePath), sb.toString());
    }
}
