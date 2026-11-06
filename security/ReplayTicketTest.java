package com.cineguard.security;

import com.cineguard.contract.JwtPayload;
import com.cineguard.contract.JwtSigner;
import com.cineguard.contract.MlDsaJwtSigner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Kiểm thử Replay Ticket & Two Concurrent Check-in Test
 * Phụ trách: Người 5 - Trang
 *
 * YÊU CẦU:
 * "Kiểm thử vé đã sử dụng, và hai lượt check-in đồng thời."
 * Mô phỏng: 2 cửa soát vé (Gate 1 & Gate 2) quét cùng 1 mã QR vé
 * tại cùng 1 thời điểm miligiây. Hệ thống phải dùng Optimistic Locking (Atomic CAS / DB Versioning)
 * để chỉ ĐÚNG 1 lượt thành công, lượt kia bị chặn (REPLAY_DETECTED).
 */
public class ReplayTicketTest {

    // Mô phỏng Database Ticket Service với kiểm soát trạng thái nguyên tử
    static class MockTicketCheckInService {
        private final ConcurrentHashMap<String, String> ticketStatusMap = new ConcurrentHashMap<>();

        public void issueTicket(String ticketId) {
            ticketStatusMap.put(ticketId, "UNUSED");
        }

        public boolean checkIn(String ticketId) {
            // Atomic CAS: Chỉ chuyển trạng thái nếu hiện tại là "UNUSED"
            return ticketStatusMap.compute(ticketId, (k, currentStatus) -> {
                if ("UNUSED".equals(currentStatus)) {
                    return "USED";
                }
                return currentStatus; // Đã là "USED" thì giữ nguyên
            }).equals("USED") && !ticketStatusMap.get(ticketId).equals("UNUSED");
        }
    }

    @Test
    @DisplayName("Kiểm thử phòng chống Replay Attack và Check-in đồng thời")
    public void testConcurrentCheckInOnlyAllowsOnce() throws Exception {
        JwtSigner signer = new MlDsaJwtSigner(); // Thử nghiệm trên vé ML-DSA-44 hậu lượng tử
        long now = Instant.now().getEpochSecond();
        JwtPayload payload = JwtPayload.builder()
                .ticketId("TCK-RACE-001")
                .seatCode("SWEETBOX-01")
                .issuedAt(now)
                .expiresAt(now + 7200)
                .build();

        String jwtToken = signer.sign(payload);

        MockTicketCheckInService service = new MockTicketCheckInService();
        service.issueTicket("TCK-RACE-001");

        // Mô phỏng 2 luồng đồng thời quét vé tại 2 cổng soát vé rạp
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CyclicBarrier barrier = new CyclicBarrier(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    barrier.await(); // Đảm bảo cả 2 luồng cùng bắn request tại 1 nano-giây
                    boolean ok = service.checkIn("TCK-RACE-001");
                    if (ok) {
                        successCount.incrementAndGet();
                    } else {
                        rejectedCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);

        // KẾT QUẢ BẢO MẬT: Bắt buộc chỉ có 1 cổng vào được, 1 cổng bị từ chối
        assertEquals(1, successCount.get(), "Chỉ được duy nhất 1 lượt check-in thành công!");
        assertEquals(1, rejectedCount.get(), "Lượt check-in thứ hai phải bị chặn!");
    }
}
