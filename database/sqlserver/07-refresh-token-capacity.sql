-- Preserve Thao's auth model: old database column was VARCHAR(500), entity requires 1000.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.RefreshTokens','Token') < 1000
BEGIN
    DECLARE @constraint sysname, @ddl nvarchar(max);
    SELECT @constraint=kc.name FROM sys.key_constraints kc
    JOIN sys.index_columns ic ON ic.object_id=kc.parent_object_id AND ic.index_id=kc.unique_index_id
    JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    WHERE kc.parent_object_id=OBJECT_ID('dbo.RefreshTokens') AND kc.type='UQ' AND c.name='Token';
    IF @constraint IS NOT NULL
    BEGIN
        SET @ddl=N'ALTER TABLE dbo.RefreshTokens DROP CONSTRAINT '+QUOTENAME(@constraint);
        EXEC sp_executesql @ddl;
    END;
    ALTER TABLE dbo.RefreshTokens ALTER COLUMN Token VARCHAR(1000) NOT NULL;
    IF @constraint IS NOT NULL
    BEGIN
        SET @ddl=N'ALTER TABLE dbo.RefreshTokens ADD CONSTRAINT '+QUOTENAME(@constraint)+N' UNIQUE (Token)';
        EXEC sp_executesql @ddl;
    END;
END;
COMMIT;
GO
