-- Select the intended existing database explicitly; back up before upgrading.
-- Keeps rows and the original SQL Server unique constraint.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.Tickets', 'TicketCode') < 32
BEGIN
    DECLARE @constraint sysname;
    DECLARE @ddl nvarchar(max);
    SELECT @constraint = kc.name FROM sys.key_constraints kc
    JOIN sys.index_columns ic ON ic.object_id=kc.parent_object_id AND ic.index_id=kc.unique_index_id
    JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    WHERE kc.parent_object_id=OBJECT_ID('dbo.Tickets') AND kc.type='UQ' AND c.name='TicketCode';
    IF @constraint IS NOT NULL
    BEGIN
        SET @ddl = N'ALTER TABLE dbo.Tickets DROP CONSTRAINT ' + QUOTENAME(@constraint);
        EXEC sp_executesql @ddl;
    END;
    ALTER TABLE dbo.Tickets ALTER COLUMN TicketCode VARCHAR(32) NOT NULL;
    IF @constraint IS NOT NULL
    BEGIN
        SET @ddl = N'ALTER TABLE dbo.Tickets ADD CONSTRAINT ' + QUOTENAME(@constraint) + N' UNIQUE (TicketCode)';
        EXEC sp_executesql @ddl;
    END;
END;
COMMIT;
GO
