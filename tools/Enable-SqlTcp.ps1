# Requires Windows administrator rights. Restarts MSSQLSERVER (user authorized).
$ErrorActionPreference = 'Stop'
$tcpPath = 'HKLM:/SOFTWARE/Microsoft/Microsoft SQL Server/MSSQL16.MSSQLSERVER/MSSQLServer/SuperSocketNetLib/Tcp'
Set-ItemProperty -LiteralPath $tcpPath -Name Enabled -Value 1
Set-ItemProperty -LiteralPath ($tcpPath + '/IPAll') -Name TcpPort -Value '1433'
Set-ItemProperty -LiteralPath ($tcpPath + '/IPAll') -Name TcpDynamicPorts -Value ''
Restart-Service -Name MSSQLSERVER -Force
