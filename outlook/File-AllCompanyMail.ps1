# Files ALL company mail in Hotmail / Outlook on the web (outlook.live.com).
# Sign in when the code appears. Folders appear on the LEFT in Outlook.
# Friends and family stay in Inbox.

[CmdletBinding()]
param(
    [switch]$Yes,
    [switch]$SkipMove,
    [switch]$SkipRules,
    [int]$MaxItems = 8000,
    [int]$MinAutoFolder = 2,
    [int]$MaxRules = 50
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$csvPath = Join-Path $here "companies.csv"
$personalPath = Join-Path $here "personal-domains.txt"
$sourcePath = Join-Path $here "source-folders.txt"
$parentName = "Companies"
$otherName = "Other companies"
$rulePrefix = "Companies:"
$clientId = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
$graph = "https://graph.microsoft.com/v1.0"
$scopes = "https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/MailboxSettings.ReadWrite offline_access"

$publicSuffixes = @(
    "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk",
    "co.in", "com.au", "co.nz", "co.jp", "com.br", "co.za",
    "com.sg", "co.kr"
)

$skipFolderNames = @(
    "Drafts", "Sent Items", "Deleted Items", "Junk Email", "Outbox",
    "Conversation History", "RSS Feeds", "Sync Issues", "Notes",
    "Junk", "Sent", "Deleted", "Draft"
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

function Get-SourceFolderIds {
    if (-not (Test-Path $sourcePath)) { return @() }
    $ids = @()
    foreach ($raw in Get-Content -Path $sourcePath) {
        $line = ($raw -split "#", 2)[0].Trim()
        if ($line) { $ids += $line }
    }
    return $ids
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

function Get-GraphToken {
    $tenants = @("consumers", "common")
    $lastError = $null
    foreach ($tenant in $tenants) {
        try {
            $deviceUri = "https://login.microsoftonline.com/$tenant/oauth2/v2.0/devicecode"
            $tokenUri = "https://login.microsoftonline.com/$tenant/oauth2/v2.0/token"
            $device = Invoke-RestMethod -Method Post -Uri $deviceUri -Body @{
                client_id = $clientId
                scope     = $scopes
            }
            Write-Host ""
            Write-Host "  Sign in to Hotmail so folders can be created in your real inbox."
            Write-Host "  Account: shyam_1@hotmail.co.uk"
            Write-Host ""
            Write-Host "  1. Open:  $($device.verification_uri)"
            Write-Host "  2. Enter: $($device.user_code)"
            Write-Host ""
            Write-Host "  Waiting for you to sign in..."
            $expires = (Get-Date).AddSeconds([int]$device.expires_in)
            $interval = [Math]::Max(5, [int]$device.interval)
            while ((Get-Date) -lt $expires) {
                Start-Sleep -Seconds $interval
                try {
                    $token = Invoke-RestMethod -Method Post -Uri $tokenUri -Body @{
                        grant_type  = "urn:ietf:params:oauth:grant-type:device_code"
                        client_id   = $clientId
                        device_code = $device.device_code
                    }
                    return $token.access_token
                } catch {
                    $payload = $_.ErrorDetails.Message
                    if ($payload -match "authorization_pending") { continue }
                    if ($payload -match "slow_down") { $interval += 5; continue }
                    throw
                }
            }
            throw "Sign-in timed out. Run FILE-ALL-EMAIL-FOLDERS.bat again."
        } catch {
            $lastError = $_
        }
    }
    throw $lastError
}

function Encode-Id([string]$id) {
    return [uri]::EscapeDataString($id)
}

function Invoke-Graph {
    param(
        [Parameter(Mandatory = $true)][string]$AccessToken,
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        $Body = $null
    )
    $headers = @{
        Authorization = "Bearer $AccessToken"
        Accept        = "application/json"
    }
    $params = @{
        Method  = $Method
        Uri     = $Url
        Headers = $headers
    }
    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
    }
    return Invoke-RestMethod @params
}

function Get-GraphPaged {
    param(
        [Parameter(Mandatory = $true)][string]$AccessToken,
        [Parameter(Mandatory = $true)][string]$Url
    )
    $items = @()
    $next = $Url
    while ($next) {
        $page = Invoke-Graph -AccessToken $AccessToken -Method GET -Url $next
        if ($page.value) { $items += @($page.value) }
        $next = $page.'@odata.nextLink'
    }
    return $items
}

function Get-OrCreateGraphFolder {
    param(
        [Parameter(Mandatory = $true)][string]$AccessToken,
        [Parameter(Mandatory = $true)][string]$ParentId,
        [Parameter(Mandatory = $true)][string]$Name
    )
    $encodedParent = Encode-Id $ParentId
    $children = Get-GraphPaged -AccessToken $AccessToken -Url "$graph/me/mailFolders/$encodedParent/childFolders`?`$top=100"
    foreach ($child in $children) {
        if ($child.displayName -eq $Name) { return $child }
    }
    return Invoke-Graph -AccessToken $AccessToken -Method POST -Url "$graph/me/mailFolders/$encodedParent/childFolders" -Body @{
        displayName = $Name
    }
}

function Test-SkipFolder([string]$name, [string]$parentNameToSkip) {
    if (-not $name) { return $true }
    if ($name -eq $parentNameToSkip) { return $true }
    foreach ($skip in $skipFolderNames) {
        if ($name -eq $skip) { return $true }
    }
    return $false
}

Write-Step ""
Write-Step "Reading company list..."
if (-not (Test-Path $csvPath)) { throw "Missing $csvPath" }
$rows = @(Get-CompanyRows)
$domainMap = Get-DomainMap $rows
$personal = Get-PersonalDomains
$sourceIds = @(Get-SourceFolderIds)
Write-Step ("  {0} company folders mapped." -f $rows.Count)

Write-Step "Connecting to Outlook on the web (Hotmail)..."
$token = Get-GraphToken
$me = Invoke-Graph -AccessToken $token -Method GET -Url "$graph/me"
$upn = [string]$me.userPrincipalName
Write-Step ("  Signed in as {0}" -f $upn)

$inbox = Invoke-Graph -AccessToken $token -Method GET -Url "$graph/me/mailFolders/inbox"
Write-Step ("  Inbox: {0} items" -f $inbox.totalItemCount)

$scanFolders = @()
$scanFolders += $inbox
foreach ($fid in $sourceIds) {
    try {
        $extra = Invoke-Graph -AccessToken $token -Method GET -Url "$graph/me/mailFolders/$(Encode-Id $fid)"
        if ($extra.id -ne $inbox.id) {
            $scanFolders += $extra
            Write-Step ("  Also scanning folder: {0}" -f $extra.displayName)
        }
    } catch {
        Write-Step "  Linked Outlook folder was not readable; Inbox will still be organised."
    }
}

$rootFolders = Get-GraphPaged -AccessToken $token -Url "$graph/me/mailFolders`?`$top=100"
foreach ($folder in $rootFolders) {
    if (Test-SkipFolder $folder.displayName $parentName) { continue }
    if ($folder.id -eq $inbox.id) { continue }
    $already = $false
    foreach ($existing in $scanFolders) {
        if ($existing.id -eq $folder.id) { $already = $true; break }
    }
    if (-not $already) { $scanFolders += $folder }
}

Write-Step "Scanning mail (this can take a few minutes)..."
$classified = @()
$plan = @{}
$inboxStay = 0
$seen = New-Object 'System.Collections.Generic.HashSet[string]'
$scanned = 0

foreach ($folder in $scanFolders) {
    if ($scanned -ge $MaxItems) { break }
    if ($folder.displayName -eq $parentName) { continue }
    $url = "$graph/me/mailFolders/$(Encode-Id $folder.id)/messages?`$select=id,from,sender,subject&`$top=50"
    $messages = @()
    $next = $url
    while ($next -and $scanned -lt $MaxItems) {
        $page = Invoke-Graph -AccessToken $token -Method GET -Url $next
        if ($page.value) { $messages += @($page.value) }
        $scanned += @($page.value).Count
        $next = $page.'@odata.nextLink'
    }
    foreach ($msg in $messages) {
        if (-not $msg.id) { continue }
        if (-not $seen.Add([string]$msg.id)) { continue }
        $from = $msg.from.emailAddress
        if (-not $from) { $from = $msg.sender.emailAddress }
        $smtp = ""
        $fromName = ""
        if ($from) {
            $smtp = [string]$from.address
            $fromName = [string]$from.name
        }
        $domain = Get-SenderDomain $smtp
        $dest = Get-KnownFolder $domain $domainMap
        if (-not $dest) { $dest = Get-FolderFromName $fromName $rows }
        if (-not $dest) {
            $reg = Get-RegistrableDomain $domain
            if (-not $domain -or -not $reg) {
                $inboxStay++
                continue
            }
            if ($personal.Contains($reg) -or $personal.Contains($domain)) {
                $inboxStay++
                continue
            }
            $dest = "AUTO:" + $reg
        }
        $classified += [pscustomobject]@{ Id = $msg.id; Folder = $dest }
        if ($plan.ContainsKey($dest)) { $plan[$dest]++ } else { $plan[$dest] = 1 }
    }
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
Write-Host "Preview — mail that will leave Inbox / the linked folder"
Write-Host "-------------------------------------------------------"
$knownNames = @($rows | ForEach-Object { $_.Folder }) | Select-Object -Unique
foreach ($name in ($knownNames | Sort-Object)) {
    $n = 0
    if ($plan.ContainsKey($name)) { $n = $plan[$name] }
    if ($n -gt 0) { Write-Host ("  {0,-18} {1}" -f $name, $n) }
}
$autoShown = $false
$otherCount = 0
foreach ($key in ($autoResolved.Keys | Sort-Object)) {
    $name = $autoResolved[$key]
    if ($name -eq $otherName) { $otherCount += $plan[$key]; continue }
    if (-not $autoShown) {
        Write-Host "  (new companies found in this mailbox)"
        $autoShown = $true
    }
    Write-Host ("  {0,-18} {1}" -f $name, $plan[$key])
}
if ($otherCount -gt 0) {
    Write-Host ("  {0,-18} {1}" -f $otherName, $otherCount)
}
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
$parent = Get-OrCreateGraphFolder -AccessToken $token -ParentId $inbox.id -Name $parentName
$folderObjects = @{}
foreach ($row in $rows) {
    $folderObjects[$row.Folder] = Get-OrCreateGraphFolder -AccessToken $token -ParentId $parent.id -Name $row.Folder
}
foreach ($key in $autoResolved.Keys) {
    $name = $autoResolved[$key]
    if (-not $folderObjects.ContainsKey($name)) {
        $folderObjects[$name] = Get-OrCreateGraphFolder -AccessToken $token -ParentId $parent.id -Name $name
    }
}

$moved = 0
$failed = 0
if (-not $SkipMove) {
    Write-Step "Moving emails into company folders..."
    foreach ($entry in $classified) {
        $destName = $entry.Folder
        if ($destName.StartsWith("AUTO:")) {
            $destName = $autoResolved[$destName]
        }
        if (-not $folderObjects.ContainsKey($destName)) { continue }
        try {
            Invoke-Graph -AccessToken $token -Method POST -Url "$graph/me/messages/$(Encode-Id $entry.Id)/move" -Body @{
                destinationId = $folderObjects[$destName].id
            } | Out-Null
            $moved++
        } catch {
            $failed++
        }
    }
}

$ruleCreated = 0
$ruleSkipped = 0
if (-not $SkipRules) {
    Write-Step "Saving Outlook rules for new mail..."
    try {
        $existing = @(Get-GraphPaged -AccessToken $token -Url "$graph/me/mailFolders/inbox/messageRules")
        $existingNames = New-Object 'System.Collections.Generic.HashSet[string]'
        foreach ($rule in $existing) { [void]$existingNames.Add([string]$rule.displayName) }
        $made = 0
        foreach ($row in $rows) {
            if ($made -ge $MaxRules) { break }
            $name = "$rulePrefix $($row.Folder)"
            if ($existingNames.Contains($name)) { $ruleSkipped++; continue }
            if (-not $folderObjects.ContainsKey($row.Folder)) { continue }
            $needles = @($row.Domains | Select-Object -First 8)
            if ($needles.Count -lt 1) { continue }
            try {
                Invoke-Graph -AccessToken $token -Method POST -Url "$graph/me/mailFolders/inbox/messageRules" -Body @{
                    displayName = $name
                    sequence    = (1 + $made)
                    isEnabled   = $true
                    conditions  = @{ senderContains = @($needles) }
                    actions     = @{
                        moveToFolder        = $folderObjects[$row.Folder].id
                        stopProcessingRules = $true
                    }
                } | Out-Null
                $ruleCreated++
                $made++
            } catch {
                $ruleSkipped++
            }
        }
    } catch {
        Write-Host "  Rules could not be saved automatically."
        Write-Host ("  " + $_.Exception.Message)
        Write-Host "  Folders and moved mail are still OK."
    }
}

Write-Host ""
Write-Host "Done."
Write-Host ("  Signed in:     {0}" -f $upn)
Write-Host ("  Folders ready: {0}" -f $folderObjects.Count)
Write-Host ("  Emails moved:  {0}" -f $moved)
if ($failed -gt 0) { Write-Host ("  Move failures: {0}" -f $failed) }
Write-Host ("  Rules added:   {0}  (already existed / skipped: {1})" -f $ruleCreated, $ruleSkipped)
Write-Host ""
Write-Host "Open https://outlook.live.com/mail/ and look LEFT."
Write-Host "Inbox → Companies → GitHub, Cursor, Apple, Google, Brakes, ..."
Write-Host "Refresh the page if the new folders are not listed yet."
Write-Host "Friends stay in Inbox."
Write-Host ""
