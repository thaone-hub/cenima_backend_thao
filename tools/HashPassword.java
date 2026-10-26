import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** Java 21 source launcher utility; reads a secret from the environment, never command-line args. */
class HashPassword {
    public static void main(String[] args) {
        String password=System.getenv("CINEMA_PASSWORD_TO_HASH");
        if (password==null || password.length()<12) throw new IllegalArgumentException("Set CINEMA_PASSWORD_TO_HASH to a local password of at least 12 characters");
        System.out.print(new BCryptPasswordEncoder().encode(password));
    }
}
