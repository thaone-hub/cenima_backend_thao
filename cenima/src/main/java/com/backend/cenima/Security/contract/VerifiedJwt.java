package com.backend.cenima.Security.contract;
import java.util.Map;
public record VerifiedJwt(String algorithm, String keyId, String type, Map<String, Object> claims) {}
