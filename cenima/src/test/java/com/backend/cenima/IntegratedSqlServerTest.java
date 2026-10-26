package com.backend.cenima;

import com.backend.cenima.Entity.*;
import com.backend.cenima.Repository.*;
import com.backend.cenima.DTO.CreateBookingRequest;
import com.backend.cenima.Service.*;
import com.backend.cenima.config.TicketProperties;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.nio.file.*;
import java.net.ServerSocket;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles(value="integrated",inheritProfiles=false)
@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named="TEST_DB_URL",matches=".*databaseName=CINEMA_THAO_ETICKET_TEST(?:;.*)?")
class IntegratedSqlServerTest extends SqlServerTestSupport {
    @Value("${local.server.port}") int port;
    @Autowired UserRepository users; @Autowired RoleRepository roles;
    @Autowired ShowtimeRepository showtimes; @Autowired SeatRepository seats;
    @Autowired TicketRepository tickets; @Autowired TicketQrReferenceRepository references;
    @Autowired BookingService bookings; @Autowired PasswordEncoder passwords;
    @Autowired PlatformTransactionManager transactions; @Autowired JdbcTemplate jdbc;
    private final JsonMapper json=JsonMapper.builder().build();
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final List<Integer> userIds=new ArrayList<>();
    private Integer showtimeId,ticketId,ownerId,otherId,seatId;
    private long expiration;
    private String ownerEmail,staffEmail,password,ownerAccess,ownerRefresh,staffAccess,adminAccess,otherAccess;
    @TempDir Path restartDirectory;
    record Response(int status,JsonNode body,HttpHeaders headers) {}

    @BeforeEach void fixture() {
        password=UUID.randomUUID().toString();
        var emails=new HashMap<String,String>();
        new TransactionTemplate(transactions).executeWithoutResult(tx->{
            for (String key:List.of("owner","other","staff","admin")) {
                String role=key.equals("staff")?"STAFF":key.equals("admin")?"ADMIN":"CUSTOMER";
                String email=key+"-"+UUID.randomUUID()+"@integration.test";emails.put(key,email);
                var user=new User();user.setEmail(email);user.setFullName("Integration "+key);user.setPasswordHash(passwords.encode(password));
                user.setRole(roles.findByRoleName(role).orElseThrow());user.setIsActive(true);users.saveAndFlush(user);userIds.add(user.getId());
                if (key.equals("owner")) { ownerId=user.getId();ownerEmail=email; }
                if (key.equals("other")) otherId=user.getId();
            }
            var original=showtimes.findAll().getFirst();var show=new Showtime();show.setMovie(original.getMovie());show.setRoom(original.getRoom());show.setPrice(original.getPrice());
            show.setStartTime(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(3).withNano(0));showtimes.saveAndFlush(show);showtimeId=show.getId();
            expiration=show.getStartTime().plusMinutes(show.getMovie().getDuration()).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toEpochSecond();
            seatId=seats.findByRoom_IdOrderByRowNameAscSeatNumberAsc(show.getRoom().getId()).getFirst().getId();
            ticketId=bookings.createBooking(ownerId,new CreateBookingRequest(showtimeId,List.of(seatId))).tickets().getFirst().ticketId();
        });
        var owner=login(emails.get("owner"));ownerAccess=owner.get("accessToken").asString();ownerRefresh=owner.get("refreshToken").asString();
        staffEmail=emails.get("staff");staffAccess=login(staffEmail).get("accessToken").asString();
        adminAccess=login(emails.get("admin")).get("accessToken").asString();
        otherAccess=login(emails.get("other")).get("accessToken").asString();
    }
    @AfterEach void cleanupOnlyOwnFixtures() {
        new TransactionTemplate(transactions).executeWithoutResult(tx->{
            if (showtimeId!=null) {
                jdbc.update("DELETE r FROM TicketQrReferences r JOIN Tickets t ON t.TicketID=r.TicketID WHERE t.ShowtimeID=?",showtimeId);
                jdbc.update("DELETE Tickets WHERE ShowtimeID=?",showtimeId);
                jdbc.update("DELETE d FROM BookingDetails d JOIN Bookings b ON b.BookingID=d.BookingID WHERE b.ShowtimeID=?",showtimeId);
                jdbc.update("DELETE Bookings WHERE ShowtimeID=?",showtimeId);jdbc.update("DELETE Showtimes WHERE ShowtimeID=?",showtimeId);
            }
            for (Integer id:userIds) { jdbc.update("DELETE RefreshTokens WHERE UserID=?",id);jdbc.update("DELETE Users WHERE UserID=?",id); }
        });
    }
    Response request(String method,String path,String access,Object body) { return request(method,path,access,body,null); }
    Response request(String method,String path,String access,Object body,Integer spoofedId) {
        try {
            var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(20)).header("Accept","application/json");
            if (access!=null) builder.header("Authorization","Bearer "+access);
            if (spoofedId!=null) builder.header("X-User-Id",spoofedId.toString());
            if (body!=null) builder.header("Content-Type","application/json");
            builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
            var response=http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
            var data=response.body().isBlank()?null:json.readTree(response.body());
            return new Response(response.statusCode(),data,response.headers());
        } catch (Exception e) { throw new IllegalStateException("HTTP integration request failed",e); }
    }
    JsonNode login(String email) {
        var response=request("POST","/api/auth/login",null,Map.of("email",email,"password",password));
        assertThat(response.status()).isEqualTo(200);return response.body();
    }
    Response issue(String algorithm,String access) { return request("POST","/api/tickets/"+ticketId+"/token",access,Map.of("algorithm",algorithm)); }
    Response verify(String token) { return request("POST","/api/tickets/verify",staffAccess,Map.of("value",token)); }
    Response checkIn(String token) { return request("POST","/api/tickets/check-in",staffAccess,Map.of("value",token)); }

    @ParameterizedTest @ValueSource(strings={"RS256","ES256","EdDSA"})
    void actualAlgorithmIssueQrVerifyCheckInAndReplay(String algorithm) throws Exception {
        var response=issue(algorithm,ownerAccess);assertThat(response.status()).isEqualTo(200);
        var data=response.body();String token=data.get("token").asString();
        assertThat(SignedJWT.parse(token).getHeader().getType().toString()).isEqualTo("eticket+jwt");
        assertThat(SignedJWT.parse(token).getHeader().getAlgorithm().getName()).isEqualTo(algorithm);
        assertThat(data.get("qr").get("mode").asString()).isEqualTo("JWT");
        assertThat(Instant.parse(data.get("expiresAt").asString()).getEpochSecond()).isEqualTo(expiration);
        assertThat(response.headers().firstValue("Cache-Control")).contains("no-store");
        assertThat(issue(algorithm,ownerAccess).body().get("expiresAt").asString()).isEqualTo(data.get("expiresAt").asString());
        assertThat(verify(token).body().get("checkedIn").asBoolean()).isFalse();
        assertThat(verify(token).body().get("checkedIn").asBoolean()).isFalse();
        assertThat(checkIn(token).status()).isEqualTo(200);assertThat(checkIn(token).status()).isEqualTo(409);
    }
    @Test void authenticationApiKeepsLoginRefreshLogoutAndRejectsInvalidPassword() {
        assertThat(request("POST","/api/auth/login",null,Map.of("email",ownerEmail,"password",UUID.randomUUID().toString())).status()).isEqualTo(401);
        var refreshed=request("POST","/api/auth/refresh",null,Map.of("refreshToken",ownerRefresh));
        assertThat(refreshed.status()).isEqualTo(200);assertThat(refreshed.body().get("tokenType").asString()).isEqualTo("Bearer");
        assertThat(request("POST","/api/auth/logout",null,Map.of("refreshToken",ownerRefresh)).status()).isEqualTo(204);
        assertThat(request("POST","/api/auth/refresh",null,Map.of("refreshToken",ownerRefresh)).status()).isEqualTo(401);
    }
    @Test void authenticationAndTicketTokensCannotSubstituteForEachOther() {
        String ticket=issue("RS256",ownerAccess).body().get("token").asString();
        assertThat(request("GET","/api/tickets/algorithms",ticket,null).status()).isEqualTo(401);
        assertThat(request("GET","/api/tickets/algorithms",ownerRefresh,null).status()).isEqualTo(401);
        assertThat(verify(ownerAccess).status()).isEqualTo(422);assertThat(verify(ownerRefresh).status()).isEqualTo(422);
        assertThat(request("POST","/api/auth/refresh",null,Map.of("refreshToken",ticket)).status()).isEqualTo(401);
    }
    @Test void ownershipRolesAndHeaderSpoofingUseTheDatabasePrincipal() {
        assertThat(request("GET","/api/tickets/"+ticketId,null,null,ownerId).status()).isEqualTo(401);
        assertThat(issue("RS256",otherAccess).status()).isEqualTo(403);assertThat(issue("RS256",adminAccess).status()).isEqualTo(200);
        var token=issue("RS256",ownerAccess).body().get("token").asString();
        assertThat(request("POST","/api/tickets/verify",ownerAccess,Map.of("value",token)).status()).isEqualTo(403);
        var available=new TransactionTemplate(transactions).execute(tx->seats.findByRoom_IdOrderByRowNameAscSeatNumberAsc(showtimes.findById(showtimeId).orElseThrow().getRoom().getId()).stream().filter(s->!s.getId().equals(seatId)).findFirst().orElseThrow().getId());
        var booking=request("POST","/api/bookings",ownerAccess,Map.of("showtimeId",showtimeId,"seatIds",List.of(available)),otherId);
        assertThat(booking.status()).isEqualTo(201);int newTicket=booking.body().get("tickets").get(0).get("ticketId").asInt();
        new TransactionTemplate(transactions).executeWithoutResult(tx->assertThat(tickets.findById(newTicket).orElseThrow().getUser().getId()).isEqualTo(ownerId));
        jdbc.update("UPDATE Users SET IsActive=0 WHERE UserID=?",ownerId);
        assertThat(request("GET","/api/tickets/algorithms",ownerAccess,null).status()).isEqualTo(401);
    }
    @Test void mixedAlgorithmsConcurrentCheckInHaveExactlyOneWinner() throws Exception {
        String rsa=issue("RS256",ownerAccess).body().get("token").asString();String ec=issue("ES256",ownerAccess).body().get("token").asString();
        var ready=new CountDownLatch(2);var start=new CountDownLatch(1);var executor=Executors.newFixedThreadPool(2);
        try {
            var futures=new ArrayList<Future<Integer>>();
            for (String token:List.of(rsa,ec)) futures.add(executor.submit(()->{ready.countDown();if (!start.await(5,TimeUnit.SECONDS)) throw new IllegalStateException("Barrier timeout");return checkIn(token).status();}));
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();start.countDown();
            assertThat(List.of(futures.get(0).get(25,TimeUnit.SECONDS),futures.get(1).get(25,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
            new TransactionTemplate(transactions).executeWithoutResult(tx->{var t=tickets.findById(ticketId).orElseThrow();assertThat(t.getStatus()).isEqualTo(Ticket.TicketStatus.USED);assertThat(t.getUsedAt()).isNotNull();});
        } finally { executor.shutdownNow(); }
    }
    @Test void referenceAndJwtFromDifferentAlgorithmsShareOneTicketState() {
        String rsa=issue("RS256",ownerAccess).body().get("token").asString();String ed=issue("EdDSA",ownerAccess).body().get("token").asString();
        String reference=new TransactionTemplate(transactions).execute(tx->{
            var t=tickets.findById(ticketId).orElseThrow();var p=new TicketProperties("Asia/Ho_Chi_Minh",5,32768,"unused-in-this-test");
            return new QrCodeService(references,p,Clock.systemUTC()).create(ed,t,expiration).content();
        });
        assertThat(reference).startsWith("etkt:");assertThat(verify(reference).status()).isEqualTo(200);
        assertThat(checkIn(reference).status()).isEqualTo(200);assertThat(checkIn(rsa).status()).isEqualTo(409);
    }
    @Test void mlDsaIsUnavailableAndDemoIdentityEndpointsAreDisabled() {
        var algorithms=request("GET","/api/tickets/algorithms",ownerAccess,null);assertThat(algorithms.status()).isEqualTo(200);
        int available=0;for (var item:algorithms.body()) if (item.get("available").asBoolean()) available++;
        assertThat(available).isEqualTo(3);assertThat(issue("ML-DSA-44",ownerAccess).status()).isEqualTo(503);
        assertThat(request("GET","/api/demo/accounts",ownerAccess,null).status()).isEqualTo(403);
    }
    @Test void authThreeAlgorithmsAndReferencesSurviveTwoRealProcessRestarts() throws Exception {
        int parentPort=port;int childPort;
        try (var socket=new ServerSocket(0)) { childPort=socket.getLocalPort(); }
        Process child=null;
        try {
            port=childPort;child=startProcess(childPort,25,1);
            var owner=login(ownerEmail);String access=owner.get("accessToken").asString(),refresh=owner.get("refreshToken").asString();
            staffAccess=login(staffEmail).get("accessToken").asString();
            var direct=new ArrayList<JsonNode>();
            for (String algorithm:List.of("RS256","ES256","EdDSA")) {
                var response=issue(algorithm,access);assertThat(response.status()).isEqualTo(200);
                assertThat(response.body().get("qr").get("mode").asString()).isEqualTo("JWT");direct.add(response.body());
            }
            stopProcess(child);child=startProcess(childPort,5,2);
            for (var token:direct) assertThat(verify(token.get("token").asString()).status()).isEqualTo(200);
            assertThat(request("POST","/api/auth/refresh",null,Map.of("refreshToken",refresh)).status()).isEqualTo(200);
            var ref=new ArrayList<JsonNode>();
            for (String algorithm:List.of("RS256","ES256","EdDSA")) {
                var response=issue(algorithm,access);assertThat(response.status()).isEqualTo(200);
                assertThat(response.body().get("qr").get("mode").asString()).isEqualTo("REFERENCE");
                assertThat(response.body().get("expiresAt").asString()).isEqualTo(direct.getFirst().get("expiresAt").asString());ref.add(response.body());
            }
            stopProcess(child);child=startProcess(childPort,5,3);
            for (var reference:ref) assertThat(verify(reference.get("qr").get("content").asString()).status()).isEqualTo(200);
            assertThat(checkIn(ref.getLast().get("qr").get("content").asString()).status()).isEqualTo(200);
            assertThat(checkIn(direct.getFirst().get("token").asString()).status()).isEqualTo(409);
        } finally { if (child!=null) stopProcess(child);port=parentPort; }
    }
    private Process startProcess(int childPort,int qrVersion,int sequence) throws Exception {
        String java=Path.of(System.getProperty("java.home"),"bin",System.getProperty("os.name").startsWith("Windows")?"java.exe":"java").toString();
        String classpath=System.getProperty("surefire.test.class.path",System.getProperty("java.class.path")).replace('\\','/');
        var args=restartDirectory.resolve("java-"+sequence+".args");
        Files.writeString(args,"-cp\n\""+classpath+"\"\ncom.backend.cenima.CenimaApplication\n--spring.profiles.active=integrated\n--server.address=127.0.0.1\n--server.port="+childPort+"\n--ticket.qr-max-version="+qrVersion+"\n--traditional.key-directory=\""+restartDirectory.resolve("keys").toString().replace('\\','/')+"\"\n");
        var builder=new ProcessBuilder(java,"@"+args).redirectOutput(restartDirectory.resolve("server-"+sequence+".log").toFile()).redirectErrorStream(true);
        builder.environment().put("DB_URL",System.getenv("TEST_DB_URL"));builder.environment().put("DB_USERNAME",System.getenv("TEST_DB_USERNAME"));
        builder.environment().put("DB_PASSWORD",System.getenv("TEST_DB_PASSWORD"));builder.environment().put("DEBUG","false");
        var child=builder.start();long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(45);
        while (System.nanoTime()<deadline && child.isAlive()) {
            try {
                var ready=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+childPort+"/demo/index.html")).timeout(Duration.ofSeconds(1)).GET().build(),HttpResponse.BodyHandlers.discarding());
                if (ready.statusCode()==200) return child;
            } catch (Exception ignored) { }
            Thread.sleep(200);
        }
        stopProcess(child);throw new IllegalStateException("Restart test server did not become ready");
    }
    private void stopProcess(Process process) throws Exception {
        process.destroy();if (!process.waitFor(5,TimeUnit.SECONDS)) { process.destroyForcibly();process.waitFor(5,TimeUnit.SECONDS); }
    }
}
