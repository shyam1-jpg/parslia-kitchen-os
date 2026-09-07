# Creates Inbox\Companies folders in classic desktop Outlook (COM).
# Prefer FILE-ALL-EMAIL-FOLDERS.bat — that files Hotmail / outlook.live.com.
# Use this only if you have classic Outlook installed and Graph sign-in fails.

[CmdletBinding()]
param(
    [switch]$Yes,
    [switch]$SkipMove,
    [int]$MaxItems = 5000,
    [int]$MinAutoFolder = 2
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$csvPath = Join-Path $here "companies.csv"
$personalPath = Join-Path $here "personal-domains.txt"
$parentName = "Companies"
$otherName = "Other companies"
$rulePrefix = "Companies:"

$publicSuffixes = @(
    "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk",
    "co.in", "com.au", "co.nz", "co.jp", "com.br", "co.za",
    "com.sg", "co.kr"
)

function Write-Step([string]$text) { Write-Host $text }

function Get-PersonalDomains {
    $set = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($raw in Get-Content -Path $personalPath) {
        $line = ($raw -split "#", 2)[0].Trim().ToLower()
        if ($line) { [void]$set.Add($line) }
    }
    return $set
}

function Get-CompanyRows {
    $rows = @()
    foreach ($row in (Import-Csv -Path $csvPath)) {
        $folder = ([string]$row.folder).Trim()
        if (-not $folder) { continue }
        $domains = @()
        foreach ($d in (([string]$row.domains) -split ";")) {
            $t = $d.Trim().ToLower()
            if ($t) { $domains += $t }
        }
        $names = @()
        foreach ($n in (([string]$row.from_contains) -split ";")) {
            $t = $n.Trim()
            if ($t) { $names += $t }
        }
        $rows += [pscustomobject]@{ Folder = $folder; Domains = $domains; FromContains = $names }
    }
    return $rows
}

function Get-DomainMap($rows) {
    $map = @{}
    foreach ($row in $rows) {
        foreach ($d in $row.Domains) { $map[$d] = $row.Folder }
    }
    return $map
}

function Get-EmailAddress([string]$value) {
    if (-not $value) { return "" }
    $m = [regex]::Match($value, '([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})', 'IgnoreCase')
    if ($m.Success) { return $m.Groups[1].Value.ToLower() }
    if ($value.Contains("@")) { return $value.Trim("<> ").ToLower() }
    return ""
}

function Get-SenderDomain([string]$value) {
    $address = Get-EmailAddress $value
    if (-not $address.Contains("@")) { return "" }
    return ($address.Split("@")[-1]).ToLower().Trim(".")
}

function Get-RegistrableDomain([string]$domain) {
    $d = ([string]$domain).ToLower().Trim(".")
    if (-not $d) { return "" }
    $parts = $d.Split(".")
    if ($parts.Count -lt 2) { return $d }
    $last2 = ($parts[-2] + "." + $parts[-1])
    if ($publicSuffixes -contains $last2) {
        if ($parts.Count -ge 3) {
            return ($parts[-3] + "." + $parts[-2] + "." + $parts[-1])
        }
        return $d
    }
    return $last2
}

function Get-TitleFromDomain([string]$domain) {
    $reg = Get-RegistrableDomain $domain
    if (-not $reg) { return "Unknown" }
    $label = $reg.Split(".")[0]
    if (-not $label) { return "Unknown" }
    return ($label.Substring(0, 1).ToUpper() + $label.Substring(1))
}

function Get-KnownFolder([string]$domain, $map) {
    if (-not $domain) { return $null }
    $parts = $domain.Split(".")
    for ($i = 0; $i -le $parts.Count - 2; $i++) {
        $candidate = [string]::Join(".", $parts[$i..($parts.Count - 1)])
        if ($map.ContainsKey($candidate)) { return $map[$candidate] }
    }
    $reg = Get-RegistrableDomain $domain
    if ($map.ContainsKey($reg)) { return $map[$reg] }
    return $null
}

function Get-FolderFromName([string]$fromName, $rows) {
    if (-not $fromName) { return $null }
    $lowered = $fromName.ToLower()
    foreach ($row in $rows) {
        foreach ($needle in $row.FromContains) {
            if ($needle -and $lowered.Contains($needle.ToLower())) {
                return $row.Folder
            }
        }
    }
    return $null
}

function Get-MailSmtp($item) {
    try {
        if ($item.Class -ne 43) { return "" }
        if ($item.SenderEmailType -eq "SMTP" -and $item.SenderEmailAddress) {
            return [string]$item.SenderEmailAddress
        }
        $schema = "http://schemas.microsoft.com/mapi/proptag/0x5D01001F"
        $smtp = [string]$item.PropertyAccessor.GetProperty($schema)
        if ($smtp) { return $smtp }
        return [string]$item.SenderEmailAddress
    } catch {
        try { return [string]$item.SenderEmailAddress } catch { return "" }
    }
}

function Get-OrCreateFolder($parent, [string]$name) {
    foreach ($f in @($parent.Folders)) {
        if ($f.Name -eq $name) { return $f }
    }
    return $parent.Folders.Add($name)
}

function Get-OutlookInbox {
    try {
        $outlook = [Runtime.InteropServices.Marshal]::GetActiveObject("Outlook.Application")
    } catch {
        $outlook = New-Object -ComObject Outlook.Application
    }
    $namespace = $outlook.GetNamespace("MAPI")
    try { $namespace.Logon($null, $null, $false, $false) | Out-Null } catch { }
    $inbox = $namespace.GetDefaultFolder(6)
    if (-not $inbox) { throw "Outlook Inbox was not found." }
    return @{ App = $outlook; Namespace = $namespace; Inbox = $inbox }
}

function New-CompanyRules($namespace, $rows, $folderObjects) {
    $rules = $namespace.DefaultStore.GetRules()
    $made = 0
    $skipped = 0
    foreach ($row in $rows) {
        $name = "$rulePrefix $($row.Folder)"
        $exists = $false
        foreach ($existing in @($rules)) {
            if ($existing.Name -eq $name) { $exists = $true; break }
        }
        if ($exists) { $skipped++; continue }
        if (-not $folderObjects.ContainsKey($row.Folder)) { continue }
        $rule = $rules.Create($name, 0)
        $needles = @($row.Domains)
        $rule.Conditions.SenderAddress.Text = [string[]]$needles
        $rule.Conditions.SenderAddress.Enabled = $true
        $rule.Actions.MoveToFolder.Folder = $folderObjects[$row.Folder]
        $rule.Actions.MoveToFolder.Enabled = $true
        $rule.Actions.Stop.Enabled = $true
        $rule.Enabled = $true
        $made++
    }
    $rules.Save()
    return @{ Created = $made; Skipped = $skipped }
}

Write-Step ""
Write-Step "Reading company list..."
if (-not (Test-Path $csvPath)) { throw "Missing $csvPath" }
$rows = @(Get-CompanyRows)
$domainMap = Get-DomainMap $rows
$personal = Get-PersonalDomains
Write-Step ("  {0} company folders mapped." -f $rows.Count)

Write-Step "Opening desktop Outlook..."
try {
    $ctx = Get-OutlookInbox
} catch {
    Write-Host ""
    Write-Host "Could not open classic Outlook."
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Use FILE-ALL-EMAIL-FOLDERS.bat instead — that files Hotmail in the browser."
    exit 1
}

$inbox = $ctx.Inbox
Write-Step ("  Account: {0}" -f $inbox.Store.DisplayName)
Write-Step "Scanning Inbox..."
$items = $inbox.Items
$count = [int]$items.Count
if ($count -gt $MaxItems) { $scan = $MaxItems } else { $scan = $count }
$plan = @{}
$inboxStay = 0
$classified = @()

for ($i = $count; $i -ge 1; $i--) {
    $offset = $count - $i
    if ($offset -ge $scan) { break }
    try { $item = $items.Item($i) } catch { continue }
    try {
        if ($item.Class -ne 43) { continue }
        $smtp = Get-MailSmtp $item
        $fromName = ""
        try { $fromName = [string]$item.SenderName } catch { }
        $domain = Get-SenderDomain $smtp
        $folder = Get-KnownFolder $domain $domainMap
        if (-not $folder) { $folder = Get-FolderFromName $fromName $rows }
        if (-not $folder) {
            $reg = Get-RegistrableDomain $domain
            if (-not $domain -or -not $reg) { $inboxStay++; continue }
            if ($personal.Contains($reg) -or $personal.Contains($domain)) { $inboxStay++; continue }
            $folder = "AUTO:" + $reg
        }
        $classified += [pscustomobject]@{ Item = $item; Folder = $folder }
        if ($plan.ContainsKey($folder)) { $plan[$folder]++ } else { $plan[$folder] = 1 }
    } catch { continue }
}

$autoResolved = @{}
foreach ($key in @($plan.Keys)) {
    if ($key.StartsWith("AUTO:")) {
        if ($plan[$key] -ge $MinAutoFolder) {
            $autoResolved[$key] = Get-TitleFromDomain ($key.Substring(5))
        } else {
            $autoResolved[$key] = $otherName
        }
    }
}

Write-Host ""
Write-Host "Preview — mail that will leave Inbox"
Write-Host "------------------------------------"
foreach ($name in (($rows | ForEach-Object { $_.Folder }) | Select-Object -Unique | Sort-Object)) {
    $n = 0
    if ($plan.ContainsKey($name)) { $n = $plan[$name] }
    if ($n -gt 0) { Write-Host ("  {0,-18} {1}" -f $name, $n) }
}
$otherCount = 0
foreach ($key in ($autoResolved.Keys | Sort-Object)) {
    $name = $autoResolved[$key]
    if ($name -eq $otherName) { $otherCount += $plan[$key]; continue }
    Write-Host ("  {0,-18} {1}" -f $name, $plan[$key])
}
if ($otherCount -gt 0) { Write-Host ("  {0,-18} {1}" -f $otherName, $otherCount) }
Write-Host ("  Left in Inbox     {0}  (people)" -f $inboxStay)
Write-Host ""

if (-not $Yes) {
    $answer = Read-Host "Create folders, move this mail, and add rules? (Y/N)"
    if ($answer -notmatch '^[Yy]') {
        Write-Host "No changes made."
        exit 0
    }
}

Write-Step "Creating folders under Inbox\$parentName ..."
$parent = Get-OrCreateFolder $inbox $parentName
$folderObjects = @{}
foreach ($row in $rows) {
    $folderObjects[$row.Folder] = Get-OrCreateFolder $parent $row.Folder
}
foreach ($key in $autoResolved.Keys) {
    $name = $autoResolved[$key]
    if (-not $folderObjects.ContainsKey($name)) {
        $folderObjects[$name] = Get-OrCreateFolder $parent $name
    }
}

$moved = 0
if (-not $SkipMove) {
    Write-Step "Moving emails into company folders..."
    foreach ($entry in $classified) {
        $destName = $entry.Folder
        if ($destName.StartsWith("AUTO:")) { $destName = $autoResolved[$destName] }
        if (-not $folderObjects.ContainsKey($destName)) { continue }
        try {
            $entry.Item.Move($folderObjects[$destName]) | Out-Null
            $moved++
        } catch { }
    }
}

Write-Step "Saving Outlook rules for new mail..."
$ruleStats = @{ Created = 0; Skipped = 0 }
try {
    $ruleStats = New-CompanyRules $ctx.Namespace $rows $folderObjects
} catch {
    Write-Host "  Rules could not be saved automatically:"
    Write-Host ("  " + $_.Exception.Message)
}

Write-Host ""
Write-Host "Done."
Write-Host ("  Folders ready: {0}" -f $folderObjects.Count)
Write-Host ("  Emails moved:  {0}" -f $moved)
Write-Host ("  Rules added:   {0}  (already existed: {1})" -f $ruleStats.Created, $ruleStats.Skipped)
Write-Host ""
Write-Host "In Outlook, open Inbox → Companies on the LEFT."
