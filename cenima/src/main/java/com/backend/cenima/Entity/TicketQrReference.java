package com.backend.cenima.Entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
@Entity
@Table(name="TicketQrReferences")
@Getter @Setter @NoArgsConstructor
public class TicketQrReference {
    @Id @Column(name="ReferenceHash",length=64,nullable=false) private String referenceHash;
    @Nationalized @Column(name="Token",columnDefinition="nvarchar(max)",nullable=false) private String token;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="TicketID",nullable=false) private Ticket ticket;
    @Column(name="ExpiresAtEpoch",nullable=false) private Long expiresAtEpoch;
}
