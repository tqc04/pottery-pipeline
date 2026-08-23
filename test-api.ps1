# Pottery Pipeline - API Test Script
$base = "http://localhost:3000"
$passed = 0
$failed = 0
$results = @()

function Test-Endpoint {
    param($Name, $Method, $Url, $Body = $null, $Headers = @{}, $ExpectStatus = 200)
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
        }
        if ($Body) {
            $params.ContentType = "application/json"
            $params.Body = ($Body | ConvertTo-Json -Depth 5)
        }
        $resp = Invoke-WebRequest @params
        $status = $resp.StatusCode
        $content = $resp.Content | ConvertFrom-Json
        if ($status -eq $ExpectStatus) {
            $script:passed++
            $script:results += [PSCustomObject]@{ Test = $Name; Status = "PASS"; Code = $status }
            return $content
        } else {
            $script:failed++
            $script:results += [PSCustomObject]@{ Test = $Name; Status = "FAIL"; Code = $status }
            return $null
        }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -eq $ExpectStatus) {
            $script:passed++
            $script:results += [PSCustomObject]@{ Test = $Name; Status = "PASS"; Code = $code }
            return $null
        }
        $script:failed++
        $script:results += [PSCustomObject]@{ Test = $Name; Status = "FAIL"; Code = "$code - $($_.Exception.Message)" }
        return $null
    }
}

Write-Host "`n=== POTTERY PIPELINE API TESTS ===`n" -ForegroundColor Cyan

# 1. Dashboard stats
$stats = Test-Endpoint "GET /api/dashboard/stats" GET "$base/api/dashboard/stats"
Write-Host "Stats: active=$($stats.activeOrders), delayed=$($stats.delayedOrders)"

# 2. Kanban
$kanban = Test-Endpoint "GET /api/kanban" GET "$base/api/kanban"
$totalCards = ($kanban | ForEach-Object { $_.tasks.Count } | Measure-Object -Sum).Sum
Write-Host "Kanban: $($kanban.Count) columns, $totalCards active cards"

# 3. Alerts
$alerts = Test-Endpoint "GET /api/alerts" GET "$base/api/alerts"
Write-Host "Alerts: $($alerts.Count) active"

# 4. List orders
$orders = Test-Endpoint "GET /api/orders" GET "$base/api/orders"
Write-Host "Orders: $($orders.Count) total"

# 5. AI parse preview
$parsed = Test-Endpoint "POST /api/orders/parse-preview" POST "$base/api/orders/parse-preview" @{
    rawText = "100 dia gom men xanh, giao gap 5 ngay"
}
Write-Host "AI Parse: product=$($parsed.product_type), qty=$($parsed.quantity), priority=$($parsed.priority)"

# 6. Create order
$newOrder = Test-Endpoint "POST /api/orders" POST "$base/api/orders" @{
    rawText = "100 dia gom men xanh, giao gap 5 ngay"
} -ExpectStatus 201
Write-Host "New Order: $($newOrder.orderCode) id=$($newOrder.id)"

# 7. Get order detail
if ($newOrder) {
    $detail = Test-Endpoint "GET /api/orders/[id]" GET "$base/api/orders/$($newOrder.id)"
    Write-Host "Order Detail: $($detail.orderCode), stage=$($detail.currentStage.name), tasks=$($detail.tasks.Count)"
}

# 8. Advance stage
if ($newOrder) {
    $advanced = Test-Endpoint "POST /api/orders/[id]/advance" POST "$base/api/orders/$($newOrder.id)/advance"
    Write-Host "Advance: now at stage $($advanced.currentStage.name)"
}

# 9. Cron SLA check
$cron = Test-Endpoint "POST /api/cron/check-sla" POST "$base/api/cron/check-sla" $null @{
    Authorization = "Bearer dev-secret-123"
}
Write-Host "Cron SLA: delayed=$($cron.results.delayed), deadlineSoon=$($cron.results.deadlineSoon)"

# 10. Resolve alert (if any)
$alertsAfter = Test-Endpoint "GET /api/alerts (after)" GET "$base/api/alerts"
if ($alertsAfter -and $alertsAfter.Count -gt 0) {
    $resolved = Test-Endpoint "PATCH /api/alerts/[id]/resolve" PATCH "$base/api/alerts/$($alertsAfter[0].id)/resolve"
    Write-Host "Resolved alert id=$($alertsAfter[0].id)"
}

# 11. Unauthorized cron
Test-Endpoint "POST /api/cron (unauthorized)" POST "$base/api/cron/check-sla" $null @{} -ExpectStatus 401 | Out-Null

# Summary
Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize
Write-Host "PASSED: $passed | FAILED: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
