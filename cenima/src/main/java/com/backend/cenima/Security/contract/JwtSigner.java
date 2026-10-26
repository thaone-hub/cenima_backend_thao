package com.backend.cenima.Security.contract;
import java.util.Map;
public interface JwtSigner {
    String algorithm();
    String sign(Map<String, Object> claims);
}
