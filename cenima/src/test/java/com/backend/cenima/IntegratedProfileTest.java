package com.backend.cenima;
import com.backend.cenima.Security.adapter.*;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.Security.demo.*;
import com.backend.cenima.config.IntegratedTicketRequirements;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class IntegratedProfileTest {
    @Test void integratedDisablesDemoEvenWhenBothProfilesAreRequested() {
        new ApplicationContextRunner().withPropertyValues("spring.profiles.active=demo,integrated")
            .withBean(TicketAuthenticationBridge.class,()->auth->new TicketActor(1,Set.of("STAFF")))
            .withUserConfiguration(DemoRs256Provider.class,DemoActorProvider.class,DemoSecurityConfig.class,DemoAccountsController.class,IntegratedActorProvider.class)
            .run(ctx->{assertThat(ctx).hasNotFailed().hasSingleBean(IntegratedActorProvider.class)
                .doesNotHaveBean(DemoRs256Provider.class).doesNotHaveBean(DemoActorProvider.class)
                .doesNotHaveBean(DemoSecurityConfig.class).doesNotHaveBean(DemoAccountsController.class);});
    }
    @Test void integratedFailsWithoutAuthenticationBridgeOrRealSignatureProviders() {
        new ApplicationContextRunner().withPropertyValues("spring.profiles.active=integrated")
            .withUserConfiguration(IntegratedActorProvider.class).run(ctx->assertThat(ctx).hasFailed());
        new ApplicationContextRunner().withPropertyValues("spring.profiles.active=integrated")
            .withBean(JwtProviderRegistry.class,()->new JwtProviderRegistry(List.of(),List.of()))
            .withUserConfiguration(IntegratedTicketRequirements.class).run(ctx->assertThat(ctx).hasFailed());
    }
}
