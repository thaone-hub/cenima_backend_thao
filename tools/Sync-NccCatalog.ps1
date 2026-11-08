param()
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cache=Join-Path $repo 'cenima/.local/ncc-import'
$assets=Join-Path $repo 'cenima/src/main/resources/static/assets'
New-Item -ItemType Directory -Force $cache | Out-Null
Invoke-WebRequest -UseBasicParsing 'https://chieuphimquocgia.com.vn/' -OutFile (Join-Path $cache 'home.html') -TimeoutSec 25
$page=[IO.File]::ReadAllText((Join-Path $cache 'home.html'),[Text.Encoding]::UTF8)
$ids=@(11248,11279,11294,11390,11384)+@([regex]::Matches($page,'/movies/(\d+)') | ForEach-Object { [int]$_.Groups[1].Value })
foreach($id in ($ids | Select-Object -Unique)) {
    Invoke-WebRequest -UseBasicParsing "https://chieuphimquocgia.com.vn/movies/$id" -OutFile (Join-Path $cache "ncc-$id.html") -TimeoutSec 25
}
$catalog=Join-Path $assets 'ncc-catalog.json'
& python (Join-Path $PSScriptRoot 'Build-NccCatalog.py') $cache $catalog
if($LASTEXITCODE -ne 0){throw 'Catalogue parsing failed.'}
$data=Get-Content -Raw -Encoding UTF8 $catalog | ConvertFrom-Json
foreach($movie in $data.movies) {
    Invoke-WebRequest -UseBasicParsing $movie.originalPosterUrl -OutFile (Join-Path $assets "ncc-$($movie.sourceId).jpg") -TimeoutSec 25
}
Write-Output "Updated $($data.movies.Count) NCC film records and local posters. No database was changed."
