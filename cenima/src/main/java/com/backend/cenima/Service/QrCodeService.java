package com.backend.cenima.Service;
import com.backend.cenima.Entity.Ticket;
import com.backend.cenima.Entity.TicketQrReference;
import com.backend.cenima.Repository.TicketQrReferenceRepository;
import com.backend.cenima.DTO.ticket.QrResponse;
import com.backend.cenima.config.TicketProperties;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.google.zxing.qrcode.encoder.Encoder;
import com.google.zxing.client.j2se.MatrixToImageWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class QrCodeService {
    private final TicketQrReferenceRepository references;
    private final TicketProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    public QrCodeService(TicketQrReferenceRepository references,TicketProperties properties,Clock clock) {
        this.references=references;this.properties=properties;this.clock=clock;
    }
    @Transactional
    public QrResponse create(String jwt,Ticket ticket,long exp) {
        if (jwt==null || jwt.getBytes(StandardCharsets.UTF_8).length>properties.maxInputBytes())
            throw new TicketException(503,"PROVIDER_TOKEN_TOO_LARGE","JWT vượt giới hạn đầu vào của hệ thống");
        String content=jwt, mode="JWT";
        if (!fits(jwt)) {
            byte[] bytes=new byte[32]; random.nextBytes(bytes);
            content="etkt:"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            var ref=new TicketQrReference(); ref.setReferenceHash(hash(content)); ref.setToken(jwt); ref.setTicket(ticket); ref.setExpiresAtEpoch(exp);
            references.save(ref);
            mode="REFERENCE";
        }
        try {
            var matrix=new QRCodeWriter().encode(content,BarcodeFormat.QR_CODE,512,512,
                Map.of(EncodeHintType.ERROR_CORRECTION,ErrorCorrectionLevel.M,EncodeHintType.CHARACTER_SET,"UTF-8",EncodeHintType.MARGIN,4));
            var output=new ByteArrayOutputStream(); MatrixToImageWriter.writeToStream(matrix,"PNG",output);
            return new QrResponse(mode,content,"image/png",Base64.getEncoder().encodeToString(output.toByteArray()));
        } catch (WriterException | IOException e) { throw new TicketException(503,"QR_UNAVAILABLE","Không tạo được QR"); }
    }
    private boolean fits(String content) {
        try { return Encoder.encode(content,ErrorCorrectionLevel.M,Map.of(EncodeHintType.CHARACTER_SET,"UTF-8")).getVersion().getVersionNumber()<=properties.qrMaxVersion(); }
        catch (WriterException e) { return false; }
    }
    @Transactional(readOnly=true)
    public String resolve(String value) {
        if (!value.startsWith("etkt:")) return value;
        if (!value.matches("etkt:[A-Za-z0-9_-]{43}")) throw new TicketException(400,"REFERENCE_INVALID","Mã tham chiếu không hợp lệ");
        var ref=references.findById(hash(value)).orElseThrow(()->new TicketException(404,"REFERENCE_NOT_FOUND","Không tìm thấy mã tham chiếu"));
        if (clock.instant().getEpochSecond()>=ref.getExpiresAtEpoch()) throw new TicketException(422,"REFERENCE_EXPIRED","Tham chiếu đã hết hạn");
        return ref.getToken();
    }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException("JDK missing SHA-256",e); }
    }
}
