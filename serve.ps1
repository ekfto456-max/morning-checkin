$root = "C:\Users\ekfto\OneDrive\바탕 화면\morning-checkin"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:3000/")
$listener.Start()
Write-Host "Server started on port 3000"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = $ctx.Request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }
    $file = Join-Path $root $path.Substring(1)

    try {
        if (Test-Path $file) {
            $bytes = [IO.File]::ReadAllBytes($file)
            $ctx.Response.StatusCode = 200
            $ctx.Response.ContentType = "text/html; charset=utf-8"
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $ctx.Response.StatusCode = 404
        }
    } catch {
        $ctx.Response.StatusCode = 500
    }
    $ctx.Response.Close()
}
