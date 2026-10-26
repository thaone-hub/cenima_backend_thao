package com.backend.cenima.Security.adapter;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.Service.TicketException;
import java.util.*;
import org.springframework.stereotype.Component;
@Component
public class JwtProviderRegistry {
    public static final List<String> ALGORITHMS = List.of("RS256", "ES256", "EdDSA", "ML-DSA-44");
    private final Map<String, JwtSigner> signers = new HashMap<>();
    private final Map<String, JwtVerifier> verifiers = new HashMap<>();
    public JwtProviderRegistry(List<JwtSigner> s, List<JwtVerifier> v) {
        s.forEach(p -> register(signers, p.algorithm(), p));
        v.forEach(p -> register(verifiers, p.algorithm(), p));
    }
    private static <T> void register(Map<String,T> providers, String alg, T provider) {
        if (!ALGORITHMS.contains(alg) || providers.putIfAbsent(alg, provider) != null)
            throw new IllegalStateException("Unsupported or duplicate ticket provider: " + alg);
    }
    public List<Availability> algorithms() {
        return ALGORITHMS.stream().map(a -> new Availability(a, signers.containsKey(a) && verifiers.containsKey(a))).toList();
    }
    public void requireAvailable(String algorithm) {
        if (!ALGORITHMS.contains(algorithm)) throw new TicketException(400, "ALGORITHM_INVALID", "Thuật toán không được phép");
        if (!signers.containsKey(algorithm) || !verifiers.containsKey(algorithm))
            throw new TicketException(503, "ALGORITHM_UNAVAILABLE", "Thuật toán chưa có đủ signer/verifier");
    }
    public JwtSigner signer(String alg) { requireAvailable(alg); return signers.get(alg); }
    public JwtVerifier verifier(String alg) { requireAvailable(alg); return verifiers.get(alg); }
    public record Availability(String algorithm, boolean available) {}
}
