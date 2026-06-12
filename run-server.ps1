$ErrorActionPreference = "Stop"

$project = Join-Path $PSScriptRoot "LocalHttpHttpsDemo.csproj"
$log = Join-Path $PSScriptRoot "server.log"

Set-Location $PSScriptRoot
dotnet run --project $project --no-build --no-launch-profile *> $log
