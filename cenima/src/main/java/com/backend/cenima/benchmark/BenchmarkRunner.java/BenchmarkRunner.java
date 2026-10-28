package com.cineguard.benchmark;

import org.openjdk.jmh.results.format.ResultFormatType;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.RunnerException;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;

/**
 * Khởi chạy JMH Benchmark toàn diện
 * Phụ trách: Người 5 - Trang
 *
 * Chạy dòng lệnh:
 * mvn clean package
 * java -jar target/benchmarks.jar BenchmarkRunner
 */
public class BenchmarkRunner {

    public static void main(String[] args) throws RunnerException {
        System.out.println("=================================================================");
        System.out.println("🚀 CINEGUARD POST-QUANTUM BENCHMARK RUNNER (Người 5 - Trang)");
        System.out.println("Thuật toán: RS256, ES256, EdDSA, ML-DSA-44 (FIPS 204)");
        System.out.println("Tách riêng: Key Generation vs Signing Time");
        System.out.println("=================================================================");

        Options opt = new OptionsBuilder()
                .include(SigningBenchmarkTest.class.getSimpleName())
                .include(VerificationBenchmarkTest.class.getSimpleName())
                .warmupIterations(3)
                .measurementIterations(5)
                .forks(1)
                .resultFormat(ResultFormatType.JSON)
                .result("target/jmh-result.json")
                .build();

        new Runner(opt).run();
    }
}
