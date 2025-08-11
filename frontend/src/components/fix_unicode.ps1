# PowerShell script to fix Unicode encoding issues
$content = Get-Content "DocumentManagement.jsx" -Raw -Encoding UTF8

# Fix corrupted Unicode characters
$content = $content -replace "ðŸ"„", "📄"
$content = $content -replace "ðŸ'¡", "💡" 
$content = $content -replace "ðŸ"‹", "📋"
$content = $content -replace "ï¿½", "📝"
$content = $content -replace "ðŸ¢", "🏢"
$content = $content -replace "ðŸ"…", "📅"
$content = $content -replace "ðŸ'°", "💰"
$content = $content -replace "â‚¹", "₹"
$content = $content -replace "ðŸŽ"", "🎓"
$content = $content -replace "ðŸ"¦", "📦"
$content = $content -replace "ðŸ—'ï¸", "🗑️"
$content = $content -replace "ï¿½ï¸", "🗑️"

# Write back with proper UTF8 encoding
[System.IO.File]::WriteAllText("DocumentManagement.jsx", $content, [System.Text.Encoding]::UTF8)

Write-Host "Unicode characters fixed!"
