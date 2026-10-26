-- Additive migration; no existing data is removed. Explicitly select the target DB.
SET XACT_ABORT ON;
IF OBJECT_ID('dbo.TicketQrReferences','U') IS NULL
BEGIN
    CREATE TABLE dbo.TicketQrReferences (
        ReferenceHash VARCHAR(64) NOT NULL PRIMARY KEY,
        Token NVARCHAR(MAX) NOT NULL,
        TicketID INT NOT NULL,
        ExpiresAtEpoch BIGINT NOT NULL,
        CONSTRAINT FK_TicketQrReferences_Tickets FOREIGN KEY (TicketID) REFERENCES dbo.Tickets(TicketID)
    );
    CREATE INDEX IX_TicketQrReferences_Expiry ON dbo.TicketQrReferences(ExpiresAtEpoch);
END;
GO
